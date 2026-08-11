import { createClient } from '@/lib/supabase/server'
import { AddToppingButton, ToppingsRowActions, ToppingItem } from './ToppingsActions'
import { redirect } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ToppingsPage() {
  const supabase = await createClient()

  // Ensure user has permission
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole || (userWithRole.role !== 'admin' && userWithRole.role !== 'manager')) {
    redirect('/')
  }

  // Fetch the "Toppings" group and its modifiers
  const { data: group } = await supabase
    .from('modifier_groups')
    .select('id, modifiers(*)')
    .eq('name', 'Toppings')
    .single()

  const toppings: ToppingItem[] = group?.modifiers || []
  
  // Sort alphabetically
  toppings.sort((a, b) => a.name.localeCompare(b.name))

  const { data: settings } = await supabase.from('store_settings').select('currency_symbol').eq('id', 1).single()
  const currencySymbol = settings?.currency_symbol || 'Rs.'

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Toppings Menu</h1>
          <p className="text-gray-500 mt-2">Manage the global toppings available in the POS.</p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <AddToppingButton />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {toppings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No toppings found. Create one to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Topping Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {toppings.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {currencySymbol} {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <ToppingsRowActions item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
