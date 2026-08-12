-- 00023_z_reports_expenses.sql
BEGIN;

DROP VIEW IF EXISTS public.z_reports_view;

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
    ), 0) AS total_card_received,
    
    -- Subquery for expenses (Cash Outgoing)
    COALESCE((
        SELECT SUM(e.amount)
        FROM public.expenses e
        WHERE e.recorded_by = s.cashier_id 
          AND e.created_at >= s.opened_at 
          AND (s.closed_at IS NULL OR e.created_at <= s.closed_at)
    ), 0) AS total_expenses,
    
    -- Original columns
    s.expected_cash,
    s.actual_cash,
    s.variance,
    s.notes

FROM 
    public.cash_register_shifts s
LEFT JOIN 
    public.orders o ON o.shift_id = s.id AND o.status = 'PAID'
GROUP BY 
    s.id, s.cashier_id, s.opened_at, s.closed_at, s.starting_cash, s.expected_cash, s.actual_cash, s.variance, s.notes;

GRANT SELECT ON public.z_reports_view TO authenticated;

COMMIT;
