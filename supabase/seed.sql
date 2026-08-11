-- supabase/seed.sql
-- Seed script for Waffle Bay POS QA

-- Note: We assume that the user running the QA will sign up through the UI or use an existing test user, 
-- but we can't easily seed auth.users in Supabase without using the API due to identity constraints. 
-- However, we can seed public tables!

BEGIN;

-- 1. Create Categories
INSERT INTO public.categories (id, name, sort_order) VALUES 
('11111111-1111-1111-1111-111111111111', 'Classic Waffles', 1),
('22222222-2222-2222-2222-222222222222', 'Premium Waffles', 2),
('33333333-3333-3333-3333-333333333333', 'Beverages', 3)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Ingredients
INSERT INTO public.ingredients (id, name, unit, current_stock, minimum_stock) VALUES
('aaaa1111-1111-1111-1111-111111111111', 'Waffle Batter', 'kg', 50, 10),
('bbbb2222-2222-2222-2222-222222222222', 'Nutella', 'g', 10000, 2000),
('cccc3333-3333-3333-3333-333333333333', 'Strawberries', 'g', 5000, 1000),
('dddd4444-4444-4444-4444-444444444444', 'Coffee Beans', 'g', 2000, 500)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Products
INSERT INTO public.products (id, category_id, name, description, price, is_available) VALUES
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Classic Belgian Waffle', 'Simple and delicious.', 5.00, true),
('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Nutella Strawberry Waffle', 'Loaded with toppings.', 8.50, true),
('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Latte', 'Freshly brewed espresso with steamed milk.', 4.00, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Product Recipes (Inventory mapping)
INSERT INTO public.recipes (product_id, ingredient_id, quantity_required) VALUES
('55555555-5555-5555-5555-555555555555', 'aaaa1111-1111-1111-1111-111111111111', 0.2), -- 200g batter
('66666666-6666-6666-6666-666666666666', 'aaaa1111-1111-1111-1111-111111111111', 0.2), -- 200g batter
('66666666-6666-6666-6666-666666666666', 'bbbb2222-2222-2222-2222-222222222222', 50), -- 50g Nutella
('66666666-6666-6666-6666-666666666666', 'cccc3333-3333-3333-3333-333333333333', 100), -- 100g Strawberries
('77777777-7777-7777-7777-777777777777', 'dddd4444-4444-4444-4444-444444444444', 18) -- 18g coffee beans
ON CONFLICT DO NOTHING;

-- 5. Create Modifier Groups
INSERT INTO public.modifier_groups (id, name, is_required, min_selections, max_selections) VALUES
('88888888-8888-8888-8888-888888888888', 'Extra Toppings', false, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- Map Modifier Group to Product (Classic Belgian Waffle)
INSERT INTO public.product_modifier_groups (product_id, modifier_group_id, sort_order) VALUES
('55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 1)
ON CONFLICT DO NOTHING;

-- 6. Create Modifiers
INSERT INTO public.modifiers (id, group_id, name, price, is_available) VALUES
('99999999-9999-9999-9999-999999999999', '88888888-8888-8888-8888-888888888888', 'Extra Nutella', 1.50, true),
('00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', 'Extra Strawberries', 1.50, true)
ON CONFLICT (id) DO NOTHING;

-- 7. Create Modifier Recipes
INSERT INTO public.modifier_recipes (modifier_id, ingredient_id, quantity_required) VALUES
('99999999-9999-9999-9999-999999999999', 'bbbb2222-2222-2222-2222-222222222222', 25), -- 25g Nutella
('00000000-0000-0000-0000-000000000000', 'cccc3333-3333-3333-3333-333333333333', 50) -- 50g Strawberries
ON CONFLICT DO NOTHING;

COMMIT;
