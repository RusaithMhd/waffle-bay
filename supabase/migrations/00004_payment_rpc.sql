-- PostgreSQL function for atomic order checkout
CREATE OR REPLACE FUNCTION public.checkout_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id UUID;
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

  -- 2. Insert Order
  v_cashier_id := auth.uid();
  v_subtotal := (payload->>'subtotal')::NUMERIC;
  v_tax := (payload->>'tax')::NUMERIC;
  v_discount := (payload->>'discount')::NUMERIC;

  INSERT INTO public.orders (cashier_id, status, subtotal, tax, discount, total)
  VALUES (v_cashier_id, 'PAID', v_subtotal, v_tax, v_discount, v_total)
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 3. Insert Items and Modifiers
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name_snapshot',
      (v_item->>'unit_price_snapshot')::NUMERIC,
      (v_item->>'quantity')::INT,
      (v_item->>'subtotal')::NUMERIC
    )
    RETURNING id INTO v_order_item_id;

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
      END LOOP;
    END IF;
  END LOOP;

  -- 4. Insert Payments
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

  -- 5. Return success with order details
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
