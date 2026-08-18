BEGIN;

-- 1. Create kitchen_orders table
CREATE TABLE IF NOT EXISTS public.kitchen_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kot_number INT NOT NULL, -- Daily counter from order
  batch_number INT NOT NULL, -- 1, 2, 3...
  status TEXT NOT NULL CHECK (status IN ('NEW', 'PREPARING', 'READY', 'COMPLETED')) DEFAULT 'NEW',
  created_by UUID REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(order_id, batch_number)
);

-- 2. Create kitchen_order_items table
CREATE TABLE IF NOT EXISTS public.kitchen_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_order_id UUID NOT NULL REFERENCES public.kitchen_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'DONE')) DEFAULT 'PENDING',
  notes TEXT,
  UNIQUE(kitchen_order_id, order_item_id)
);

-- RLS
ALTER TABLE public.kitchen_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow ALL on kitchen_orders for authenticated users"
ON public.kitchen_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow ALL on kitchen_order_items for authenticated users"
ON public.kitchen_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_order_items;

-- 3. Rewrite create_unpaid_order RPC to support kitchen_orders
CREATE OR REPLACE FUNCTION public.create_unpaid_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id UUID;
  v_shift_id UUID;
  v_order_id UUID;
  v_order_number INT;
  
  v_subtotal NUMERIC(10,2);
  v_tax NUMERIC(10,2);
  v_discount NUMERIC(10,2);
  v_total NUMERIC(10,2);

  v_item JSONB;
  v_mod JSONB;
  
  v_order_item_id UUID;
  v_kitchen_order_id UUID;

  -- KOT / Business day variables
  v_timezone TEXT;
  v_business_date DATE;
  v_kot_number INT;
BEGIN
  -- Lookup Active Shift for Cashier
  v_cashier_id := auth.uid();
  
  SELECT id INTO v_shift_id
  FROM public.cash_register_shifts
  WHERE cashier_id = v_cashier_id AND closed_at IS NULL
  LIMIT 1;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'No active shift found. Please open a shift first.';
  END IF;

  -- Calculate business date and assign KOT number
  SELECT timezone INTO v_timezone FROM public.store_settings WHERE id = 1;
  IF v_timezone IS NULL OR v_timezone = '' THEN
    v_timezone := 'Asia/Colombo';
  END IF;

  v_business_date := public.get_business_date(v_timezone);

  -- Atomic increment for KOT number
  INSERT INTO public.kot_counters (business_date, last_value)
  VALUES (v_business_date, 1)
  ON CONFLICT (business_date)
  DO UPDATE SET last_value = public.kot_counters.last_value + 1
  RETURNING last_value INTO v_kot_number;

  -- Insert Order in 'PENDING' status (meaning unpaid)
  v_subtotal := (payload->>'subtotal')::NUMERIC;
  v_tax := (payload->>'tax')::NUMERIC;
  v_discount := (payload->>'discount')::NUMERIC;
  v_total := (payload->>'total')::NUMERIC;

  INSERT INTO public.orders (
    cashier_id, shift_id, status, subtotal, tax, discount, total, 
    fulfillment_status, order_type, discount_type, discount_value, kot_number, business_date
  ) VALUES (
    v_cashier_id, 
    v_shift_id, 
    'PENDING', 
    v_subtotal, 
    v_tax, 
    v_discount, 
    v_total, 
    'NEW', 
    payload->>'order_type', 
    payload->>'discount_type', 
    (payload->>'discount_value')::NUMERIC,
    v_kot_number,
    v_business_date
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Insert KOT Batch #1
  INSERT INTO public.kitchen_orders (
    order_id, kot_number, batch_number, status, created_by, sent_at
  ) VALUES (
    v_order_id,
    v_kot_number,
    1,
    'NEW',
    v_cashier_id,
    NOW()
  )
  RETURNING id INTO v_kitchen_order_id;

  -- Insert Items, Modifiers, and deduct inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, fulfillment_status, notes
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name_snapshot',
      (v_item->>'unit_price_snapshot')::NUMERIC,
      (v_item->>'quantity')::INT,
      (v_item->>'subtotal')::NUMERIC,
      'PENDING',
      v_item->>'notes'
    )
    RETURNING id INTO v_order_item_id;

    -- Insert KOT Item
    INSERT INTO public.kitchen_order_items (
      kitchen_order_id, order_item_id, quantity, status, notes
    ) VALUES (
      v_kitchen_order_id,
      v_order_item_id,
      (v_item->>'quantity')::INT,
      'PENDING',
      v_item->>'notes'
    );

    -- INVENTORY DEDUCTION
    INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
    SELECT r.ingredient_id, 'SALE', -1 * r.quantity_required * (v_item->>'quantity')::INT, v_order_id, 'Sold: ' || (v_item->>'product_name_snapshot')
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID;
    
    UPDATE public.ingredients i
    SET current_stock = i.current_stock - (r.quantity_required * (v_item->>'quantity')::INT),
        updated_at = NOW()
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID AND i.id = r.ingredient_id;

    IF v_item ? 'modifiers' THEN
      FOR v_mod IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        INSERT INTO public.order_item_modifiers (
          order_item_id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
        ) VALUES (
          v_order_item_id,
          (v_mod->>'modifier_id')::UUID,
          v_mod->>'modifier_name_snapshot',
          (v_mod->>'modifier_price_snapshot')::NUMERIC,
          (v_mod->>'quantity')::INT
        );

        INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
        SELECT mr.ingredient_id, 'SALE', -1 * mr.quantity_required * (v_mod->>'quantity')::INT, v_order_id, 'Sold Mod: ' || (v_mod->>'modifier_name_snapshot')
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID;
        
        UPDATE public.ingredients i
        SET current_stock = i.current_stock - (mr.quantity_required * (v_mod->>'quantity')::INT),
            updated_at = NOW()
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID AND i.id = mr.ingredient_id;
      END LOOP;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'kot_number', v_kot_number
  )::JSONB;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Create unpaid order failed: %', SQLERRM;
