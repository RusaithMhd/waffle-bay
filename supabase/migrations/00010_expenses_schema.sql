-- 00010_expenses_schema.sql

BEGIN;

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'UTILITIES', 'MAINTENANCE', 'PETTY_CASH', 'CLEANING'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    receipt_url TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on expense_categories" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all access to authenticated users on expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default categories
INSERT INTO public.expense_categories (name, description) VALUES
('UTILITIES', 'Electricity, water, gas, internet'),
('MAINTENANCE', 'Repairs and equipment maintenance'),
('PETTY_CASH', 'Small ad-hoc purchases'),
('CLEANING', 'Cleaning supplies and services'),
('RENT', 'Store lease payments'),
('MARKETING', 'Advertising and promotions')
ON CONFLICT (name) DO NOTHING;

COMMIT;
