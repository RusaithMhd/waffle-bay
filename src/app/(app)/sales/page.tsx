import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { AccessDenied } from '@/components/AccessDenied'
import { SalesClient } from '@/app/(app)/sales/SalesClient'
import { getBusinessDate } from '@/lib/dateUtils'

export default async function SalesPage(props: { searchParams: Promise<{ period?: string, date?: string, search?: string, page?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams.period || (searchParams.date ? 'custom' : 'daily')
  const specificDate = searchParams.date
  const search = searchParams.search || ''
  const page = parseInt(searchParams.page || '1')
  const PAGE_SIZE = 20

  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'sales')) {
    return <AccessDenied role={userWithRole.role} />
  }

  const supabase = await createClient()

  // Fetch Settings (to get store timezone)
  const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single()
  const timezone = settings?.timezone || 'Asia/Colombo'

  // 1. Build Orders Query for the table
  let ordersQuery = supabase
    .from('orders')
    .select(`
      id, order_number, kot_number, business_date, status, total, subtotal, tax, discount, discount_type, discount_value, order_type, created_at,
      profiles:cashier_id ( first_name ),
      payments ( method, amount ),
      order_items (
        product_name_snapshot, quantity, unit_price_snapshot, subtotal,
        order_item_modifiers ( modifier_name_snapshot, modifier_price_snapshot )
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // 2. Build Metrics Query (we fetch without pagination to calculate totals)
  let metricsQuery = supabase
    .from('orders')
    .select(`
      id, total, status, created_at, business_date,
      order_items (
        product_name_snapshot,
        quantity
      )
    `)
    
  // Apply Search Filter (INV Number)
  if (search) {
    const invNumber = search.replace(/\D/g, '') // strip non-digits for order_number search
    if (invNumber) {
      ordersQuery = ordersQuery.eq('order_number', parseInt(invNumber))
      metricsQuery = metricsQuery.eq('order_number', parseInt(invNumber))
    }
  }

  // Calculate Business Dates for filters
  const today = new Date()
  const currentBusinessDate = getBusinessDate(today, timezone)

  // Apply Date Filters based on Business Date
  if (period === 'custom' && specificDate) {
    ordersQuery = ordersQuery.eq('business_date', specificDate)
    metricsQuery = metricsQuery.eq('business_date', specificDate)
  } else if (period === 'daily') {
    ordersQuery = ordersQuery.eq('business_date', currentBusinessDate)
    metricsQuery = metricsQuery.eq('business_date', currentBusinessDate)
  } else if (period === 'weekly') {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    const startBusinessDate = getBusinessDate(lastWeek, timezone)
    ordersQuery = ordersQuery.gte('business_date', startBusinessDate)
    metricsQuery = metricsQuery.gte('business_date', startBusinessDate)
  } else if (period === 'monthly') {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const startBusinessDate = getBusinessDate(lastMonth, timezone)
    ordersQuery = ordersQuery.gte('business_date', startBusinessDate)
    metricsQuery = metricsQuery.gte('business_date', startBusinessDate)
  } else if (period === 'yearly') {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    const startBusinessDate = getBusinessDate(lastYear, timezone)
    ordersQuery = ordersQuery.gte('business_date', startBusinessDate)
    metricsQuery = metricsQuery.gte('business_date', startBusinessDate)
  }

  // Apply Pagination to Table Query
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  ordersQuery = ordersQuery.range(from, to)

  const [
    { data: orders, count: totalCount, error },
    { data: metricsData }
  ] = await Promise.all([
    ordersQuery,
    metricsQuery
  ])

  const totalPages = Math.ceil((totalCount || 0) / PAGE_SIZE)

  // Calculate Metrics
  const validMetrics = (metricsData || []).filter(o => o.status === 'PAID')
  const totalRevenue = validMetrics.reduce((sum, o) => sum + Number(o.total), 0)
  const totalOrdersCount = validMetrics.length
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

  // Analytics: Top / Least Products
  const productSales: Record<string, number> = {}
  validMetrics.forEach(order => {
    (order.order_items || []).forEach((item: any) => {
      const name = item.product_name_snapshot
      productSales[name] = (productSales[name] || 0) + item.quantity
    })
  })

  const sortedProducts = Object.entries(productSales)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    
  const topProducts = sortedProducts.slice(0, 5)
  // Ensure we don't duplicate if there are less than 10 products total
  const leastProducts = sortedProducts.slice(-5).reverse().filter(p => !topProducts.find(t => t.name === p.name) || sortedProducts.length <= 5)

  // Analytics: Revenue Trend
  const trendDataMap = new Map<string, number>()
  validMetrics.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  
  validMetrics.forEach(order => {
    let key = ''
    if (period === 'daily') {
      const date = new Date(order.created_at)
      key = date.toLocaleTimeString([], { hour: '2-digit', hour12: true }) // e.g., "10 AM"
    } else if (order.business_date) {
      // Parse business_date string and format it
      const [y, m, d] = order.business_date.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      key = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) // e.g., "Aug 12"
    } else {
      const date = new Date(order.created_at)
      key = date.toLocaleDateString([], { month: 'short', day: 'numeric' }) // e.g., "Aug 12"
    }
    trendDataMap.set(key, (trendDataMap.get(key) || 0) + Number(order.total))
  })
  
  const revenueTrend = Array.from(trendDataMap.entries()).map(([time, revenue]) => ({ time, revenue }))

  const analytics = {
    topProducts,
    leastProducts,
    revenueTrend
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-500 mt-2">View all sales, search by INV, and filter by date.</p>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-2 rounded">Error loading sales: {error.message}</div>}

      <SalesClient 
        orders={orders || []} 
        metrics={{ totalRevenue, totalOrdersCount, avgOrderValue }}
        analytics={analytics}
        pagination={{ page, totalPages, totalCount: totalCount || 0 }}
        filters={{ period, specificDate: specificDate || '', search }}
        currency={settings?.currency_symbol || 'Rs.'}
      />
    </div>
  )
}
