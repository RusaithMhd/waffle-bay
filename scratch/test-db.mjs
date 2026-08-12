import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: zReports, error: zError } = await supabase.from('z_reports_view').select('*, profiles!cashier_id(first_name)');
  console.log('zReports with profiles:', zReports?.length, zError);

  const { data: ledger, error: lError } = await supabase.from('accounting_ledger').select('*');
  console.log('ledger:', ledger?.length, lError);
  
  const { data: shifts } = await supabase.from('cash_register_shifts').select('id, starting_cash, cashier_id, opened_at');
  console.log('shifts:', shifts?.length, shifts?.slice(0, 1));
  
  // Try inserting one to see if it fails
  if (shifts?.length > 0) {
    const shift = shifts[0];
    const { data: insertData, error: insertError } = await supabase.from('accounting_ledger').insert({
      transaction_type: 'OPENING_BALANCE',
      reference_id: shift.id,
      description: 'Historical Opening',
      debit: shift.starting_cash,
      credit: 0,
      payment_method: 'CASH',
      cashier_id: shift.cashier_id,
      shift_id: shift.id,
      created_at: shift.opened_at
    });
    console.log('Manual insert test:', insertError);
  }
}
test();
