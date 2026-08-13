import { ProductService } from '@/services/inventory/products'
import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
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
  
  // Wrap expensive catalog fetches in Next.js cache (revalidates every hour or on demand)
  const getCachedCatalog = unstable_cache(
    async () => {
      // In production, Supabase would use a service role key here if RLS blocks anonymous access.
      // Assuming RLS allows read for authenticated, we must ensure cache isn't user-specific if we use a generic cache key.
      const sb = await createClient() 
      const cats = await ProductService.getCategories(sb)
      const rawProds = await ProductService.getProducts(sb)
      
      const prodsWithMods = await Promise.all(
        rawProds.map(p => ProductService.getProductWithModifiers(sb, p.id))
      )
      
      const { data: globalToppings } = await sb
        .from('modifier_groups')
        .select('id, name, is_required, min_selections, max_selections, modifiers(*)')
        .eq('name', 'Toppings')
        .single()
        
      return { 
        categories: cats, 
        products: prodsWithMods.filter(Boolean) as any[], 
        globalToppings 
      }
    },
    ['pos-catalog'],
    { revalidate: 3600, tags: ['catalog'] }
  )

  const { categories, products, globalToppings } = await getCachedCatalog()

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
