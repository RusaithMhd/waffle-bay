-- 1. Remove the old check constraint that restricts role names to 'OWNER', 'MANAGER', 'CASHIER'
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;

-- 2. Insert the Waiter role
INSERT INTO public.roles (id, name, description) 
VALUES (gen_random_uuid(), 'waiter', 'Waiter staff can only access the Point of Sale screen and cannot take payments.')
ON CONFLICT (name) DO NOTHING;
