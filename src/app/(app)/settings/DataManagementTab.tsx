'use client'

import { useState } from 'react'
import { clearSalesData, clearAccountingData, clearLogs, verifyAdminPassword } from '@/app/actions/data-management'
import toast from 'react-hot-toast'
import { Trash2, AlertTriangle, TerminalSquare, RefreshCcw, Database, ShieldCheck, Download, HardDrive } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export function DataManagementTab() {
  const [isClearingSales, setIsClearingSales] = useState(false)
  const [isClearingAccounts, setIsClearingAccounts] = useState(false)
  const [isClearingLogs, setIsClearingLogs] = useState(false)
  const [deleteType, setDeleteType] = useState<'sales' | 'accounts' | 'logs' | null>(null)

  const handleClearSales = async (password?: string) => {
    if (!password) {
      toast.error('Password is required')
      return
    }
    setIsClearingSales(true)
    try {
      await verifyAdminPassword(password)
      await clearSalesData()
      toast.success('Sales data cleared successfully')
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear sales data')
    } finally {
      setIsClearingSales(false)
      setDeleteType(null)
    }
  }

  const handleClearAccounts = async (password?: string) => {
    if (!password) {
      toast.error('Password is required')
      return
    }
    setIsClearingAccounts(true)
    try {
      await verifyAdminPassword(password)
      await clearAccountingData()
      toast.success('Accounting data cleared successfully')
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear accounting data')
    } finally {
      setIsClearingAccounts(false)
      setDeleteType(null)
    }
  }

  const handleClearLogs = async (password?: string) => {
    if (!password) {
      toast.error('Password is required')
      return
    }
    setIsClearingLogs(true)
    try {
      await verifyAdminPassword(password)
      await clearLogs()
      toast.success('Logs cleared successfully')
    } catch (e: any) {
      toast.error(e.message || 'Failed to clear logs')
    } finally {
      setIsClearingLogs(false)
      setDeleteType(null)
    }
  }

  const isDataWipeAllowed = process.env.NEXT_PUBLIC_ALLOW_DATA_WIPE === 'true'

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => {
            window.location.href = '/api/export?type=backup'
          }}
          className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition-all active:scale-[0.98]"
        >
          Backup All Data
        </button>
      </div>

      {isDataWipeAllowed && (
        <>
          <div className="mb-6 border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">DANGER ZONE</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    The actions on this page are irreversible. Deleted data cannot be recovered. 
                    This section should only be used to clear test data before going into production.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sales Data */}
            <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-900 text-[16px]">Clear Sales Data</h3>
                </div>
              </div>
              <div className="p-5 flex-1 bg-white flex flex-col justify-between">
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Deletes all POS orders, Kitchen orders, Payments, and Cash Register Shifts. Product configurations, categories, and settings will remain intact.
                </p>
                <button
                  onClick={() => setDeleteType('sales')}
                  disabled={isClearingSales}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 font-bold py-3 px-4 border border-red-200 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isClearingSales ? 'Clearing...' : 'Clear All Sales'}
                </button>
              </div>
            </div>

            {/* Accounting Data */}
            <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-900 text-[16px]">Clear Accounting Data</h3>
                </div>
              </div>
              <div className="p-5 flex-1 bg-white flex flex-col justify-between">
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Deletes all journal entries, general ledger records, and expenses. The chart of accounts structure will remain intact.
                </p>
                <button
                  onClick={() => setDeleteType('accounts')}
                  disabled={isClearingAccounts}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 font-bold py-3 px-4 border border-red-200 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isClearingAccounts ? 'Clearing...' : 'Clear All Accounting'}
                </button>
              </div>
            </div>

            {/* System Logs */}
            <div className="border border-red-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-900 text-[16px]">Clear Logs</h3>
                </div>
              </div>
              <div className="p-5 flex-1 bg-white flex flex-col justify-between">
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Deletes all system audit logs and KOT audit logs. This removes the trail of user actions.
                </p>
                <button
                  onClick={() => setDeleteType('logs')}
                  disabled={isClearingLogs}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 font-bold py-3 px-4 border border-red-200 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isClearingLogs ? 'Clearing...' : 'Clear All Logs'}
                </button>
              </div>
            </div>

          </div>
        </>
      )}

      {!isDataWipeAllowed && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 mt-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Production Data Protected</h2>
          <p className="text-gray-500 max-w-lg mb-8 text-[15px] leading-relaxed">
            Your store is currently running in production mode. Destructive actions like data wiping have been securely disabled to prevent accidental data loss.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col items-center transition-all hover:bg-gray-100 hover:shadow-sm">
              <Database className="h-6 w-6 text-gray-400 mb-3" />
              <h4 className="font-semibold text-gray-800 text-sm">Sales & Orders</h4>
              <p className="text-xs text-gray-500 mt-1">Safely Preserved</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col items-center transition-all hover:bg-gray-100 hover:shadow-sm">
              <HardDrive className="h-6 w-6 text-gray-400 mb-3" />
              <h4 className="font-semibold text-gray-800 text-sm">Accounting</h4>
              <p className="text-xs text-gray-500 mt-1">Safely Preserved</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col items-center transition-all hover:bg-gray-100 hover:shadow-sm">
              <Download className="h-6 w-6 text-gray-400 mb-3" />
              <h4 className="font-semibold text-gray-800 text-sm">Full Backups</h4>
              <p className="text-xs text-gray-500 mt-1">Available On-Demand</p>
            </div>
          </div>
        </div>
      )}

      {deleteType === 'sales' && (
        <ConfirmDialog
          title="Clear Sales Data"
          message="This will permanently delete all sales orders, items, payments, and shifts. Are you absolutely sure?"
          confirmText="Delete Sales Data"
          onConfirm={handleClearSales}
          onCancel={() => setDeleteType(null)}
          isDestructive={true}
          requirePassword={true}
        />
      )}

      {deleteType === 'accounts' && (
        <ConfirmDialog
          title="Clear Accounting Data"
          message="This will permanently delete all journal entries, accounting ledgers, and expenses. Are you absolutely sure?"
          confirmText="Delete Accounting Data"
          onConfirm={handleClearAccounts}
          onCancel={() => setDeleteType(null)}
          isDestructive={true}
          requirePassword={true}
        />
      )}

      {deleteType === 'logs' && (
        <ConfirmDialog
          title="Clear System Logs"
          message="This will permanently delete all system audit logs and KOT audit logs. Are you absolutely sure?"
          confirmText="Delete Logs"
          onConfirm={handleClearLogs}
          onCancel={() => setDeleteType(null)}
          isDestructive={true}
          requirePassword={true}
        />
      )}
    </div>
  )
}
