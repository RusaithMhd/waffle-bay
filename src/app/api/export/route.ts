import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

export async function GET(request: Request) {
  const user = await getCurrentUserWithRole()
  if (!user || !hasPermission(user.role, 'accounting')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'ledger' or 'z-reports'
  const period = searchParams.get('period') || 'all'
  const specificDate = searchParams.get('date')

  const supabase = await createClient()

  let query
  
  if (type === 'z-reports') {
    query = supabase.from('z_reports_view').select('*').order('opened_at', { ascending: false })
  } else {
    // Default to ledger
    query = supabase.from('accounting_ledger').select('*').order('created_at', { ascending: false })
  }

  // Apply filters identically to the accounting page
  if (period === 'custom' && specificDate) {
    const [year, month, day] = specificDate.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0,0,0,0)
    const endOfDay = new Date(year, month - 1, day, 23,59,59,999)
    query = query.gte(type === 'z-reports' ? 'opened_at' : 'created_at', startOfDay.toISOString()).lte(type === 'z-reports' ? 'opened_at' : 'created_at', endOfDay.toISOString())
  } else if (period === 'daily') {
    query = query.gte(type === 'z-reports' ? 'opened_at' : 'created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
  } else if (period === 'weekly') {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    query = query.gte(type === 'z-reports' ? 'opened_at' : 'created_at', lastWeek.toISOString())
  } else if (period === 'monthly') {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    query = query.gte(type === 'z-reports' ? 'opened_at' : 'created_at', lastMonth.toISOString())
  } else if (period === 'yearly') {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    query = query.gte(type === 'z-reports' ? 'opened_at' : 'created_at', lastYear.toISOString())
  }

  const { data, error } = await query

  if (error || !data) {
    return new NextResponse('Error fetching data: ' + error?.message, { status: 500 })
  }

  if (data.length === 0) {
    return new NextResponse('No data found for the selected period.', { status: 404 })
  }

  // Convert to CSV
  let csv = ''
  
  if (type === 'z-reports') {
    // Z-Reports CSV Headers
    csv += 'Shift ID,Opened At,Closed At,Cashier Name,Expected Cash,Actual Cash,Difference,Card Total,Total Sales\n'
    data.forEach(row => {
      csv += `${row.id},${row.opened_at},${row.closed_at || 'Active'},"${row.cashier_name || ''}",${row.expected_cash},${row.actual_cash || 0},${row.difference || 0},${row.total_card},${row.total_sales}\n`
    })
  } else {
    // Ledger CSV Headers
    csv += 'Date,Type,Description,Reference,Debit,Credit,Balance\n'
    data.forEach(row => {
      // Escape description if it contains commas
      const desc = `"${(row.description || '').replace(/"/g, '""')}"`
      const ref = `"${(row.reference_id || '').replace(/"/g, '""')}"`
      csv += `${row.created_at},${row.transaction_type},${desc},${ref},${row.debit_amount},${row.credit_amount},${row.balance_after}\n`
    })
  }

  const fileName = `waffle_bay_${type}_${period}${specificDate ? '_' + specificDate : ''}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}
