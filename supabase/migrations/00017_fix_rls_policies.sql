BEGIN;

-- Drop existing SELECT-only policies (if any) to avoid confusion, though it's not strictly necessary if we just add ALL policies.
-- Products
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can read modifier groups" ON public.modifier_groups;
DROP POLICY IF EXISTS "Authenticated users can read modifiers" ON public.modifiers;
DROP POLICY IF EXISTS "Authenticated users can read product modifiers" ON public.product_modifiers;

-- Inventory
DROP POLICY IF EXISTS "Allow read access to authenticated users on ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow read access to authenticated users on recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow read access to authenticated users on modifier_recipes" ON public.modifier_recipes;

-- Create ALL policies for authenticated users
-- Products
CREATE POLICY "Allow ALL on categories for authenticated users" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on products for authenticated users" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on modifier_groups for authenticated users" ON public.modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on modifiers for authenticated users" ON public.modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on product_modifiers for authenticated users" ON public.product_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory
CREATE POLICY "Allow ALL on ingredients for authenticated users" ON public.ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on recipes for authenticated users" ON public.recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow ALL on modifier_recipes for authenticated users" ON public.modifier_recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
