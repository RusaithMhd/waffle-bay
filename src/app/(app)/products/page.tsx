import { createClient } from '@/lib/supabase/server'
import { AddProductButton, ProductRowActions, ProductSearch } from './ProductActions'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission }          from '@/lib/rbac'
import { AccessDenied }           from '@/components/AccessDenied'
import Image                      from 'next/image'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'products.view')) {
    return <AccessDenied role={userWithRole.role} />
  }

  // Next.js 15: searchParams is a Promise
  const resolvedSearchParams = await searchParams
  const searchQuery = resolvedSearchParams.q || ''

  const supabase = await createClient()

  // Build the product query
  let productsQuery = supabase.from('products').select('*, category:categories(name)').order('name')
  if (searchQuery) {
    productsQuery = productsQuery.ilike('name', `%${searchQuery}%`)
  }

  // Fetch settings, products, and categories concurrently
  const [
    { data: settings },
    { data: products },
    { data: categories }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    productsQuery,
    supabase.from('categories').select('id, name').order('name')
  ])

  const currencySymbol = settings?.currency_symbol || 'Rs.'

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Menu</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage what appears on the POS register.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <ProductSearch initialQuery={searchQuery} />
          </div>
          <div className="w-full sm:w-auto shrink-0">
            <AddProductButton categories={categories || []} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col">
          {/* Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider font-semibold">
            <div className="col-span-5">Product</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="divide-y divide-gray-200 text-gray-700">
            {products?.map((item) => (
              <div key={item.id} className="p-4 md:px-6 md:py-4 hover:bg-gray-50/80 transition-colors md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col space-y-0">
                
                {/* Product Name & Image (Always visible) */}
                <div className="md:col-span-5 font-medium text-gray-900 flex items-center space-x-4 mb-3 md:mb-0">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} width={56} height={56} className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">No Img</span>
                    </div>
                  )}
                  <span className="text-lg md:text-[15px] font-semibold text-gray-900 leading-snug">{item.name}</span>
                </div>

                {/* Mobile Info Box */}
                <div className="md:hidden bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-100 mb-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Category</span>
                    {/* @ts-ignore */}
                    <span className="text-gray-900 font-medium">{item.category?.name || 'Uncategorized'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Price</span>
                    <span className="text-gray-900 font-bold">{currencySymbol} {Number(item.base_price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Status</span>
                    {item.is_active ? (
                      <span className="inline-flex items-center text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4 mr-1.5" />Active</span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400 font-semibold"><XCircle className="w-4 h-4 mr-1.5" />Inactive</span>
                    )}
                  </div>
                </div>

                {/* Desktop Columns */}
                <div className="hidden md:flex md:col-span-2 text-gray-600 text-[14px] items-center">
                  {/* @ts-ignore */}
                  {item.category?.name || 'Uncategorized'}
                </div>

                <div className="hidden md:flex md:col-span-2 text-[14px] items-center">
                  <span className="font-semibold text-gray-900">{currencySymbol} {Number(item.base_price).toFixed(2)}</span>
                </div>

                <div className="hidden md:flex md:col-span-1 items-center justify-center">
                  {item.is_active ? (
                    <span className="inline-flex items-center text-green-600 space-x-1 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-gray-400 space-x-1 text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      <span>Inactive</span>
                    </span>
                  )}
                </div>

                {/* Actions (Always visible) */}
                <div className="md:col-span-2 flex justify-end space-x-2 pt-1 md:pt-0">
                  <ProductRowActions 
                    categories={categories || []}
                    item={{
                      id: item.id,
                      name: item.name,
                      category_id: item.category_id,
                      base_price: Number(item.base_price),
                      is_active: item.is_active,
                      image_url: item.image_url
                    }} 
                  />
                </div>
              </div>
            ))}
            
            {(!products || products.length === 0) && (
              <div className="p-8 text-center text-gray-500">
                No products found. Start by adding one!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
