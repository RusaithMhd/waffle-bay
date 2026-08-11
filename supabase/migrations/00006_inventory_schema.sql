-- 00006_inventory_schema.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL, -- e.g., 'grams', 'ml', 'pieces'
    current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
    reorder_level NUMERIC(10,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipes linking a product to its base ingredients
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipes linking a modifier to its base ingredients
CREATE TABLE IF NOT EXISTS public.modifier_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_id UUID REFERENCES public.modifiers(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for all stock changes
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT')),
    quantity_changed NUMERIC(10,3) NOT NULL, -- positive for PURCHASE/ADJUSTMENT, negative for SALE/WASTE
    reference_id UUID, -- e.g., order_id or purchase_order_id
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users on ingredients" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on recipes" ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on modifier_recipes" ON public.modifier_recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access to authenticated users on inventory_transactions" ON public.inventory_transactions FOR SELECT TO authenticated USING (true);

COMMIT;
