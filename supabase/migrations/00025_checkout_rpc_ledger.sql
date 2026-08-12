-- 00025_checkout_rpc_ledger.sql

CREATE OR REPLACE FUNCTION public.checkout_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cashier_id UUID;
  v_cashier_name TEXT;
  v_receipt_id TEXT;
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
  
  -- Payment fields
  v_tendered NUMERIC(10,2);
  v_change NUMERIC(10,2);
  v_pmethod TEXT;
  v_pamount NUMERIC(10,2);
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

  -- 3. Insert Order
  v_subtotal := (payload->>'subtotal')::NUMERIC;
  v_tax := (payload->>'tax')::NUMERIC;
  v_discount := (payload->>'discount')::NUMERIC;

  INSERT INTO public.orders (cashier_id, shift_id, status, subtotal, tax, discount, total, fulfillment_status)
  VALUES (v_cashier_id, v_shift_id, 'PAID', v_subtotal, v_tax, v_discount, v_total, 'NEW')
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 4. Insert Items, Modifiers, and deduct inventory
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

  -- 5. Ledger: Record the Sale Revenue (Credit)
  INSERT INTO public.accounting_ledger (
      transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
  ) VALUES (
      'SALE', v_order_id, 'Order #' || v_order_number || ' Revenue', 0.00, v_total, 'NONE', v_cashier_id, v_shift_id
  );

  -- 6. Insert Payments & Ledger Entries
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    v_pmethod := v_payment->>'method';
    v_pamount := (v_payment->>'amount')::NUMERIC;
    v_tendered := COALESCE((v_payment->>'amount_tendered')::NUMERIC, v_pamount);
    v_change := COALESCE((v_payment->>'change_given')::NUMERIC, 0.00);

    -- Ensure change is mathematically correct for cash
    IF v_pmethod = 'CASH' AND (v_tendered - v_pamount) != v_change THEN
       -- Fix discrepancy gracefully or trust frontend? Let's trust frontend or recalculate:
       v_change := v_tendered - v_pamount;
    END IF;

    -- Insert into payments
    INSERT INTO public.payments (
      order_id, method, amount, status, amount_tendered, change_given
    ) VALUES (
      v_order_id,
      v_pmethod,
      v_pamount,
      'SUCCESS',
      v_tendered,
      v_change
    );

    -- Ledger: Record Payment Received (Debit)
    INSERT INTO public.accounting_ledger (
        transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
    ) VALUES (
        'PAYMENT', v_order_id, 'Payment for Order #' || v_order_number, v_tendered, 0.00, v_pmethod, v_cashier_id, v_shift_id
    );

    -- Ledger: Record Change Given (Credit) if applicable
    IF v_change > 0 THEN
      INSERT INTO public.accounting_ledger (
          transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
      ) VALUES (
          'CHANGE', v_order_id, 'Change for Order #' || v_order_number, 0.00, v_change, v_pmethod, v_cashier_id, v_shift_id
      );
    END IF;

  END LOOP;

  -- 7. Generate Receipt ID
  SELECT first_name INTO v_cashier_name FROM public.profiles WHERE id = v_cashier_id;
  IF v_cashier_name IS NULL OR v_cashier_name = '' THEN
    v_cashier_name := 'POS';
  END IF;

  v_receipt_id := UPPER(SUBSTRING(v_cashier_name FROM 1 FOR 3)) || '-' || LPAD(v_order_number::text, 6, '0');

  -- 8. Return success with order details
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_id', v_receipt_id
  )::JSONB;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Checkout failed: %', SQLERRM;
END;
$$;