END;
$$;


-- 4. Rewrite add_items_to_order RPC to support kitchen_orders batches
CREATE OR REPLACE FUNCTION public.add_items_to_order(
  p_order_id UUID,
  p_new_items JSONB,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_discount NUMERIC,
  p_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
  v_mod JSONB;
  v_order_item_id UUID;
  v_order_number INT;
  v_shift_id UUID;
  v_kot_number INT;
  v_cashier_id UUID;
  
  v_kitchen_order_id UUID;
  v_batch_number INT;
BEGIN
  -- 1. Validate order exists and is unpaid (PENDING)
  SELECT order_number, shift_id, kot_number INTO v_order_number, v_shift_id, v_kot_number
  FROM public.orders
  WHERE id = p_order_id AND status = 'PENDING';

  IF v_order_number IS NULL THEN
    RAISE EXCEPTION 'Order not found or already paid';
  END IF;

  v_cashier_id := auth.uid();

  -- Calculate next batch number for this order
  SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch_number
  FROM public.kitchen_orders
  WHERE order_id = p_order_id;

  -- Insert new KOT Batch row
  INSERT INTO public.kitchen_orders (
    order_id, kot_number, batch_number, status, created_by, sent_at
  ) VALUES (
    p_order_id,
    v_kot_number,
    v_batch_number,
    'NEW',
    v_cashier_id,
    NOW()
  )
  RETURNING id INTO v_kitchen_order_id;

  -- 2. Insert new items and modifiers, and deduct inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_new_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, fulfillment_status, notes
    ) VALUES (
      p_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name_snapshot',
      (v_item->>'unit_price_snapshot')::NUMERIC,
      (v_item->>'quantity')::INT,
      (v_item->>'subtotal')::NUMERIC,
      'PENDING',
      v_item->>'notes'
    )
    RETURNING id INTO v_order_item_id;

    -- Insert KOT Item
    INSERT INTO public.kitchen_order_items (
      kitchen_order_id, order_item_id, quantity, status, notes
    ) VALUES (
      v_kitchen_order_id,
      v_order_item_id,
      (v_item->>'quantity')::INT,
      'PENDING',
      v_item->>'notes'
    );

    -- INVENTORY DEDUCTION for new items
    INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
    SELECT r.ingredient_id, 'SALE', -1 * r.quantity_required * (v_item->>'quantity')::INT, p_order_id, 'Added: ' || (v_item->>'product_name_snapshot')
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID;
    
    UPDATE public.ingredients i
    SET current_stock = i.current_stock - (r.quantity_required * (v_item->>'quantity')::INT),
        updated_at = NOW()
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID AND i.id = r.ingredient_id;

    -- Handle modifiers for new items
    IF v_item ? 'modifiers' THEN
      FOR v_mod IN SELECT * FROM jsonb_array_elements(v_item->'modifiers')
      LOOP
        INSERT INTO public.order_item_modifiers (
          order_item_id, modifier_id, modifier_name_snapshot, modifier_price_snapshot, quantity
        ) VALUES (
          v_order_item_id,
          (v_mod->>'modifier_id')::UUID,
          v_mod->>'modifier_name_snapshot',
          (v_mod->>'modifier_price_snapshot')::NUMERIC,
          (v_mod->>'quantity')::INT
        );

        INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
        SELECT mr.ingredient_id, 'SALE', -1 * mr.quantity_required * (v_mod->>'quantity')::INT, p_order_id, 'Added Mod: ' || (v_mod->>'modifier_name_snapshot')
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID;
        
        UPDATE public.ingredients i
        SET current_stock = i.current_stock - (mr.quantity_required * (v_mod->>'quantity')::INT),
            updated_at = NOW()
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID AND i.id = mr.ingredient_id;
      END LOOP;
    END IF;
  END LOOP;

  -- 3. Update the order totals and reset fulfillment_status to 'NEW'
  UPDATE public.orders
  SET subtotal = p_subtotal,
      tax = p_tax,
      discount = p_discount,
      total = p_total,
      fulfillment_status = 'NEW',
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', p_order_id,
    'order_number', v_order_number
  );
END;
$$;

COMMIT;
