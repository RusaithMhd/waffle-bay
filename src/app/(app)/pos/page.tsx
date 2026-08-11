import { ProductService } from '@/services/inventory/products'
import { createClient } from '@/lib/supabase/server'
import { PosApp } from '@/components/pos/PosApp'
import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission }          from '@/lib/rbac'
import { AccessDenied }           from '@/components/AccessDenied'

export default async function Home() {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'pos')) {
    return <AccessDenied role={userWithRole.role} />
  }

  // Fetch data
  const supabase = await createClient()
  const categories = await ProductService.getCategories(supabase)
  
  // In a real app we'd fetch products, then for each product we might fetch modifiers
  // if they have them. For the prototype, we fetch all products, and if we need
  // modifiers, the ProductService handles it.
  const rawProducts = await ProductService.getProducts(supabase)
  
  // We need to resolve modifiers for products that have them.
  // We can do this concurrently to save time, but we only need to do it for products
  // that belong to modifier mapping.
  
  // To keep it simple and follow the prompt's "visual menu" requirement,
  // we will map all products and attempt to load their modifiers.
  // In a production scenario, we'd use a SQL JOIN or RPC to fetch this efficiently in one go.
  const productsWithModifiersPromises = rawProducts.map(p => 
    ProductService.getProductWithModifiers(supabase, p.id)
  )
  const products = (await Promise.all(productsWithModifiersPromises)).filter(Boolean) as any[]

  // Fetch Global Toppings
  const { data: globalToppings } = await supabase
    .from('modifier_groups')
    .select('id, name, is_required, min_selections, max_selections, modifiers(*)')
    .eq('name', 'Toppings')
    .single()

  const { data: activeShift } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('cashier_id', userWithRole.id)
    .is('closed_at', null)
    .single()

  const hasActiveShift = !!activeShift

  return (
    <div className="h-full">
      <PosApp 
        categories={categories} 
        products={products} 
        hasActiveShift={hasActiveShift} 
        globalToppingsGroup={globalToppings} 
        userRole={userWithRole.role}
      />
    </div>
  )
}
