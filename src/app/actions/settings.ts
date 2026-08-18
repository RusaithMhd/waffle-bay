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
  enable_discount: boolean
  phone_number?: string
  logo_url?: string
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
    enable_discount: data.enable_discount,
    phone_number: data.phone_number,
    logo_url: data.logo_url,
    updated_at: new Date().toISOString()
  }).eq('id', 1)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  revalidatePath('/pos')
  revalidatePath('/', 'layout') // Force layout SettingsProvider to refetch
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

export async function updatePrinterSettings(config: {
  transport: 'ble' | 'spp'
  bleServiceUuid: string
  bleWriteCharacteristicUuid: string
  sppServiceClassId: string
  sppBaudRate: number
  paperWidth: number
  dotsPerLine: number
  charactersPerLine: number
  useRasterization: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('store_settings').update({
    printer_transport: config.transport,
    printer_ble_service_uuid: config.bleServiceUuid,
    printer_ble_characteristic_uuid: config.bleWriteCharacteristicUuid,
    printer_spp_service_class_uuid: config.sppServiceClassId,
    printer_spp_baud_rate: config.sppBaudRate,
    printer_paper_width: config.paperWidth,
    printer_dots_per_line: config.dotsPerLine,
    printer_characters_per_line: config.charactersPerLine,
    printer_use_rasterization: config.useRasterization,
    updated_at: new Date().toISOString()
  }).eq('id', 1)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/settings')
  revalidatePath('/pos')
  return { success: true }
}
