-- 00024_accounting_ledger.sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.accounting_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'SALE', 
        'REFUND', 
        'CASH_IN', 
        'CASH_OUT', 
        'EXPENSE', 
        'BANK_DEPOSIT', 
        'OPENING_BALANCE', 
        'ADJUSTMENT',
        'CHANGE',
        'PAYMENT'
    )),
    reference_id UUID, -- Link to order, shift, expense
    description TEXT NOT NULL,
    debit NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- Money IN
    credit NUMERIC(10,2) NOT NULL DEFAULT 0.00, -- Money OUT
    payment_method TEXT CHECK (payment_method IN ('CASH', 'CARD', 'QR', 'BANK_TRANSFER', 'OTHER', 'NONE')),
    cashier_id UUID REFERENCES auth.users(id),
    shift_id UUID REFERENCES public.cash_register_shifts(id)
);

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS amount_tendered NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS change_given NUMERIC(10,2) DEFAULT 0.00;

-- RLS
ALTER TABLE public.accounting_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on ledger" 
ON public.accounting_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access to authenticated users on ledger" 
ON public.accounting_ledger FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;
