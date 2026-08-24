import { ProductService } from '@/services/inventory/products'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { PosApp } from '@/components/pos/PosApp'
import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission }          from '@/lib/rbac'
import { AccessDenied }           from '@/components/AccessDenied'

// Wrap expensive catalog fetches in Next.js cache (revalidates every hour or on demand)
const getCachedCatalog = unstable_cache(
  async () => {
    // Use the admin client (which bypasses cookies) because unstable_cache 
    // does not allow dynamic functions like cookies() to be called inside it.
    const sb = createAdminClient() 
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

export default async function Home() {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'pos')) {
    return <AccessDenied role={userWithRole.role} />
  }

  // Fetch data
  const supabase = await createClient()
  
  const { categories, products, globalToppings } = await getCachedCatalog()



  return (
    <div className="h-full">
      <PosApp 
        categories={categories} 
        products={products} 
        globalToppingsGroup={globalToppings} 
        userRole={userWithRole.role}
      />
    </div>
  )
}
