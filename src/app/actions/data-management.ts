'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth'

async function requireAdmin() {
  const user = await getCurrentUserWithRole()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }
  return user
}

export async function verifyAdminPassword(password: string) {
  const user = await requireAdmin()
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password
  })

  if (error) {
    throw new Error('Invalid password')
  }

  return { success: true }
}

export async function clearSalesData() {
  await requireAdmin()
  const supabase = createAdminClient()
  
  // order_items and order_item_modifiers will be cascade deleted
  // kitchen_order_items will be cascade deleted
  // payments will be cascade deleted
  
  const { error: err1 } = await supabase.from('kitchen_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err2 } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err3 } = await supabase.from('cash_register_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err4 } = await supabase.from('kot_counters').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (err1) throw new Error('Failed to delete kitchen orders: ' + err1.message)
  if (err2) throw new Error('Failed to delete orders: ' + err2.message)
  if (err3) throw new Error('Failed to delete cash register shifts: ' + err3.message)
  if (err4) throw new Error('Failed to delete kot counters: ' + err4.message)

  return { success: true }
}

export async function clearAccountingData() {
  await requireAdmin()
  const supabase = createAdminClient()

  // journal_entry_lines will cascade
  const { error: err1 } = await supabase.from('accounting_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err2 } = await supabase.from('journal_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err3 } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (err1) throw new Error('Failed to delete accounting ledger: ' + err1.message)
  if (err2) throw new Error('Failed to delete journal entries: ' + err2.message)
  if (err3) throw new Error('Failed to delete expenses: ' + err3.message)

  return { success: true }
}

export async function clearLogs() {
  await requireAdmin()
  const supabase = createAdminClient()

  const { error: err1 } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { error: err2 } = await supabase.from('kot_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  if (err1) throw new Error('Failed to delete audit logs: ' + err1.message)
  if (err2) throw new Error('Failed to delete kot audit logs: ' + err2.message)

  return { success: true }
}

export async function deleteOrderById(orderId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  // Delete related accounting ledger entries (so it deducts from the accounts)
  const { error: ledgerError } = await supabase.from('accounting_ledger').delete().eq('reference_id', orderId)
  if (ledgerError) throw new Error('Failed to delete related accounting ledger entries: ' + ledgerError.message)

  // This will cascade delete order_items, order_item_modifiers, payments, etc.
  const { error } = await supabase.from('orders').delete().eq('id', orderId)

  if (error) throw new Error('Failed to delete order: ' + error.message)

  return { success: true }
}
