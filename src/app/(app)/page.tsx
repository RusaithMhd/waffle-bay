import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, PackageOpen, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Ensure auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userName = user.email?.split('@')[0] || 'Admin'
  const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1)

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
    <div className="min-h-screen bg-slate-50 w-full rounded-tl-xl md:rounded-tl-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Overview
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium pb-1">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Main Grid: 2 Columns for Metrics, 1 Column for Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side: Metrics (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Metric - Revenue */}
            <div className="group relative bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-slate-500 mb-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-700">Net Revenue</h2>
                </div>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  Today
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl text-slate-400 font-medium">{currencySymbol}</span>
                <p className="text-5xl font-bold tracking-tight text-slate-900">
                  {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Secondary Metrics - Side by Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Orders */}
              <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                <div className="flex items-center space-x-2 text-slate-500 mb-2">
                  <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-700">Total Orders</h2>
                </div>
                <p className="text-3xl font-bold tracking-tight text-slate-900">{totalOrders}</p>
              </div>

              {/* Stock Alerts */}
              <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between relative overflow-hidden">
                {lowStockCount > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full" />}
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700">Stock Alerts</h2>
                  </div>
                  {lowStockCount > 0 && (
                    <span className="flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between relative z-10">
                  <div className="flex items-baseline space-x-1">
                    <p className="text-3xl font-bold tracking-tight text-slate-900">{lowStockCount}</p>
                    <span className="text-xs text-slate-500 font-medium">items</span>
                  </div>
                  <Link href="/inventory" className="text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors flex items-center">
                    Review <span className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Workspaces (col-span-1) */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Workspaces</h2>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/pos" className="group flex items-center justify-between p-4 bg-white border border-slate-200/60 shadow-sm rounded-2xl hover:border-indigo-200 hover:shadow-md hover:ring-1 hover:ring-indigo-50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Point of Sale</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Process new orders</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">&rarr;</span>
                </div>
              </Link>
              
              <Link href="/kitchen" className="group flex items-center justify-between p-4 bg-white border border-slate-200/60 shadow-sm rounded-2xl hover:border-emerald-200 hover:shadow-md hover:ring-1 hover:ring-emerald-50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <PackageOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kitchen Display</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage active orders</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                  <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">&rarr;</span>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
