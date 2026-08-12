-- 00029_add_item_notes.sql
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes TEXT;
