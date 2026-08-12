'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCashEntry(type: 'CASH_IN' | 'CASH_OUT', amount: number, description: string) {
  if (amount <= 0) return { success: false, error: 'Amount must be greater than zero.' }
  if (!description.trim()) return { success: false, error: 'Description is required.' }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Must have an active shift to add manual cash movements to the drawer
  const { data: activeShift } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('cashier_id', user.id)
    .is('closed_at', null)
    .single()

  if (!activeShift) {
    return { success: false, error: 'You must have an open shift to record cash movements.' }
  }

  const { error } = await supabase.from('accounting_ledger').insert({
    transaction_type: type,
    reference_id: activeShift.id, // Linked to the shift
    description: description,
    debit: type === 'CASH_IN' ? amount : 0,
    credit: type === 'CASH_OUT' ? amount : 0,
    payment_method: 'CASH',
    cashier_id: user.id,
    shift_id: activeShift.id
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/pos')
  revalidatePath('/accounting')
  return { success: true }
}
