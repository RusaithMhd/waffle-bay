BEGIN;

CREATE TABLE IF NOT EXISTS public.store_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row exists
  store_name TEXT NOT NULL DEFAULT 'Waffle Bay',
  store_address TEXT DEFAULT '',
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  receipt_header TEXT DEFAULT 'Welcome to Waffle Bay!',
  receipt_footer TEXT DEFAULT 'Thank you for your business!',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row if it doesn't exist
INSERT INTO public.store_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL on store_settings for authenticated users" 
ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
