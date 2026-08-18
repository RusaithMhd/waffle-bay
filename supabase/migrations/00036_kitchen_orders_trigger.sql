BEGIN;

-- Create function to derive overall order fulfillment status from kitchen_orders batches
CREATE OR REPLACE FUNCTION public.derive_order_fulfillment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_new_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Derive status:
  -- If there's any NEW batch, status is 'NEW'
  -- Else if there's any PREPARING batch, status is 'PREPARING'
  -- Else if there's any READY batch, status is 'READY'
  -- Else (all are completed or no batches), status is 'COMPLETED'
  IF EXISTS (SELECT 1 FROM public.kitchen_orders WHERE order_id = v_order_id AND status = 'NEW') THEN
    v_new_status := 'NEW';
  ELSIF EXISTS (SELECT 1 FROM public.kitchen_orders WHERE order_id = v_order_id AND status = 'PREPARING') THEN
    v_new_status := 'PREPARING';
  ELSIF EXISTS (SELECT 1 FROM public.kitchen_orders WHERE order_id = v_order_id AND status = 'READY') THEN
    v_new_status := 'READY';
  ELSE
    v_new_status := 'COMPLETED';
  END IF;

  UPDATE public.orders
  SET fulfillment_status = v_new_status,
      updated_at = NOW()
  WHERE id = v_order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind trigger to kitchen_orders
DROP TRIGGER IF EXISTS trg_derive_order_fulfillment_status ON public.kitchen_orders;
CREATE TRIGGER trg_derive_order_fulfillment_status
AFTER INSERT OR UPDATE OR DELETE ON public.kitchen_orders
FOR EACH ROW EXECUTE FUNCTION public.derive_order_fulfillment_status();

COMMIT;
