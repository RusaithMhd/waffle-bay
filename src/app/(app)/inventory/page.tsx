import { createClient } from '@/lib/supabase/server'
import { RestockButton } from './RestockButton'
import { redirect } from 'next/navigation'
import { AlertTriangle, Plus, ArrowDownToLine } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('*')
    .order('name')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-2">Monitor stock levels and manage reordering.</p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors">
          <Plus className="w-5 h-5" />
          <span>New Purchase Order</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Item Name</th>
                <th className="p-4 font-semibold">SKU / Code</th>
                <th className="p-4 font-semibold">Current Stock</th>
                <th className="p-4 font-semibold">Unit</th>
                <th className="p-4 font-semibold">Reorder Level</th>
                <th className="p-4 font-semibold">Cost per Unit</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {ingredients?.map((item) => {
                const isLowStock = Number(item.current_stock) <= Number(item.reorder_level)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.name}</span>
                        {isLowStock && (
                          <span title="Low Stock"><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-gray-500">{item.id.split('-')[0]}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="p-4 text-sm">{item.unit}</td>
                    <td className="p-4 text-sm text-gray-500">{item.reorder_level}</td>
                    <td className="p-4 text-sm">Rs. {Number(item.cost_per_unit).toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <RestockButton ingredientId={item.id} costPerUnit={Number(item.cost_per_unit)} />
                    </td>
                  </tr>
                )
              })}
              {(!ingredients || ingredients.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No ingredients found in the database.
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
