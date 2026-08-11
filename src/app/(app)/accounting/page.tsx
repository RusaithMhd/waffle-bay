import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrendingUp, TrendingDown, DollarSign, Receipt, FileText } from 'lucide-react'

export default async function AccountingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single()
  const currencySymbol = settings?.currency_symbol || 'Rs.'

  // Fetch PL dataSummary
  const { data: plData } = await supabase
    .from('pl_summary_view')
    .select('*')
    .order('period', { ascending: false })
    .limit(1)
    .single()

  // Fetch Z-Reports (Recent Shifts)
  const { data: zReports } = await supabase
    .from('z_reports_view')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accounting & Finance</h1>
          <p className="text-gray-500 mt-2">Profit & Loss, Z-Reports, and Ledger summaries.</p>
        </div>
        <button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 font-medium transition-colors">
          <FileText className="w-5 h-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* P&L Overview */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-gray-400" />
          Current Period P&L
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm font-medium mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">{currencySymbol} {Number(plData?.total_revenue || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm font-medium mb-1">Cost of Goods Sold (COGS)</p>
          <p className="text-3xl font-bold text-red-600">{currencySymbol} {Number(plData?.total_cogs || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm font-medium mb-1">Operating Expenses</p>
          <p className="text-3xl font-bold text-red-600">{currencySymbol} {Number(plData?.operating_expenses || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-2xl shadow-sm">
          <p className="text-gray-400 text-sm font-medium mb-1">Net Profit</p>
          <p className="text-3xl font-bold text-white">{currencySymbol} {Number(plData?.net_profit || 0).toFixed(2)}</p>
        </div>
        </div>
      </div>

      {/* Z-Reports */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-gray-400" />
          Recent Shift Z-Reports
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Shift Opened</th>
                  <th className="p-4 font-semibold">Shift Closed</th>
                  <th className="p-4 font-semibold">Staff</th>
                  <th className="p-4 font-semibold text-right">Starting Cash</th>
                  <th className="p-4 font-semibold text-right">Cash Received</th>
                  <th className="p-4 font-semibold text-right">Total Sales</th>
                  <th className="p-4 font-semibold text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {zReports?.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">{new Date(report.opened_at).toLocaleString()}</td>
                    <td className="p-4 text-sm text-gray-500">{report.closed_at ? new Date(report.closed_at).toLocaleString() : 'Active'}</td>
                    <td className="p-4 text-sm text-gray-900">{report.profiles?.first_name || 'Unknown'}</td>
                    <td className="p-4 text-sm text-right">{currencySymbol} {Number(report.starting_cash).toFixed(2)}</td>
                    <td className="p-4 text-sm text-right text-green-600 font-medium">{currencySymbol} {Number(report.total_cash_received).toFixed(2)}</td>
                    <td className="p-4 text-sm text-right font-bold text-gray-900">{currencySymbol} {Number(report.total_sales).toFixed(2)}</td>
                    <td className="p-4 text-sm text-right">{report.total_orders}</td>
                  </tr>
                ))}
                {(!zReports || zReports.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      No shift records found. Open a shift in the POS to generate a Z-Report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}
