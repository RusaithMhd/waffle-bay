-- 00013_accounting_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference_id UUID, -- Link to order_id, expense_id, or po_id
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(15,2) NOT NULL DEFAULT 0,
    credit NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on journal_entry_lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);

-- Insert Default Chart of Accounts
INSERT INTO public.accounts (code, name, type, normal_balance) VALUES
('1000', 'Cash', 'ASSET', 'DEBIT'),
('1100', 'Bank', 'ASSET', 'DEBIT'),
('1200', 'Inventory Asset', 'ASSET', 'DEBIT'),
('2000', 'Accounts Payable', 'LIABILITY', 'CREDIT'),
('3000', 'Owner Equity', 'EQUITY', 'CREDIT'),
('4000', 'Sales Revenue', 'REVENUE', 'CREDIT'),
('5000', 'Cost of Goods Sold', 'EXPENSE', 'DEBIT'),
('6000', 'Operating Expenses', 'EXPENSE', 'DEBIT')
ON CONFLICT (code) DO NOTHING;

COMMIT;
