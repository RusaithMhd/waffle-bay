'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Calendar, ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, DollarSign, Receipt as ReceiptIcon, LayoutDashboard, ListOrdered } from 'lucide-react'
import { Receipt, ReceiptData } from '@/components/pos/Receipt'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function SalesClient({ orders, metrics, analytics, pagination, filters, currency }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(filters.search)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard')

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    
    // Reset page on filter change
    if (key !== 'page') params.set('page', '1')
    
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters('search', searchInput)
  }

  const handleRowClick = (order: any) => {
    // Reconstruct receipt format
    const receiptData: ReceiptData = {
      order_number: order.order_number,
      receipt_id: `INV-${String(order.order_number).padStart(6, '0')}`,
      kot_number: order.kot_number,
      business_date: order.business_date,
      created_at: order.created_at,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      items: order.order_items.map((i: any) => ({
        name: i.product_name_snapshot,
        quantity: i.quantity,
        price: Number(i.unit_price_snapshot),
        notes: i.notes,
        modifiers: i.order_item_modifiers.map((m: any) => ({
          name: m.modifier_name_snapshot,
          price: Number(m.modifier_price_snapshot)
        }))
      })),
      payments: order.payments.map((p: any) => ({
        payment_method: p.method,
        amount: Number(p.amount)
      }))
    }
    setSelectedReceipt(receiptData)
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        {/* Top controls: Date Picker + Quick periods */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full">
          {/* Date Picker Input */}
          <div className="flex-1 min-w-[140px] relative">
            <input 
              type="date" 
              value={filters.specificDate} 
              onChange={(e) => {
                if (e.target.value) {
                  updateFilters('period', 'custom')
                  updateFilters('date', e.target.value)
                } else {
                  updateFilters('date', '')
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm select-none cursor-pointer"
            />
          </div>

          {/* Quick Period Segmented Toggles */}
          <div className="flex bg-gray-100 p-1 rounded-2xl items-center flex-shrink-0 overflow-x-auto">
            <button 
              onClick={() => updateFilters('period', 'daily')} 
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                filters.period === 'daily' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Daily
            </button>
            <button 
              onClick={() => updateFilters('period', 'weekly')} 
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                filters.period === 'weekly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Weekly
            </button>
            <button 
              onClick={() => updateFilters('period', 'monthly')} 
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                filters.period === 'monthly' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Bottom control: Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by INV..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm"
          />
        </form>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 border-b border-gray-200 pb-px">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center px-2 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'dashboard' 
              ? 'border-[#FF6500] text-[#FF6500]' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <LayoutDashboard className="w-4.5 h-4.5 mr-2" />
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center px-2 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'transactions' 
              ? 'border-[#FF6500] text-[#FF6500]' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ListOrdered className="w-4.5 h-4.5 mr-2" />
          Transactions
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-xl"><DollarSign className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{currency} {metrics.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-xl"><ShoppingBag className="w-6 h-6 text-blue-600" /></div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalOrdersCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center space-x-4">
              <div className="bg-orange-100 p-3 rounded-xl"><TrendingUp className="w-6 h-6 text-orange-600" /></div>
              <div>
                <p className="text-gray-500 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{currency} {metrics.avgOrderValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="font-bold text-gray-900 mb-6">Revenue Trend</h3>
              <div className="h-72 w-full">
                {analytics.revenueTrend.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} tickFormatter={(value) => `${currency}${value}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${currency} ${Number(value || 0).toFixed(2)}`, 'Revenue']}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#FF6500" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Top Selling Products</h3>
                <div className="space-y-4">
                  {analytics.topProducts.length === 0 && <p className="text-gray-400 text-sm">No data available</p>}
                  {analytics.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 truncate pr-4">{i+1}. {p.name}</span>
                      <span className="text-sm font-bold text-gray-900 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">{p.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4">Least Selling Products</h3>
                <div className="space-y-4">
                  {analytics.leastProducts.length === 0 && <p className="text-gray-400 text-sm">No data available</p>}
                  {analytics.leastProducts.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 truncate pr-4">{i+1}. {p.name}</span>
                      <span className="text-sm font-bold text-gray-900 bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">{p.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mobile View: List of Cards */}
          <div className="block md:hidden space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-200 shadow-sm">
                No sales found for the selected criteria.
              </div>
            ) : (
              orders.map((order: any) => (
                <div 
                  key={order.id} 
                  onClick={() => handleRowClick(order)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:bg-orange-50/50 transition-colors flex flex-col space-y-3 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        <span>INV-{String(order.order_number).padStart(6, '0')}</span>
                        {order.kot_number && (
                          <span className="text-[10px] font-black text-orange-705 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded shadow-sm">
                            KOT-{String(order.kot_number).padStart(3, '0')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                        <p>
                          Business Date:{' '}
                          <span className="font-semibold text-gray-600">
                            {order.business_date ? new Date(order.business_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                          </span>
                        </p>
                        <p>Created: {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        order.order_type === 'TAKEAWAY' ? 'bg-purple-150 text-purple-700' : 'bg-blue-150 text-blue-700'
                      }`}>
                        {order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Dine In'}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        order.status === 'VOID' ? 'bg-red-100 text-red-700' :
                        order.status === 'REFUNDED' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">
                      Cashier: <span className="text-gray-700 font-semibold">{order.profiles?.first_name || 'System'}</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900 flex items-center">
                      {currency} {Number(order.total).toFixed(2)}
                      <ReceiptIcon className="w-4 h-4 ml-1.5 text-gray-400" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                    <th className="px-6 py-4 font-medium">INV Number</th>
                    <th className="px-6 py-4 font-medium">Date & Time</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Cashier</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No sales found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order: any) => (
                      <tr 
                        key={order.id} 
                        onClick={() => handleRowClick(order)}
                        className="hover:bg-orange-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          <div className="flex flex-col">
                            <span>INV-{String(order.order_number).padStart(6, '0')}</span>
                            {order.kot_number && (
                              <span className="text-[11px] font-black text-orange-700 mt-0.5">
                                KOT-{String(order.kot_number).padStart(3, '0')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex flex-col space-y-0.5">
                            <span className="font-semibold text-gray-700">
                              {order.business_date ? new Date(order.business_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              Created: {new Date(order.created_at).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            order.order_type === 'TAKEAWAY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Dine In'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                          {order.profiles?.first_name || 'System'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            order.status === 'PAID' ? 'bg-green-100 text-green-700' :
                            order.status === 'VOID' ? 'bg-red-100 text-red-700' :
                            order.status === 'REFUNDED' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                          {currency} {Number(order.total).toFixed(2)}
                          <ReceiptIcon className="w-4 h-4 inline ml-2 text-gray-300 group-hover:text-[#FF6500] transition-colors" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 sm:px-6 py-4 border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <span className="text-xs sm:text-sm text-gray-500">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total orders)
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => updateFilters('page', String(pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => updateFilters('page', String(pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipt Modal Overlay */}
      {selectedReceipt && (
        <Receipt data={selectedReceipt} onClose={() => setSelectedReceipt(null)} autoPrint={false} />
      )}
    </div>
  )
}
