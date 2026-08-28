import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, ShoppingBag, PackageOpen, TrendingUp, Clock, ReceiptText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserWithRole } from '@/lib/auth'
import { ROLE_HOME, hasPermission } from '@/lib/rbac'

export default async function DashboardPage(props: { searchParams: Promise<{ period?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams?.period || 'today'
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  const { role } = userWithRole

  // Restricted roles should not reach the dashboard — redirect to their designated screen
  if (role && !hasPermission(role, 'dashboard')) {
    redirect(ROLE_HOME[role] || '/login')
  }

  const supabase = await createClient()
  const userName = userWithRole.email?.split('@')[0] || 'User'
  const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1)

  const today = new Date()
  today.setHours(0,0,0,0)

  let ordersQuery = supabase.from('orders').select('total, status').eq('status', 'PAID')
  if (period === 'today') {
    ordersQuery = ordersQuery.gte('created_at', today.toISOString())
  }

  // Fetch all dashboard data in parallel for maximum speed
  const [
    { data: settings },
    { data: ordersData },
    { data: recentOrdersData }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    ordersQuery,
    supabase.from('orders').select('order_number, total, status, created_at, order_type').order('created_at', { ascending: false }).limit(6)
  ])

  const currencySymbol = settings?.currency_symbol || 'Rs.'
  
  const totalSales = ordersData?.reduce((acc, order) => acc + Number(order.total), 0) || 0
  const totalOrders = ordersData?.length || 0
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0




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
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pb-1">
            <div className="text-sm text-slate-500 font-medium">
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              <Link 
                href="/?period=today"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Today
              </Link>
              <Link 
                href="/?period=all"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                All Time
              </Link>
            </div>
          </div>
        </header>

        {/* Main Grid: 3 Columns for Metrics, 1 Column for Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-col-reverse lg:flex-row">
          
          {/* Left Side: Metrics (col-span-3) */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Primary Metric - Revenue */}
              <div className="group relative bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-300/50 transition-all duration-300 flex flex-col justify-between h-[130px] sm:h-[140px] overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-start justify-between mb-2 relative z-10 gap-2">
                  <div className="flex items-center space-x-2 text-white/90">
                    <div className="p-1 sm:p-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg shrink-0">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-medium text-white tracking-wide leading-tight">Net Revenue</h2>
                  </div>
                  <span className="hidden sm:inline-flex shrink-0 items-center rounded-md bg-white/20 backdrop-blur-sm px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white border border-white/20">
                    {period === 'today' ? 'Today' : 'All Time'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 relative z-10 mt-1">
                  <span className="text-sm text-white/80 font-medium">{currencySymbol}</span>
                  <p className="text-lg sm:text-xl xl:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm break-all sm:break-normal">
                    {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Orders */}
              <div className="group relative bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-200/50 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-300 flex flex-col justify-between h-[130px] sm:h-[140px] overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-start justify-between mb-2 relative z-10 gap-2">
                  <div className="flex items-center space-x-2 text-white/90">
                    <div className="p-1 sm:p-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg shrink-0">
                      <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-medium text-white tracking-wide leading-tight">Total Orders</h2>
                  </div>
                </div>
                <p className="text-lg sm:text-xl xl:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm relative z-10 mt-1 break-all sm:break-normal">{totalOrders}</p>
              </div>

              {/* Average Order Value */}
              <div className="group relative bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200/50 rounded-2xl p-4 sm:p-5 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-300/50 transition-all duration-300 flex flex-col justify-between h-[130px] sm:h-[140px] overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-start justify-between mb-2 relative z-10 gap-2">
                  <div className="flex items-center space-x-2 text-white/90">
                    <div className="p-1 sm:p-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg shrink-0">
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-medium text-white tracking-wide leading-tight">Avg Value</h2>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1 relative z-10 mt-1">
                  <span className="text-sm text-white/80 font-medium">{currencySymbol}</span>
                  <p className="text-lg sm:text-xl xl:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm break-all sm:break-normal">
                    {averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>


            </div>

            {/* Recent Orders Section */}
            <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden mt-6">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-slate-50 text-slate-600 rounded-lg sm:rounded-xl">
                    <ReceiptText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Recent Orders</h3>
                </div>
                <Link href="/sales" className="text-xs sm:text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                  <thead className="bg-slate-50/50 text-slate-500">
                    <tr>
                      <th className="px-4 sm:px-6 py-2 sm:py-3 font-semibold">Order ID</th>
                      <th className="px-4 sm:px-6 py-2 sm:py-3 font-semibold">Time</th>
                      <th className="px-4 sm:px-6 py-2 sm:py-3 font-semibold hidden sm:table-cell">Type</th>
                      <th className="px-4 sm:px-6 py-2 sm:py-3 font-semibold">Status</th>
                      <th className="px-4 sm:px-6 py-2 sm:py-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrdersData && recentOrdersData.length > 0 ? (
                      recentOrdersData.map((order) => (
                        <tr key={order.order_number} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-900">
                            #{String(order.order_number).padStart(4, '0')}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                            <span className="text-slate-600 bg-slate-100 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium">
                              {order.order_type || 'Takeaway'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className={`px-2 sm:px-2.5 py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-slate-900 text-right">
                            {currencySymbol} {Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-slate-500">
                          No recent orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Side: Workspaces (col-span-1) */}
          <div className="lg:col-span-1 flex flex-col order-1 lg:order-2 mb-4 lg:mb-0">
            <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">Workspaces</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
              <Link href="/pos" className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-white border border-slate-200/60 shadow-sm rounded-xl sm:rounded-2xl hover:border-indigo-200 hover:shadow-md hover:ring-1 hover:ring-indigo-50 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-indigo-50 rounded-lg sm:rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Point of Sale</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium hidden sm:block">Process new orders</p>
                  </div>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-50 hidden sm:flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <span className="text-slate-400 group-hover:text-indigo-600 transition-colors">&rarr;</span>
                </div>
              </Link>
              
              <Link href="/kitchen" className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-white border border-slate-200/60 shadow-sm rounded-xl sm:rounded-2xl hover:border-emerald-200 hover:shadow-md hover:ring-1 hover:ring-emerald-50 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-emerald-50 rounded-lg sm:rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <PackageOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Kitchen Display</h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium hidden sm:block">Manage active orders</p>
                  </div>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-50 hidden sm:flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
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
