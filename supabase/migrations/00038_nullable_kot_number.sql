BEGIN;

-- Make kot_number nullable in kitchen_orders since legacy orders may not have it
ALTER TABLE public.kitchen_orders
ALTER COLUMN kot_number DROP NOT NULL;

-- Also update add_items_to_order to handle NULL kot_number gracefully
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
  v_business_date DATE;
  v_cashier_id UUID;
  
  v_kitchen_order_id UUID;
  v_batch_number INT;
BEGIN
  -- 1. Validate order exists and is unpaid (PENDING)
  SELECT order_number, shift_id, kot_number, business_date INTO v_order_number, v_shift_id, v_kot_number, v_business_date
  FROM public.orders
  WHERE id = p_order_id AND status = 'PENDING';

  IF v_order_number IS NULL THEN
    RAISE EXCEPTION 'Order not found or already paid';
  END IF;

  v_cashier_id := auth.uid();

  -- If business_date is NULL for legacy orders, derive it now
  IF v_business_date IS NULL THEN
    DECLARE
      v_timezone TEXT;
    BEGIN
      SELECT timezone INTO v_timezone FROM public.store_settings WHERE id = 1;
      IF v_timezone IS NULL OR v_timezone = '' THEN
        v_timezone := 'Asia/Colombo';
      END IF;
      v_business_date := public.get_business_date(v_timezone);
    END;
  END IF;

  -- Calculate next batch number for this order
  SELECT COALESCE(MAX(batch_number), 0) + 1 INTO v_batch_number
  FROM public.kitchen_orders
  WHERE order_id = p_order_id;

  -- Insert new KOT Batch row (kot_number can be NULL for legacy orders)
  INSERT INTO public.kitchen_orders (
    order_id, kot_number, batch_number, status, created_by, sent_at, business_date
  ) VALUES (
    p_order_id,
    v_kot_number,   -- may be NULL for legacy orders created before this migration
    v_batch_number,
    'NEW',
    v_cashier_id,
    NOW(),
    v_business_date
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
