'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- Store Settings ---
export async function updateStoreSettings(data: {
  store_name: string
  store_address: string
  currency_symbol: string
  tax_rate: number
  receipt_header: string
  receipt_footer: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('store_settings').update({
    store_name: data.store_name,
    store_address: data.store_address,
    currency_symbol: data.currency_symbol,
    tax_rate: data.tax_rate,
    receipt_header: data.receipt_header,
    receipt_footer: data.receipt_footer,
    updated_at: new Date().toISOString()
  }).eq('id', 1)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  revalidatePath('/pos') // To reflect changes in POS receipt
  return { success: true }
}

// --- Categories ---
export async function createCategory(name: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('categories').insert({
    name,
    description,
    is_active: true
  })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  revalidatePath('/products')
  revalidatePath('/pos')
  return { success: true }
}

export async function updateCategory(id: string, name: string, description: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('categories').update({
    name,
    description,
    is_active,
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  revalidatePath('/products')
  revalidatePath('/pos')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Check for products
  const { data: products } = await supabase.from('products').select('id').eq('category_id', id).limit(1)
  if (products && products.length > 0) {
    return { success: false, error: 'Cannot delete category containing products. Reassign or delete the products first.' }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  return { success: true }
}

// --- Staff Roles ---
export async function updateUserRole(userId: string, roleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Overwrite existing role assignment
  const { error } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role_id: roleId
  }, { onConflict: 'user_id' })

  if (error) {
    // If UPSERT fails due to lack of a unique constraint on user_id alone, we will do a delete + insert instead.
    // user_roles has UNIQUE(user_id, role_id) but not necessarily user_id as primary.
    await supabase.from('user_roles').delete().eq('user_id', userId)
    const { error: insertError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role_id: roleId
    })
    if (insertError) return { success: false, error: insertError.message }
  }
  
  revalidatePath('/settings')
  return { success: true }
}
