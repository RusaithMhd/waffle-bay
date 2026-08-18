export interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
}

export interface Modifier {
  id: string
  group_id: string
  name: string
  price: number
  is_active: boolean
  sort_order: number
}

export interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  min_selections: number
  max_selections: number
  modifiers?: Modifier[]
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  description?: string
  base_price: number
  sku?: string
  image_url?: string
  is_active: boolean
  sort_order: number
  allow_half_and_half?: boolean
  modifier_groups?: ModifierGroup[]
}
