import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, PackageOpen, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Ensure auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()
  today.setHours(0,0,0,0)

  // Fetch all dashboard data in parallel for maximum speed
  const [
    { data: settings },
    { data: ordersData },
    { data: lowStockData }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    supabase.from('orders').select('total, status').gte('created_at', today.toISOString()).eq('status', 'PAID'),
    supabase.from('ingredients').select('*').lte('current_stock', 500)
  ])

  const currencySymbol = settings?.currency_symbol || 'Rs.'
  
  const totalSales = ordersData?.reduce((acc, order) => acc + Number(order.total), 0) || 0
  const totalOrders = ordersData?.length || 0

  const lowStockCount = lowStockData?.filter(item => Number(item.current_stock) <= Number(item.reorder_level))?.length || 0

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-2">Overview of your business metrics today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">Today's Revenue</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{currencySymbol} {totalSales.toFixed(2)}</p>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-600">Total Orders</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalOrders}</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 ring-1 ring-red-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-red-600">Low Stock Alerts</h3>
            </div>
            {lowStockCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                Action Required
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-4">{lowStockCount} Items</p>
          <Link href="/inventory" className="text-sm font-medium text-red-600 hover:text-red-500 flex items-center">
            View Inventory <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/pos" className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl shadow-sm flex items-center justify-center space-x-2 font-medium transition-colors">
            <ShoppingBag className="w-5 h-5" />
            <span>Launch POS</span>
          </Link>
          <Link href="/kitchen" className="bg-gray-900 hover:bg-gray-800 text-white p-4 rounded-xl shadow-sm flex items-center justify-center space-x-2 font-medium transition-colors">
            <PackageOpen className="w-5 h-5" />
            <span>Kitchen Display</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
