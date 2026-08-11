import { createClient } from '@/lib/supabase/server'
import { AddProductButton, ProductRowActions } from './ProductActions'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'

export default async function ProductsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch products and categories
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name)
    `)
    .order('name')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products Menu</h1>
          <p className="text-gray-500 mt-2">Manage what appears on the POS register.</p>
        </div>
        <AddProductButton categories={categories || []} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Product Name</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Base Price</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {products?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {/* @ts-ignore - Supabase type narrowing */}
                    {item.category?.name || 'Uncategorized'}
                  </td>
                  <td className="p-4 text-sm">Rs. {Number(item.base_price).toFixed(2)}</td>
                  <td className="p-4 text-center">
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
                  </td>
                  <td className="p-4 text-right">
                    <ProductRowActions 
                      categories={categories || []}
                      item={{
                        id: item.id,
                        name: item.name,
                        category_id: item.category_id,
                        base_price: Number(item.base_price),
                        is_active: item.is_active
                      }} 
                    />
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No products found. Start by adding one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
