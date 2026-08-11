-- 00009_receive_po_rpc.sql

-- PostgreSQL function to receive a Purchase Order and atomically update inventory
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_status TEXT;
  v_item RECORD;
BEGIN
  -- 1. Check PO status
  SELECT status INTO v_po_status
  FROM public.purchase_orders
  WHERE id = p_po_id;

  IF v_po_status IS NULL THEN
    RAISE EXCEPTION 'Purchase order not found';
  END IF;

  IF v_po_status = 'RECEIVED' THEN
    RAISE EXCEPTION 'Purchase order is already received';
  END IF;

  IF v_po_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot receive a cancelled purchase order';
  END IF;

  -- 2. Update PO status to RECEIVED
  UPDATE public.purchase_orders
  SET status = 'RECEIVED',
      updated_at = NOW()
  WHERE id = p_po_id;

  -- 3. Loop through PO items and increase inventory
  FOR v_item IN (SELECT ingredient_id, quantity FROM public.purchase_order_items WHERE po_id = p_po_id)
  LOOP
    -- 3a. Update ingredient stock
    UPDATE public.ingredients
    SET current_stock = current_stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.ingredient_id;

    -- 3b. Log inventory transaction
    INSERT INTO public.inventory_transactions (
      ingredient_id, transaction_type, quantity_changed, reference_id, notes
    ) VALUES (
      v_item.ingredient_id,
      'PURCHASE',
      v_item.quantity,
      p_po_id,
      'Received PO'
    );
  END LOOP;

  RETURN json_build_object('success', true, 'po_id', p_po_id)::JSONB;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to receive purchase order: %', SQLERRM;
END;
$$;
