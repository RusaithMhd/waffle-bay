'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { calculateOrderTotals } from '@/lib/calculations'

export interface CheckoutPayload {
  subtotal: number
  tax: number
  discount: number
  total: number
  discount_type: 'percentage' | 'amount'
  discount_value: number
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
  table_number?: string
  idempotency_key: string
  items: {
    product_id: string
    product_name_snapshot: string
    unit_price_snapshot: number
    quantity: number
    subtotal: number
    notes?: string
    modifiers: {
      modifier_id: string
      modifier_name_snapshot: string
      modifier_price_snapshot: number
      quantity: number
    }[]
  }[]
  payments: {
    method: 'CASH' | 'CARD' | 'QR' | 'BANK_TRANSFER'
    amount: number
    amount_tendered?: number
    change_given?: number
  }[]
}

export async function processCheckout(payload: CheckoutPayload) {
  // Ensure user is authenticated and get their role
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  // Fetch store settings from DB to get the latest tax rate and discount toggle state
  const { data: settings, error: settingsError } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (settingsError || !settings) {
    return { success: false, error: 'Could not fetch store settings' }
  }

  // Basic payload validation
  if (!payload.items.length || !payload.payments.length) {
    return { success: false, error: 'Invalid order payload' }
  }

  // Recalculate subtotal based on payload items (prevents client subtotal manipulation)
  let calculatedSubtotal = 0
  for (const item of payload.items) {
    const itemModsPrice = item.modifiers.reduce((sum, mod) => sum + Number(mod.modifier_price_snapshot), 0)
    const itemSubtotal = (Number(item.unit_price_snapshot) + itemModsPrice) * item.quantity
    item.subtotal = itemSubtotal
    calculatedSubtotal += itemSubtotal
  }

  const discountValue = Number(payload.discount_value || 0)
  const discountType = payload.discount_type || 'percentage'

  // If a discount is applied, perform backend verification
  if (discountValue > 0) {
    // 1. Check if discount setting is enabled globally
    if (!settings.enable_discount) {
      return { success: false, error: 'Discounts are currently disabled by the administrator' }
    }

    // 2. Check if the user has permission to apply discounts
    if (!hasPermission(userWithRole.role, 'pos.discount')) {
      return { success: false, error: 'Unauthorized: You do not have permission to apply discounts' }
    }

    // 3. Validate discount limits
    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return { success: false, error: 'Invalid percentage discount: Must be between 0% and 100%' }
    }
    if (discountType === 'amount' && (discountValue < 0 || discountValue > calculatedSubtotal)) {
      return { success: false, error: 'Invalid discount amount: Discount cannot exceed subtotal' }
    }
  }

  // Calculate order totals independently using the centralized calculation logic
  const taxRate = Number(settings.tax_rate || 0)
  const orderTotals = calculateOrderTotals(calculatedSubtotal, discountType, discountValue, taxRate)

  // Force backend-calculated values onto the payload to prevent browser-level request tampering
  payload.subtotal = orderTotals.subtotal
  payload.discount = orderTotals.discountAmount
  payload.tax = orderTotals.taxAmount
  payload.total = orderTotals.total

  // Payments verification
  let paymentTotal = 0
  for (const payment of payload.payments) {
    paymentTotal += Number(payment.amount)
  }

  if (paymentTotal < payload.total) {
    return { success: false, error: `Total payments (${paymentTotal}) do not cover the calculated order total (${payload.total})` }
  }

  const { data, error } = await supabase.rpc('checkout_order', {
    payload
  })

  if (error) {
    console.error('Checkout RPC Error:', error)
    return { success: false, error: error.message }
  }

  // Revalidate dashboard/order paths
  revalidatePath('/')

  return { success: true, data }
}

export async function createKOTOrder(payload: Omit<CheckoutPayload, 'payments'>) {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  const { data: settings, error: settingsError } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (settingsError || !settings) {
    return { success: false, error: 'Could not fetch store settings' }
  }

  if (!payload.items.length) {
    return { success: false, error: 'Invalid order payload' }
  }

  let calculatedSubtotal = 0
  for (const item of payload.items) {
    const itemModsPrice = item.modifiers.reduce((sum, mod) => sum + Number(mod.modifier_price_snapshot), 0)
    const itemSubtotal = (Number(item.unit_price_snapshot) + itemModsPrice) * item.quantity
    item.subtotal = itemSubtotal
    calculatedSubtotal += itemSubtotal
  }

  const discountValue = Number(payload.discount_value || 0)
  const discountType = payload.discount_type || 'percentage'

  if (discountValue > 0) {
    if (!settings.enable_discount) {
      return { success: false, error: 'Discounts are currently disabled by the administrator' }
    }

    if (!hasPermission(userWithRole.role, 'pos.discount')) {
      return { success: false, error: 'Unauthorized: You do not have permission to apply discounts' }
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      return { success: false, error: 'Invalid percentage discount: Must be between 0% and 100%' }
    }
    if (discountType === 'amount' && (discountValue < 0 || discountValue > calculatedSubtotal)) {
      return { success: false, error: 'Invalid discount amount: Discount cannot exceed subtotal' }
    }
  }

  const taxRate = Number(settings.tax_rate || 0)
  const orderTotals = calculateOrderTotals(calculatedSubtotal, discountType, discountValue, taxRate)

  payload.subtotal = orderTotals.subtotal
  payload.discount = orderTotals.discountAmount
  payload.tax = orderTotals.taxAmount
  payload.total = orderTotals.total

  const { data, error } = await supabase.rpc('create_unpaid_order', {
    payload
  })

  if (error) {
    console.error('Create Unpaid Order RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/pos')

  return { success: true, data }
}

export async function processPayment(payload: { order_id: string; payments: CheckoutPayload['payments'] }) {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('pay_order', {
    payload
  })

  if (error) {
    console.error('Pay Order RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/pos')
  revalidatePath('/sales')

  return { success: true, data }
}

export async function appendItemsToOrder(payload: {
  order_id: string
  new_items: any[]
  subtotal: number
  tax: number
  discount: number
  total: number
}) {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) {
    return { success: false, error: 'Not authenticated' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('add_items_to_order', {
    p_order_id: payload.order_id,
    p_new_items: payload.new_items,
    p_subtotal: payload.subtotal,
    p_tax: payload.tax,
    p_discount: payload.discount,
    p_total: payload.total
  })

  if (error) {
    console.error('Append Items to Order RPC Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/pos')

  return { success: true, data }
}
