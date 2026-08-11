'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProduct(data: { name: string, category_id: string, base_price: number }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('products').insert({
    name: data.name,
    category_id: data.category_id,
    base_price: data.base_price,
    is_active: true
  })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/products')
  revalidatePath('/pos') // To ensure POS menu is updated
  return { success: true }
}

export async function updateProduct(id: string, data: { name: string, category_id: string, base_price: number, is_active: boolean }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('products').update({
    name: data.name,
    category_id: data.category_id,
    base_price: data.base_price,
    is_active: data.is_active,
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/products')
  revalidatePath('/pos')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Check if product is used in any orders
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('product_id', id)
    .limit(1)

  if (orderItems && orderItems.length > 0) {
    return { success: false, error: 'Cannot delete product: It has already been ordered by customers. Please mark it as inactive instead.' }
  }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/products')
  revalidatePath('/pos')
  return { success: true }
}
