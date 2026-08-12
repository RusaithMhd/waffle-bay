import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { AccessDenied } from '@/components/AccessDenied'
import { SalesClient } from './SalesClient'

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

  // 1. Build Orders Query for the table
  let ordersQuery = supabase
    .from('orders')
    .select(`
      id, order_number, status, total, subtotal, tax, discount, created_at,
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
    .select('id, total, status')
    
  // Apply Search Filter (INV Number)
  if (search) {
    const invNumber = search.replace(/\D/g, '') // strip non-digits for order_number search
    if (invNumber) {
      ordersQuery = ordersQuery.eq('order_number', parseInt(invNumber))
      metricsQuery = metricsQuery.eq('order_number', parseInt(invNumber))
    }
  }

  // Apply Date Filters
  if (period === 'custom' && specificDate) {
    const [year, month, day] = specificDate.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0,0,0,0).toISOString()
    const endOfDay = new Date(year, month - 1, day, 23,59,59,999).toISOString()
    ordersQuery = ordersQuery.gte('created_at', startOfDay).lte('created_at', endOfDay)
    metricsQuery = metricsQuery.gte('created_at', startOfDay).lte('created_at', endOfDay)
  } else if (period === 'daily') {
    const startOfDay = new Date(new Date().setHours(0,0,0,0)).toISOString()
    ordersQuery = ordersQuery.gte('created_at', startOfDay)
    metricsQuery = metricsQuery.gte('created_at', startOfDay)
  } else if (period === 'weekly') {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    ordersQuery = ordersQuery.gte('created_at', lastWeek.toISOString())
    metricsQuery = metricsQuery.gte('created_at', lastWeek.toISOString())
  } else if (period === 'monthly') {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    ordersQuery = ordersQuery.gte('created_at', lastMonth.toISOString())
    metricsQuery = metricsQuery.gte('created_at', lastMonth.toISOString())
  } else if (period === 'yearly') {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    ordersQuery = ordersQuery.gte('created_at', lastYear.toISOString())
    metricsQuery = metricsQuery.gte('created_at', lastYear.toISOString())
  }

  // Fetch Settings
  const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single()

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
        pagination={{ page, totalPages, totalCount: totalCount || 0 }}
        filters={{ period, specificDate: specificDate || '', search }}
        currency={settings?.currency_symbol || 'Rs.'}
      />
    </div>
  )
}
