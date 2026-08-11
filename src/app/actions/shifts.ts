'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function openShift(startingCash: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Check if a shift is already open
  const { data: existingShift } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('cashier_id', user.id)
    .is('closed_at', null)
    .single()

  if (existingShift) {
    return { success: false, error: 'You already have an open shift.' }
  }

  const { error } = await supabase
    .from('cash_register_shifts')
    .insert({
      cashier_id: user.id,
      starting_cash: startingCash
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/pos')
  return { success: true }
}

export async function closeShift() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Find active shift
  const { data: activeShift, error: shiftError } = await supabase
    .from('cash_register_shifts')
    .select('*')
    .eq('cashier_id', user.id)
    .is('closed_at', null)
    .single()

  if (shiftError || !activeShift) {
    return { success: false, error: 'No active shift found.' }
  }

  // Calculate Expected Cash
  // starting_cash + sum(cash payments for this shift)
  const { data: cashPayments } = await supabase
    .from('payments')
    .select('amount, orders!inner(shift_id)')
    .eq('method', 'CASH')
    .eq('status', 'SUCCESS')
    .eq('orders.shift_id', activeShift.id)

  const totalCashSales = cashPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0
  const expectedCash = Number(activeShift.starting_cash) + totalCashSales

  // Update shift
  const { error: updateError } = await supabase
    .from('cash_register_shifts')
    .update({
      closed_at: new Date().toISOString(),
      expected_cash: expectedCash,
      actual_cash: expectedCash, // Assuming perfect variance for MVP
      variance: 0
    })
    .eq('id', activeShift.id)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath('/')
  revalidatePath('/pos')
  revalidatePath('/accounting')
  return { success: true }
}

