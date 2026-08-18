import { AppShell }        from '@/components/layout/AppShell'
import { createClient }    from '@/lib/supabase/server'
import { SettingsProvider } from '@/components/SettingsProvider'
import { AppRole }         from '@/lib/rbac'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const [
    { data: settings },
    { data: { user } }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    supabase.auth.getUser()
  ])

  // Resolve role once here; passed to AppShell so it can filter nav items
  let userRole: AppRole | null = null
  if (user) {
    const { data: userRoleRow } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single()
    userRole = ((userRoleRow?.roles as any)?.name?.toLowerCase() as AppRole) || null
  }

  const defaultSettings = {
    id: 1,
    store_name: 'Waffle Bay',
    store_address: '',
    currency_symbol: 'Rs.',
    tax_rate: 0,
    receipt_header: 'Welcome to Waffle Bay!',
    receipt_footer: 'Thank you for your business!',
    enable_discount: true,
    printer_transport: 'spp' as const,
    printer_ble_service_uuid: '0000fff0-0000-1000-8000-00805f9b34fb',
    printer_ble_characteristic_uuid: '0000fff1-0000-1000-8000-00805f9b34fb',
    printer_spp_service_class_uuid: '00001101-0000-1000-8000-00805f9b34fb',
    printer_spp_baud_rate: 9600,
    printer_paper_width: 80,
    printer_dots_per_line: 576,
    printer_characters_per_line: 48,
    printer_use_rasterization: true
  }

  return (
    <SettingsProvider settings={settings || defaultSettings}>
      <AppShell userRole={userRole}>{children}</AppShell>
    </SettingsProvider>
  )
}
