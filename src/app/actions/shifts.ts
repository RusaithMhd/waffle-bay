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

  const { data: shift, error } = await supabase
    .from('cash_register_shifts')
    .insert({
      cashier_id: user.id,
      starting_cash: startingCash
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Insert ledger entry for opening balance
  await supabase.from('accounting_ledger').insert({
    transaction_type: 'OPENING_BALANCE',
    reference_id: shift.id,
    description: 'Shift Opened Float',
    debit: startingCash,
    credit: 0,
    payment_method: 'CASH',
    cashier_id: user.id,
    shift_id: shift.id
  })

  revalidatePath('/')
  revalidatePath('/pos')
  return { success: true }
}

export async function closeShift(actualCash: number, varianceReason?: string) {
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

  // Calculate Expected Cash purely from the ledger
  const { data: ledgerEntries } = await supabase
    .from('accounting_ledger')
    .select('debit, credit')
    .eq('shift_id', activeShift.id)
    .eq('payment_method', 'CASH')

  const expectedCash = ledgerEntries?.reduce((acc, entry) => acc + Number(entry.debit) - Number(entry.credit), 0) || 0
  const variance = actualCash - expectedCash

  // Update shift
  const { error: updateError } = await supabase
    .from('cash_register_shifts')
    .update({
      closed_at: new Date().toISOString(),
      expected_cash: expectedCash,
      actual_cash: actualCash,
      variance: variance,
      notes: varianceReason || null
    })
    .eq('id', activeShift.id)

  if (updateError) return { success: false, error: updateError.message }

  // If there is a variance, record it in the ledger as an adjustment
  if (variance !== 0) {
    await supabase.from('accounting_ledger').insert({
      transaction_type: 'ADJUSTMENT',
      reference_id: activeShift.id,
      description: 'Shift Close Variance: ' + (varianceReason || 'Unexplained'),
      debit: variance > 0 ? Math.abs(variance) : 0,
      credit: variance < 0 ? Math.abs(variance) : 0,
      payment_method: 'CASH',
      cashier_id: user.id,
      shift_id: activeShift.id
    })
  }

  revalidatePath('/')
  revalidatePath('/pos')
  revalidatePath('/accounting')
  return { success: true }
}

