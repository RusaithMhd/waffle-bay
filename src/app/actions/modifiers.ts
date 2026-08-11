'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getOrCreateToppingsGroup(supabase: any) {
  let { data: group } = await supabase.from('modifier_groups').select('id').eq('name', 'Toppings').single()
  
  if (!group) {
    const { data: newGroup, error } = await supabase.from('modifier_groups').insert({ 
      name: 'Toppings', 
      is_required: false,
      min_selections: 0,
      max_selections: 10 
    }).select('id').single()
    
    if (error) throw new Error(error.message)
    group = newGroup
  }
  return group.id
}

export async function createTopping(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const price = Number(formData.get('price')) || 0

  try {
    const groupId = await getOrCreateToppingsGroup(supabase)
    
    const { error } = await supabase.from('modifiers').insert({
      group_id: groupId,
      name,
      price,
      is_active: true
    })

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/products/toppings')
    revalidatePath('/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function updateTopping(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const name = formData.get('name') as string
  const price = Number(formData.get('price')) || 0
  const is_active = formData.get('is_active') === 'true'

  try {
    const { error } = await supabase.from('modifiers').update({
      name,
      price,
      is_active,
      updated_at: new Date().toISOString()
    }).eq('id', id)

    if (error) return { success: false, error: error.message }
    
    revalidatePath('/products/toppings')
    revalidatePath('/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function deleteTopping(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const { error } = await supabase.from('modifiers').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    
    revalidatePath('/products/toppings')
    revalidatePath('/pos')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Server error' }
  }
}
