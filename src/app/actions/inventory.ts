'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function restockItem(ingredientId: string, costPerUnit: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const restockQuantity = 100 // Hardcoded quick restock
  const totalCost = costPerUnit * restockQuantity

  // 1. Create Purchase Order
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id: null, // Optional for MVP
      status: 'PENDING',
      total_amount: totalCost,
      notes: 'Quick Restock from UI'
    })
    .select('id')
    .single()

  if (poError || !po) {
    return { success: false, error: poError?.message || 'Failed to create PO' }
  }

  // 2. Add PO Item
  const { error: itemError } = await supabase
    .from('purchase_order_items')
    .insert({
      po_id: po.id,
      ingredient_id: ingredientId,
      quantity: restockQuantity,
      unit_price: costPerUnit,
      total_price: totalCost
    })

  if (itemError) {
    return { success: false, error: itemError.message }
  }

  // 3. Receive the Purchase Order (Triggers accounting and inventory updates)
  const { error: rpcError } = await supabase.rpc('receive_purchase_order', {
    p_po_id: po.id
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  revalidatePath('/inventory')
  revalidatePath('/accounting')
  return { success: true }
}

export async function createIngredient(data: { name: string, unit_of_measure: string, reorder_level: number, cost_per_unit: number }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('ingredients').insert({
    name: data.name,
    unit_of_measure: data.unit_of_measure,
    reorder_level: data.reorder_level,
    cost_per_unit: data.cost_per_unit,
    current_stock: 0
  })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

export async function updateIngredient(id: string, data: { name: string, unit_of_measure: string, reorder_level: number, cost_per_unit: number }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('ingredients').update({
    name: data.name,
    unit_of_measure: data.unit_of_measure,
    reorder_level: data.reorder_level,
    cost_per_unit: data.cost_per_unit,
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}

export async function deleteIngredient(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Check if ingredient is used in any recipes
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('ingredient_id', id)
    .limit(1)

  const { data: modifierRecipes } = await supabase
    .from('modifier_recipes')
    .select('id')
    .eq('ingredient_id', id)
    .limit(1)

  if ((recipes && recipes.length > 0) || (modifierRecipes && modifierRecipes.length > 0)) {
    return { success: false, error: 'Cannot delete ingredient: It is currently used in one or more product/modifier recipes.' }
  }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/inventory')
  return { success: true }
}
