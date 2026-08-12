import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCloseShift() {
  console.log('Testing close shift...');
  // Find an active shift
  const { data: activeShift } = await supabase
    .from('cash_register_shifts')
    .select('*')
    .is('closed_at', null)
    .single();

  if (!activeShift) {
    console.log('No active shift found to test.');
    return;
  }

  console.log('Found active shift:', activeShift.id);

  // Attempt to close it
  const { error: updateError } = await supabase
    .from('cash_register_shifts')
    .update({
      closed_at: new Date().toISOString(),
      expected_cash: activeShift.starting_cash,
      actual_cash: activeShift.starting_cash,
      variance: 0,
      notes: null
    })
    .eq('id', activeShift.id);

  if (updateError) {
    console.error('Update failed:', updateError);
  } else {
    console.log('✅ Shift closed successfully!');
  }
}

testCloseShift();
