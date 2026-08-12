-- 00026_ledger_views.sql
BEGIN;

DROP VIEW IF EXISTS public.z_reports_view;

CREATE OR REPLACE VIEW public.z_reports_view AS
SELECT 
    s.id AS shift_id,
    s.cashier_id,
    s.opened_at,
    s.closed_at,
    s.starting_cash,
    s.expected_cash,
    s.actual_cash,
    s.variance,
    s.notes,
    
    -- Sales (Revenue Credit)
    COALESCE((
        SELECT SUM(al.credit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type = 'SALE'
    ), 0) AS total_sales,
    
    -- Cash Received from Customers (Debit)
    COALESCE((
        SELECT SUM(al.debit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type = 'PAYMENT' AND al.payment_method = 'CASH'
    ), 0) AS total_cash_received,
    
    -- Change Given to Customers (Credit)
    COALESCE((
        SELECT SUM(al.credit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type = 'CHANGE' AND al.payment_method = 'CASH'
    ), 0) AS total_change_given,

    -- Card Payments
    COALESCE((
        SELECT SUM(al.debit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type = 'PAYMENT' AND al.payment_method = 'CARD'
    ), 0) AS total_card_received,
    
    -- Manual Cash IN (Float addition, etc)
    COALESCE((
        SELECT SUM(al.debit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type = 'CASH_IN' AND al.payment_method = 'CASH'
    ), 0) AS manual_cash_in,
    
    -- Manual Cash OUT (Petty cash, expenses)
    COALESCE((
        SELECT SUM(al.credit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type IN ('CASH_OUT', 'EXPENSE') AND al.payment_method = 'CASH'
    ), 0) AS manual_cash_out,
    
    -- Total Expenses (Calculated for legacy UI support)
    COALESCE((
        SELECT SUM(al.credit) FROM public.accounting_ledger al 
        WHERE al.shift_id = s.id AND al.transaction_type IN ('CASH_OUT', 'EXPENSE') AND al.payment_method = 'CASH'
    ), 0) AS total_expenses,
    
    (SELECT COUNT(*) FROM public.orders o WHERE o.shift_id = s.id) AS total_orders

FROM 
    public.cash_register_shifts s;

GRANT SELECT ON public.z_reports_view TO authenticated;

COMMIT;
