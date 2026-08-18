-- 00043_accounting_update_trigger.sql
BEGIN;

-- TRIGGER: Sales Revenue Generation (Fires on public.orders UPDATE to PAID)
CREATE OR REPLACE FUNCTION public.trg_record_sale_journal_entry_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id UUID;
BEGIN
  -- We only record revenue when order transitions to PAID
  IF NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
    INSERT INTO public.journal_entries (description, reference_id, date)
    VALUES ('Sales Order #' || NEW.order_number, NEW.id, NEW.updated_at)
    RETURNING id INTO v_je_id;

    -- Debit Cash (1000) for the total amount received
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('1000'), NEW.total, 0);

    -- Credit Sales Revenue (4000)
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('4000'), 0, NEW.total);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_sale_journal_entry_on_update ON public.orders;
CREATE TRIGGER trg_record_sale_journal_entry_on_update
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_record_sale_journal_entry_on_update();

-- Backfill missing journal entries for existing PAID orders that don't have a journal entry yet.
-- This commonly happens for KOT orders that were inserted as PENDING and updated to PAID before this trigger existed.
DO $$
DECLARE
  rec RECORD;
  v_je_id UUID;
BEGIN
  FOR rec IN 
    SELECT o.id, o.order_number, o.total, o.created_at
    FROM public.orders o
    LEFT JOIN public.journal_entries je ON je.reference_id = o.id
    WHERE o.status = 'PAID' AND je.id IS NULL
  LOOP
    INSERT INTO public.journal_entries (description, reference_id, date)
    VALUES ('Sales Order #' || rec.order_number, rec.id, rec.created_at)
    RETURNING id INTO v_je_id;

    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('1000'), rec.total, 0);

    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('4000'), 0, rec.total);
  END LOOP;
END;
$$;

COMMIT;
