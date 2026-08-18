-- Update pay_order RPC to accept full checkout payload for late discounts and correct payment inserts
CREATE OR REPLACE FUNCTION public.pay_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_shift_id UUID;
  v_cashier_id UUID;
  v_cashier_name TEXT;
  v_receipt_id TEXT;
  
  v_existing_status TEXT;
  v_order_number INT;
  
  v_subtotal NUMERIC(10,2);
  v_tax NUMERIC(10,2);
  v_discount NUMERIC(10,2);
  v_total NUMERIC(10,2);
  v_discount_type TEXT;
  v_discount_value NUMERIC(10,2);
  
  v_payment JSONB;
  v_payment_total NUMERIC(10,2) := 0.00;
  v_tendered NUMERIC(10,2);
  v_change NUMERIC(10,2);
  
  v_pmethod TEXT;
  v_pamount NUMERIC(10,2);
BEGIN
  v_order_id := (payload->>'order_id')::UUID;

  -- Validate Order exists and is not already paid
  SELECT status, order_number, total, shift_id INTO v_existing_status, v_order_number, v_total, v_shift_id
  FROM public.orders
  WHERE id = v_order_id;

  IF v_order_number IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_existing_status = 'PAID' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  IF v_existing_status = 'VOID' THEN
    RAISE EXCEPTION 'Order has been voided/cancelled';
  END IF;

  -- If payload includes updated totals (from late discount application), update them
  IF payload ? 'total' THEN
    v_subtotal := (payload->>'subtotal')::NUMERIC;
    v_tax := (payload->>'tax')::NUMERIC;
    v_discount := (payload->>'discount')::NUMERIC;
    v_total := (payload->>'total')::NUMERIC;
    v_discount_type := payload->>'discount_type';
    v_discount_value := (payload->>'discount_value')::NUMERIC;
    
    UPDATE public.orders
    SET 
      subtotal = v_subtotal,
      tax = v_tax,
      discount = v_discount,
      total = v_total,
      discount_type = v_discount_type,
      discount_value = v_discount_value,
      updated_at = NOW()
    WHERE id = v_order_id;
  END IF;

  -- Validate Payments sum to total
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    v_payment_total := v_payment_total + (v_payment->>'amount')::NUMERIC;
  END LOOP;

  IF v_payment_total < v_total THEN
    RAISE EXCEPTION 'Total payments (%) do not cover the order total (%)', v_payment_total, v_total;
  END IF;

  v_cashier_id := auth.uid();
  
  -- Update Order status to PAID
  UPDATE public.orders
  SET status = 'PAID',
      updated_at = NOW()
  WHERE id = v_order_id;

  -- Ledger: Record the Sale Revenue (Credit)
  INSERT INTO public.accounting_ledger (
      transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
  ) VALUES (
      'SALE', v_order_id, 'Order #' || v_order_number || ' Revenue', 0.00, v_total, 'NONE', v_cashier_id, v_shift_id
  );

  -- Insert Payments & Ledger Entries
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    v_pmethod := v_payment->>'method';
    v_pamount := (v_payment->>'amount')::NUMERIC;
    v_tendered := COALESCE((v_payment->>'amount_tendered')::NUMERIC, v_pamount);
    v_change := COALESCE((v_payment->>'change_given')::NUMERIC, 0.00);

    -- Ensure change is correct
    IF v_pmethod = 'CASH' AND (v_tendered - v_pamount) != v_change THEN
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

  -- Generate Receipt ID
  SELECT first_name INTO v_cashier_name FROM public.profiles WHERE id = v_cashier_id;
  IF v_cashier_name IS NULL OR v_cashier_name = '' THEN
    v_cashier_name := 'POS';
  END IF;

  v_receipt_id := UPPER(SUBSTRING(v_cashier_name FROM 1 FOR 3)) || '-' || LPAD(v_order_number::text, 6, '0');

  -- Return details
  RETURN json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_id', v_receipt_id
  );
END;
$$;
