-- 00012_checkout_shift_rpc.sql

-- PostgreSQL function for atomic order checkout with SHIFT TRACKING and INVENTORY DEDUCTION
CREATE OR REPLACE FUNCTION public.checkout_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id UUID;
  v_shift_id UUID;
  v_order_id UUID;
  v_order_number INT;
  
  -- Totals
  v_subtotal NUMERIC(10,2);
  v_tax NUMERIC(10,2);
  v_discount NUMERIC(10,2);
  v_total NUMERIC(10,2);
  v_payment_total NUMERIC(10,2) := 0;

  v_item JSONB;
  v_mod JSONB;
  v_payment JSONB;
  
  v_order_item_id UUID;
BEGIN
  -- 1. Validate Payments sum to total
  v_total := (payload->>'total')::NUMERIC;
  
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    v_payment_total := v_payment_total + (v_payment->>'amount')::NUMERIC;
  END LOOP;

  IF v_payment_total < v_total THEN
    RAISE EXCEPTION 'Total payments (%) do not cover the order total (%)', v_payment_total, v_total;
  END IF;

  -- 2. Lookup Active Shift for Cashier
  v_cashier_id := auth.uid();
  
  SELECT id INTO v_shift_id
  FROM public.cash_register_shifts
  WHERE cashier_id = v_cashier_id AND closed_at IS NULL
  LIMIT 1;

  -- (Optional strict mode: RAISE EXCEPTION 'No open shift' IF v_shift_id IS NULL)
  -- For MVP we will allow null shift_id if they haven't opened a shift yet, or you can uncomment below to enforce:
  -- IF v_shift_id IS NULL THEN
  --   RAISE EXCEPTION 'You must open a cash register shift before processing orders.';
  -- END IF;

  -- 3. Insert Order
  v_subtotal := (payload->>'subtotal')::NUMERIC;
  v_tax := (payload->>'tax')::NUMERIC;
  v_discount := (payload->>'discount')::NUMERIC;

  INSERT INTO public.orders (cashier_id, shift_id, status, subtotal, tax, discount, total, fulfillment_status)
  VALUES (v_cashier_id, v_shift_id, 'PAID', v_subtotal, v_tax, v_discount, v_total, 'NEW')
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 4. Insert Items and Modifiers, and deduct inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal, fulfillment_status
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name_snapshot',
      (v_item->>'unit_price_snapshot')::NUMERIC,
      (v_item->>'quantity')::INT,
      (v_item->>'subtotal')::NUMERIC,
      'PENDING'
    )
    RETURNING id INTO v_order_item_id;

    -- INVENTORY DEDUCTION for Product
    -- 1. Log transactions
    INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
    SELECT r.ingredient_id, 'SALE', -1 * r.quantity_required * (v_item->>'quantity')::INT, v_order_id, 'Sold: ' || (v_item->>'product_name_snapshot')
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID;
    
    -- 2. Update stock
    UPDATE public.ingredients i
    SET current_stock = i.current_stock - (r.quantity_required * (v_item->>'quantity')::INT),
        updated_at = NOW()
    FROM public.recipes r
    WHERE r.product_id = (v_item->>'product_id')::UUID AND i.id = r.ingredient_id;

    -- Insert Modifiers for this item
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

        -- INVENTORY DEDUCTION for Modifier
        -- 1. Log transactions
        INSERT INTO public.inventory_transactions (ingredient_id, transaction_type, quantity_changed, reference_id, notes)
        SELECT mr.ingredient_id, 'SALE', -1 * mr.quantity_required * (v_mod->>'quantity')::INT, v_order_id, 'Sold Mod: ' || (v_mod->>'modifier_name_snapshot')
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID;
        
        -- 2. Update stock
        UPDATE public.ingredients i
        SET current_stock = i.current_stock - (mr.quantity_required * (v_mod->>'quantity')::INT),
            updated_at = NOW()
        FROM public.modifier_recipes mr
        WHERE mr.modifier_id = (v_mod->>'modifier_id')::UUID AND i.id = mr.ingredient_id;
      END LOOP;
    END IF;
  END LOOP;

  -- 5. Insert Payments
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    INSERT INTO public.payments (
      order_id, method, amount, status
    ) VALUES (
      v_order_id,
      v_payment->>'method',
      (v_payment->>'amount')::NUMERIC,
      'SUCCESS'
    );
  END LOOP;

  -- 6. Return success with order details
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  )::JSONB;
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback is automatic when an exception is raised in plpgsql
  RAISE EXCEPTION 'Checkout failed: %', SQLERRM;
END;
$$;
