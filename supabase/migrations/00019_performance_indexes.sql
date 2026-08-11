-- Add indexes to improve query performance for common filtering and sorting operations

-- 1. Orders table: frequently queried by status (PAID) and created_at (Today's Revenue, Dashboard)
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- 2. Ingredients table: frequently queried for low stock checking
CREATE INDEX IF NOT EXISTS idx_ingredients_current_stock ON ingredients (current_stock);

-- 3. Cash Register Shifts table: frequently queried for active shifts
CREATE INDEX IF NOT EXISTS idx_cash_register_shifts_closed_at ON cash_register_shifts (closed_at);

-- 4. Products table: frequently joined and filtered by category
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);

-- 5. Order Items table: frequently queried to sum up sales by order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
