import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PrinterConfigTab } from '@/app/(app)/settings/PrinterConfigTab'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'
import { AccessDenied } from '@/components/AccessDenied'
import { Printer } from 'lucide-react'

export const metadata = {
  title: 'Printer Settings | Waffle Bay',
  description: 'Connect and configure your receipt printer from the cashier interface.',
}

export default async function CashierSettingsPage() {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'cashier.settings')) {
    return <AccessDenied role={userWithRole.role} />
  }

  const supabase = await createClient()
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .single()

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
          <Printer className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Printer Settings</h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Connect and configure your Bluetooth receipt printer.
          </p>
        </div>
      </div>

      {/* Printer Config — identical to admin Settings → Printer tab */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        <PrinterConfigTab storeSettings={storeSettings} />
      </div>
    </div>
  )
}
