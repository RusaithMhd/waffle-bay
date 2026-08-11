import { AppShell } from "@/components/layout/AppShell";
import { createClient } from '@/lib/supabase/server'
import { SettingsProvider } from '@/components/SettingsProvider'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single()

  const defaultSettings = {
    id: 1,
    store_name: 'Waffle Bay',
    store_address: '',
    currency_symbol: 'Rs.',
    tax_rate: 0,
    receipt_header: 'Welcome to Waffle Bay!',
    receipt_footer: 'Thank you for your business!'
  }

  return (
    <SettingsProvider settings={settings || defaultSettings}>
      <AppShell>{children}</AppShell>
    </SettingsProvider>
  )
}
