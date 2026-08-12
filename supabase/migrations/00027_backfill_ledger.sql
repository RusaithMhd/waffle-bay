-- 00027_backfill_ledger.sql
BEGIN;

-- 1. Backfill Sales Revenue
INSERT INTO public.accounting_ledger (transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id, created_at)
SELECT 'SALE', id, 'Historical Order', 0, total, 'NONE', cashier_id, shift_id, created_at
FROM public.orders WHERE status = 'PAID';

-- 2. Backfill Payments (Assuming historical payments were exact matches without change tracked)
INSERT INTO public.accounting_ledger (transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id, created_at)
SELECT 'PAYMENT', p.order_id, 'Historical Payment', p.amount, 0, p.method, o.cashier_id, o.shift_id, p.created_at
FROM public.payments p
JOIN public.orders o ON o.id = p.order_id
WHERE p.status = 'SUCCESS';

-- 3. Backfill Opening Balances from Shifts
INSERT INTO public.accounting_ledger (transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id, created_at)
SELECT 'OPENING_BALANCE', id, 'Historical Opening', starting_cash, 0, 'CASH', cashier_id, id, opened_at
FROM public.cash_register_shifts;

-- 4. Backfill Expenses
INSERT INTO public.accounting_ledger (transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id, created_at)
SELECT 'EXPENSE', e.id, 'Historical Expense', 0, e.amount, 'CASH', e.recorded_by, 
       (SELECT id FROM public.cash_register_shifts s WHERE s.cashier_id = e.recorded_by AND s.opened_at <= e.created_at AND (s.closed_at IS NULL OR s.closed_at >= e.created_at) LIMIT 1),
       e.created_at
FROM public.expenses e;

COMMIT;
