-- 00015_reporting_views.sql

BEGIN;

-- Z-Report View (Shift Summary)
CREATE OR REPLACE VIEW public.z_reports_view AS
SELECT 
    s.id AS shift_id,
    s.cashier_id,
    s.opened_at,
    s.closed_at,
    s.starting_cash,
    COALESCE(SUM(o.total), 0) AS total_sales,
    COALESCE(SUM(o.tax), 0) AS total_tax,
    COALESCE(SUM(o.discount), 0) AS total_discounts,
    COUNT(o.id) AS total_orders,
    
    -- Subquery for cash payments
    COALESCE((
        SELECT SUM(p.amount) 
        FROM public.payments p 
        JOIN public.orders o2 ON p.order_id = o2.id 
        WHERE o2.shift_id = s.id AND p.method = 'CASH' AND p.status = 'SUCCESS'
    ), 0) AS total_cash_received,

    -- Subquery for card payments
    COALESCE((
        SELECT SUM(p.amount) 
        FROM public.payments p 
        JOIN public.orders o2 ON p.order_id = o2.id 
        WHERE o2.shift_id = s.id AND p.method = 'CARD' AND p.status = 'SUCCESS'
    ), 0) AS total_card_received

FROM 
    public.cash_register_shifts s
LEFT JOIN 
    public.orders o ON o.shift_id = s.id AND o.status = 'PAID'
GROUP BY 
    s.id, s.cashier_id, s.opened_at, s.closed_at, s.starting_cash;


-- Profit and Loss Summary View (Monthly)
CREATE OR REPLACE VIEW public.pl_summary_view AS
SELECT 
    DATE_TRUNC('month', je.date) AS period,
    
    -- Total Revenue (Normal Balance: CREDIT)
    COALESCE(SUM(jel.credit - jel.debit) FILTER (WHERE a.type = 'REVENUE'), 0) AS total_revenue,
    
    -- Total COGS (Normal Balance: DEBIT)
    COALESCE(SUM(jel.debit - jel.credit) FILTER (WHERE a.code = '5000'), 0) AS total_cogs,
    
    -- Total Operating Expenses (Normal Balance: DEBIT)
    COALESCE(SUM(jel.debit - jel.credit) FILTER (WHERE a.type = 'EXPENSE' AND a.code != '5000'), 0) AS operating_expenses,
    
    -- Net Profit = Revenue - COGS - Expenses
    COALESCE(SUM(jel.credit - jel.debit) FILTER (WHERE a.type = 'REVENUE'), 0) -
    COALESCE(SUM(jel.debit - jel.credit) FILTER (WHERE a.type = 'EXPENSE'), 0) AS net_profit

FROM 
    public.journal_entries je
JOIN 
    public.journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN 
    public.accounts a ON jel.account_id = a.id
GROUP BY 
    DATE_TRUNC('month', je.date)
ORDER BY 
    period DESC;

-- Grant permissions to authenticated users to view the reports
GRANT SELECT ON public.z_reports_view TO authenticated;
GRANT SELECT ON public.pl_summary_view TO authenticated;

COMMIT;
