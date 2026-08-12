'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Calendar, ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, DollarSign, Receipt as ReceiptIcon } from 'lucide-react'
import { Receipt, ReceiptData } from '@/components/pos/Receipt'

export function SalesClient({ orders, metrics, pagination, filters, currency }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(filters.search)
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null)

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

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between items-center gap-4">
        {/* Date Filters */}
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl items-center w-full lg:w-auto overflow-x-auto">
          <div className="flex-shrink-0">
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
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm"
            />
          </div>
          <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block flex-shrink-0"></div>
          <button onClick={() => updateFilters('period', 'daily')} className={`flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filters.period === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Daily</button>
          <button onClick={() => updateFilters('period', 'weekly')} className={`flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filters.period === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Weekly</button>
          <button onClick={() => updateFilters('period', 'monthly')} className={`flex-shrink-0 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filters.period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Monthly</button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by INV..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
          />
        </form>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                <th className="px-6 py-4 font-medium">INV Number</th>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Cashier</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                      INV-{String(order.order_number).padStart(6, '0')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
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
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
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

      {/* Receipt Modal Overlay */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
            <Receipt data={selectedReceipt} onClose={() => setSelectedReceipt(null)} autoPrint={false} />
          </div>
        </div>
      )}
    </div>
  )
}
