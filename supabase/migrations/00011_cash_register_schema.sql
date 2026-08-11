-- 00011_cash_register_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.cash_register_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashier_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    starting_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
    expected_cash NUMERIC(10,2),
    actual_cash NUMERIC(10,2),
    variance NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure a cashier can only have one active shift at a time
CREATE UNIQUE INDEX idx_active_shift ON public.cash_register_shifts (cashier_id) WHERE closed_at IS NULL;

-- Add shift_id to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.cash_register_shifts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.cash_register_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users on shifts" ON public.cash_register_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow cashiers to open their own shifts" ON public.cash_register_shifts FOR INSERT TO authenticated WITH CHECK (auth.uid() = cashier_id);
CREATE POLICY "Allow cashiers to close their own shifts" ON public.cash_register_shifts FOR UPDATE TO authenticated USING (auth.uid() = cashier_id);

COMMIT;
