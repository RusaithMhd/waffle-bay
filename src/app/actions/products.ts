'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function uploadImage(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null

  const adminClient = createAdminClient()
  
  // Generate a unique file name
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `products/${fileName}`

  // Convert File to ArrayBuffer for uploading
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data, error } = await adminClient
    .storage
    .from('product-images')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false
    })

  if (error) {
    console.error('Error uploading image:', error)
    throw new Error('Failed to upload image')
  }

  // Get the public URL
  const { data: { publicUrl } } = adminClient
    .storage
    .from('product-images')
    .getPublicUrl(filePath)

  return publicUrl
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const base_price = Number(formData.get('base_price'))
  const imageFile = formData.get('image') as File | null

  try {
    const image_url = await uploadImage(imageFile)

    const { error } = await supabase.from('products').insert({
      name,
      category_id,
      base_price,
      image_url,
      is_active: true
    })

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/products')
    revalidatePath('/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const category_id = formData.get('category_id') as string
  const base_price = Number(formData.get('base_price'))
  const is_active = formData.get('is_active') === 'true'
  const imageFile = formData.get('image') as File | null

  try {
    const updatePayload: any = {
      name,
      category_id,
      base_price,
      is_active,
      updated_at: new Date().toISOString()
    }

    if (imageFile && imageFile.size > 0) {
      const image_url = await uploadImage(imageFile)
      if (image_url) {
        updatePayload.image_url = image_url
      }
    }

    const { error } = await supabase.from('products').update(updatePayload).eq('id', id)

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/products')
    revalidatePath('/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error' }
  }
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
