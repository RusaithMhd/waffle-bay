'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CheckoutPayload {
  subtotal: number
  tax: number
  discount: number
  total: number
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
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
  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Basic payload validation
  if (!payload.items.length || !payload.payments.length) {
    return { success: false, error: 'Invalid order payload' }
  }

  const { data, error } = await supabase.rpc('checkout_order', {
    payload
  })

  if (error) {
    console.error('Checkout RPC Error:', error)
    return { success: false, error: error.message }
  }

  // Revalidate any dashboard/order paths if needed
  revalidatePath('/')

  return { success: true, data }
}
