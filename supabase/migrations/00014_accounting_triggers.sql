-- 00014_accounting_triggers.sql

BEGIN;

-- Helper function to get account ID by code
CREATE OR REPLACE FUNCTION public.get_account_id(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.accounts WHERE code = p_code;
  RETURN v_id;
END;
$$;


-- TRIGGER: Sales Revenue Generation (Fires on public.orders insert)
CREATE OR REPLACE FUNCTION public.trg_record_sale_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id UUID;
BEGIN
  -- We only record revenue when order is PAID
  IF NEW.status = 'PAID' THEN
    INSERT INTO public.journal_entries (description, reference_id)
    VALUES ('Sales Order #' || NEW.order_number, NEW.id)
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

DROP TRIGGER IF EXISTS trg_record_sale_journal_entry ON public.orders;
CREATE TRIGGER trg_record_sale_journal_entry
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_record_sale_journal_entry();


-- TRIGGER: Operating Expenses (Fires on public.expenses insert)
CREATE OR REPLACE FUNCTION public.trg_record_expense_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id UUID;
BEGIN
  INSERT INTO public.journal_entries (description, reference_id)
  VALUES ('Operating Expense: ' || NEW.description, NEW.id)
  RETURNING id INTO v_je_id;

  -- Debit Operating Expenses (6000)
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_je_id, public.get_account_id('6000'), NEW.amount, 0);

  -- Credit Cash (1000)
  INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
  VALUES (v_je_id, public.get_account_id('1000'), 0, NEW.amount);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_expense_journal_entry ON public.expenses;
CREATE TRIGGER trg_record_expense_journal_entry
AFTER INSERT ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.trg_record_expense_journal_entry();


-- TRIGGER: Purchase Orders (Fires on public.purchase_orders UPDATE to RECEIVED)
CREATE OR REPLACE FUNCTION public.trg_record_purchase_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_je_id UUID;
BEGIN
  IF NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED' THEN
    INSERT INTO public.journal_entries (description, reference_id)
    VALUES ('Purchase Order Received', NEW.id)
    RETURNING id INTO v_je_id;

    -- Debit Inventory Asset (1200)
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('1200'), NEW.total_amount, 0);

    -- Credit Accounts Payable (2000)
    INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_je_id, public.get_account_id('2000'), 0, NEW.total_amount);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_purchase_journal_entry ON public.purchase_orders;
CREATE TRIGGER trg_record_purchase_journal_entry
AFTER UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_record_purchase_journal_entry();

COMMIT;
