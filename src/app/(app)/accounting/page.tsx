import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, TrendingDown, DollarSign, Receipt, FileText, ArrowDownToLine, Wallet } from 'lucide-react'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission }          from '@/lib/rbac'
import { AccessDenied }           from '@/components/AccessDenied'
import { DatePickerFilter }       from './DatePickerFilter'
import { CashManagementModal }    from './CashManagementModal'

export default async function AccountingPage(props: { searchParams: Promise<{ period?: string, date?: string, zPage?: string, lPage?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams.period || (searchParams.date ? 'custom' : 'all')
  const specificDate = searchParams.date
  
  const zPage = parseInt(searchParams.zPage || '1')
  const lPage = parseInt(searchParams.lPage || '1')
  const PAGE_SIZE = 15

  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'accounting')) {
    return <AccessDenied role={userWithRole.role} />
  }

  const supabase = await createClient()

  let zReportsQuery = supabase.from('z_reports_view').select('*', { count: 'exact' }).order('opened_at', { ascending: false })
  let ledgerQuery = supabase.from('accounting_ledger').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  
  if (period === 'custom' && specificDate) {
    const [year, month, day] = specificDate.split('-').map(Number)
    const startOfDay = new Date(year, month - 1, day, 0,0,0,0)
    const endOfDay = new Date(year, month - 1, day, 23,59,59,999)
    zReportsQuery = zReportsQuery.gte('opened_at', startOfDay.toISOString()).lte('opened_at', endOfDay.toISOString())
    ledgerQuery = ledgerQuery.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString())
  } else if (period === 'daily') {
    zReportsQuery = zReportsQuery.gte('opened_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
    ledgerQuery = ledgerQuery.gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
  } else if (period === 'weekly') {
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)
    zReportsQuery = zReportsQuery.gte('opened_at', lastWeek.toISOString())
    ledgerQuery = ledgerQuery.gte('created_at', lastWeek.toISOString())
  } else if (period === 'monthly') {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    zReportsQuery = zReportsQuery.gte('opened_at', lastMonth.toISOString())
    ledgerQuery = ledgerQuery.gte('created_at', lastMonth.toISOString())
  } else if (period === 'yearly') {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    zReportsQuery = zReportsQuery.gte('opened_at', lastYear.toISOString())
    ledgerQuery = ledgerQuery.gte('created_at', lastYear.toISOString())
  }

  // Apply Pagination Ranges
  const zFrom = (zPage - 1) * PAGE_SIZE
  const zTo = zFrom + PAGE_SIZE - 1
  zReportsQuery = zReportsQuery.range(zFrom, zTo)

  const lFrom = (lPage - 1) * PAGE_SIZE
  const lTo = lFrom + PAGE_SIZE - 1
  ledgerQuery = ledgerQuery.range(lFrom, lTo)

  const [
    { data: settings },
    { data: plData },
    { data: zReports, error: zError, count: zCount },
    { data: ledgerEntries, error: lError, count: lCount },
    { data: profiles }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    supabase.from('pl_summary_view').select('*').order('period', { ascending: false }).limit(1).single(),
    zReportsQuery,
    ledgerQuery,
    supabase.from('profiles').select('id, first_name')
  ])
  
  const totalZPages = Math.ceil((zCount || 0) / PAGE_SIZE)
  const totalLPages = Math.ceil((lCount || 0) / PAGE_SIZE)


  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.first_name]))

  const currencySymbol = settings?.currency_symbol || 'Rs.'

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounting & Finance</h1>
          <p className="text-gray-500 mt-2">Profit & Loss and Ledger summaries.</p>
        </div>
        
        {zError && <div className="bg-red-100 text-red-700 p-2 rounded w-full my-2">Z-Error: {zError.message}</div>}
        {lError && <div className="bg-red-100 text-red-700 p-2 rounded w-full my-2">L-Error: {lError.message}</div>}

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full lg:w-auto">
          {/* Timeline Filter Controls */}
          <div className="flex flex-nowrap gap-1.5 bg-gray-100 p-1 rounded-2xl items-center w-full lg:w-auto overflow-x-auto hide-scrollbar">
            <div className="flex-shrink-0"><DatePickerFilter currentDate={specificDate} /></div>
            <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block flex-shrink-0"></div>
            <a href="/accounting?period=daily" className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${period === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Daily</a>
            <a href="/accounting?period=weekly" className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${period === 'weekly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Weekly</a>
            <a href="/accounting?period=monthly" className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${period === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Monthly</a>
            <a href="/accounting?period=yearly" className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${period === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Yearly</a>
            <a href="/accounting?period=all" className={`flex-shrink-0 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${period === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>All Time</a>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center w-full lg:w-auto">
            <div className="w-full sm:w-auto flex flex-col [&>button]:w-full">
              <CashManagementModal />
            </div>
            <a 
              href={`/api/export?type=ledger&period=${period}${specificDate ? '&date=' + specificDate : ''}`}
              className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center space-x-1.5 font-bold transition-all text-xs sm:text-sm w-full sm:w-auto"
            >
              <FileText className="w-4 h-4" />
              <span>Ledger (.xlsx)</span>
            </a>

          </div>
        </div>
      </div>

      {/* P&L Overview */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-gray-400" />
          Current Period P&L
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
              <p className="text-gray-600 text-sm font-bold">Total Revenue</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{currencySymbol} {Number(plData?.total_revenue || 0).toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg"><TrendingDown className="w-4 h-4" /></div>
              <p className="text-gray-600 text-sm font-bold">Cost of Goods Sold (COGS)</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{currencySymbol} {Number(plData?.total_cogs || 0).toFixed(2)}</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><ArrowDownToLine className="w-4 h-4" /></div>
              <p className="text-gray-600 text-sm font-bold">Operating Expenses</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{currencySymbol} {Number(plData?.operating_expenses || 0).toFixed(2)}</p>
          </div>
          
          <div className="bg-gray-900 p-5 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl"></div>
            <div className="flex items-center space-x-2 mb-2 relative z-10">
              <div className="p-1.5 bg-white/10 text-white rounded-lg"><Wallet className="w-4 h-4" /></div>
              <p className="text-gray-300 text-sm font-bold">Net Profit</p>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white relative z-10">{currencySymbol} {Number(plData?.net_profit || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>



      {/* Accounting Ledger */}
      <div className="pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-400" />
            Accounting Ledger
          </h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Date & Time</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Description</th>
                  <th className="p-4 font-semibold">Method</th>
                  <th className="p-4 font-semibold">Staff</th>
                  <th className="p-4 font-semibold text-right text-green-600">Debit (In)</th>
                  <th className="p-4 font-semibold text-right text-red-600">Credit (Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {ledgerEntries?.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {entry.transaction_type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium">{entry.description}</td>
                    <td className="p-4 text-sm text-gray-500 capitalize">{entry.payment_method.toLowerCase()}</td>
                    <td className="p-4 text-sm text-gray-900 font-medium">{profileMap[entry.cashier_id] || 'System'}</td>
                    <td className="p-4 text-sm text-right font-medium text-green-600">
                      {Number(entry.debit) > 0 ? `${currencySymbol} ${Number(entry.debit).toFixed(2)}` : '---'}
                    </td>
                    <td className="p-4 text-sm text-right font-medium text-red-600">
                      {Number(entry.credit) > 0 ? `${currencySymbol} ${Number(entry.credit).toFixed(2)}` : '---'}
                    </td>
                  </tr>
                ))}
                {(!ledgerEntries || ledgerEntries.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No ledger entries found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {ledgerEntries?.map((entry) => (
              <div key={entry.id} className="p-4 bg-white hover:bg-gray-50 flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 uppercase tracking-wide">
                      {entry.transaction_type}
                    </span>
                    <p className="text-gray-900 font-bold mt-1.5 text-sm leading-snug">{entry.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {Number(entry.debit) > 0 ? (
                      <p className="text-green-600 font-black text-sm">+{currencySymbol} {Number(entry.debit).toFixed(2)}</p>
                    ) : (
                      <p className="text-red-600 font-black text-sm">-{currencySymbol} {Number(entry.credit).toFixed(2)}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-end text-xs text-gray-500 pt-1 border-t border-gray-50">
                  <div className="space-y-1 mt-1">
                    <p className="flex items-center"><span className="w-10 inline-block font-medium text-gray-400">Date:</span> <span className="text-gray-700">{new Date(entry.created_at).toLocaleString()}</span></p>
                    <p className="flex items-center"><span className="w-10 inline-block font-medium text-gray-400">Staff:</span> <span className="text-gray-700 font-medium">{profileMap[entry.cashier_id] || 'System'}</span></p>
                  </div>
                  <div className="shrink-0">
                    <span className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-gray-500 font-semibold capitalize text-[11px]">{entry.payment_method.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!ledgerEntries || ledgerEntries.length === 0) && (
              <div className="p-8 text-center text-gray-500 text-sm">
                No ledger entries found for this period.
              </div>
            )}
          </div>

          {totalLPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{lFrom + 1}</span> to <span className="font-medium">{Math.min(lTo + 1, lCount || 0)}</span> of <span className="font-medium">{lCount}</span> results
              </div>
              <div className="flex space-x-2">
                <a 
                  href={`/accounting?period=${period}${specificDate ? `&date=${specificDate}` : ''}&zPage=${zPage}&lPage=${Math.max(1, lPage - 1)}`}
                  className={`px-3 py-1 text-sm rounded-md border border-gray-300 ${lPage <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-white bg-gray-100 text-gray-700'}`}
                >
                  Previous
                </a>
                <a 
                  href={`/accounting?period=${period}${specificDate ? `&date=${specificDate}` : ''}&zPage=${zPage}&lPage=${Math.min(totalLPages, lPage + 1)}`}
                  className={`px-3 py-1 text-sm rounded-md border border-gray-300 ${lPage >= totalLPages ? 'opacity-50 pointer-events-none' : 'hover:bg-white bg-gray-100 text-gray-700'}`}
                >
                  Next
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
