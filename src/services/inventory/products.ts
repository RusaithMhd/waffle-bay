import { Product, Category, ModifierGroup } from '@/types'
import { SupabaseClient } from '@supabase/supabase-js'

export const ProductService = {
  async getCategories(supabase: SupabaseClient): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data as Category[]
  },

  async getProducts(supabase: SupabaseClient): Promise<Product[]> {
    
    // In a real application we would use a more complex query or edge function
    // to fetch the deeply nested modifiers. For this iteration, we fetch
    // the flat products and resolve relations below if needed.
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data as Product[]
  },

  async getProductWithModifiers(supabase: SupabaseClient, productId: string): Promise<Product | null> {
    // 1. Get Product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (productError || !product) return null

    // 2. Get mappings
    const { data: mappings, error: mapError } = await supabase
      .from('product_modifiers')
      .select('modifier_group_id')
      .eq('product_id', productId)

    if (mapError || !mappings?.length) return product as Product

    const groupIds = mappings.map((m: any) => m.modifier_group_id)

    // 3. Get Modifier Groups
    const { data: groups, error: groupsError } = await supabase
      .from('modifier_groups')
      .select('*')
      .in('id', groupIds)

    if (groupsError) return product as Product

    // 4. Get Modifiers for these groups
    const { data: modifiers, error: modError } = await supabase
      .from('modifiers')
      .select('*')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (modError) return product as Product

    // Map modifiers into their groups
    const completeGroups: ModifierGroup[] = groups.map((g: any) => ({
      ...g,
      modifiers: modifiers.filter((m: any) => m.group_id === g.id)
    }))

    return {
      ...(product as Product),
      modifier_groups: completeGroups
    }
  }
}
