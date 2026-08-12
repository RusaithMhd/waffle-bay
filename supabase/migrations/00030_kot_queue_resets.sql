-- Migration: 00030_kot_queue_resets.sql
-- Description: Adds dynamic 6:00 AM business day KOT queue numbering and audit trail.

BEGIN;

-- 1. Add timezone to store_settings
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Colombo';

-- 2. Add columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kot_number INT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS business_date DATE;

-- 3. Add unique constraint to prevent duplicate KOT numbers on the same business day
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS unique_business_date_kot_number;
ALTER TABLE public.orders ADD CONSTRAINT unique_business_date_kot_number UNIQUE (business_date, kot_number);

-- 4. Create KOT Counters table for concurrency-safe atomic sequence increments
CREATE TABLE IF NOT EXISTS public.kot_counters (
  business_date DATE PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0
);

-- 5. Create KOT Audit Logs table
CREATE TABLE IF NOT EXISTS public.kot_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_number INT NOT NULL,
  new_number INT NOT NULL,
  reason TEXT NOT NULL,
  business_date DATE NOT NULL
);

-- RLS
ALTER TABLE public.kot_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for authenticated on kot_counters" ON public.kot_counters;
CREATE POLICY "Allow read for authenticated on kot_counters" ON public.kot_counters FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read for authenticated on kot_audit_logs" ON public.kot_audit_logs;
CREATE POLICY "Allow read for authenticated on kot_audit_logs" ON public.kot_audit_logs FOR SELECT TO authenticated USING (true);

-- 6. Centralized function to calculate the current business date
-- A business day starts at 6:00 AM and ends at 5:59:59 AM the next day.
CREATE OR REPLACE FUNCTION public.get_business_date(p_timezone TEXT DEFAULT 'Asia/Colombo')
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  v_local_time TIMESTAMP;
BEGIN
  -- Convert UTC timestamp to local restaurant time
  v_local_time := timezone(p_timezone, NOW());
  
  -- If local time is before 6:00 AM, it is the previous calendar day
  IF EXTRACT(HOUR FROM v_local_time) < 6 THEN
    RETURN (v_local_time - INTERVAL '1 day')::DATE;
  ELSE
    RETURN v_local_time::DATE;
  END IF;
END;
$$;

-- 7. Manager/Admin action to manually adjust or reset KOT sequence
CREATE OR REPLACE FUNCTION public.adjust_kot_counter(
  p_business_date DATE,
  p_new_number INT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
  v_old_number INT;
BEGIN
  -- Check authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check authorized roles (admin/manager)
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;
  IF v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: only admins or managers can adjust KOT sequence';
  END IF;

  -- Get old counter value
  SELECT last_value INTO v_old_number FROM public.kot_counters WHERE business_date = p_business_date;
  IF v_old_number IS NULL THEN
    v_old_number := 0;
  END IF;

  -- Upsert value
  INSERT INTO public.kot_counters (business_date, last_value)
  VALUES (p_business_date, p_new_number)
  ON CONFLICT (business_date)
  DO UPDATE SET last_value = p_new_number;

  -- Log to audit trails
  INSERT INTO public.kot_audit_logs (cashier_id, old_number, new_number, reason, business_date)
  VALUES (v_user_id, v_old_number, p_new_number, p_reason, p_business_date);

  RETURN jsonb_build_object(
    'success', true,
    'old_number', v_old_number,
    'new_number', p_new_number
  );
END;
$$;

-- 8. Update checkout_order RPC with KOT queue numbering
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

  -- KOT / Business day variables
  v_timezone TEXT;
  v_business_date DATE;
  v_kot_number INT;
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

  -- 3. Calculate business date and assign KOT number
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

  -- 4. Insert Order
  v_subtotal := (payload->>'subtotal')::NUMERIC;
  v_tax := (payload->>'tax')::NUMERIC;
  v_discount := (payload->>'discount')::NUMERIC;

  INSERT INTO public.orders (
    cashier_id, shift_id, status, subtotal, tax, discount, total, fulfillment_status, order_type, kot_number, business_date
  ) VALUES (
    v_cashier_id, 
    v_shift_id, 
    'PAID', 
    v_subtotal, 
    v_tax, 
    v_discount, 
    v_total, 
    'NEW', 
    COALESCE(payload->>'order_type', 'DINE_IN'),
    v_kot_number,
    v_business_date
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 5. Insert Items, Modifiers, and deduct inventory
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

  -- 6. Ledger: Record the Sale Revenue (Credit)
  INSERT INTO public.accounting_ledger (
      transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
  ) VALUES (
      'SALE', v_order_id, 'Order #' || v_order_number || ' Revenue', 0.00, v_total, 'NONE', v_cashier_id, v_shift_id
  );

  -- 7. Insert Payments & Ledger Entries
  FOR v_payment IN SELECT * FROM jsonb_array_elements(payload->'payments')
  LOOP
    v_pmethod := v_payment->>'method';
    v_pamount := (v_payment->>'amount')::NUMERIC;
    v_tendered := COALESCE((v_payment->>'amount_tendered')::NUMERIC, v_pamount);
    v_change := COALESCE((v_payment->>'change_given')::NUMERIC, 0.00);

    -- Ensure change is mathematically correct for cash
    IF v_pmethod = 'CASH' AND (v_tendered - v_pamount) != v_change THEN
       v_change := v_tendered - v_pamount;
    END IF;

    INSERT INTO public.payments (order_id, method, amount, amount_tendered, change_given)
    VALUES (v_order_id, v_pmethod, v_pamount, v_tendered, v_change);

    -- Ledger: Record the actual cash/card received (Debit)
    INSERT INTO public.accounting_ledger (
        transaction_type, reference_id, description, debit, credit, payment_method, cashier_id, shift_id
    ) VALUES (
        'PAYMENT', v_order_id, 'Payment Received (' || v_pmethod || ')', v_pamount, 0.00, v_pmethod, v_cashier_id, v_shift_id
    );
  END LOOP;

  -- 8. Generate Receipt ID
  SELECT first_name INTO v_cashier_name FROM public.profiles WHERE id = v_cashier_id;
  IF v_cashier_name IS NULL OR v_cashier_name = '' THEN
    v_cashier_name := 'POS';
  END IF;

  v_receipt_id := 'REC-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(v_order_number::TEXT, 4, '0');

  -- 9. Return success with order details
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_id', v_receipt_id,
    'shift_id', v_shift_id,
    'kot_number', v_kot_number,
    'business_date', TO_CHAR(v_business_date, 'YYYY-MM-DD')
  );
END;
$$;

COMMIT;
