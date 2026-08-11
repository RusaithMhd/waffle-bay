import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StoreConfigTab } from './StoreConfigTab'
import { CategoriesTab } from './CategoriesTab'
import { StaffTab } from './StaffTab'
import { SettingsTabs } from './SettingsTabs'

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab } = await searchParams
  const activeTab = tab || 'store'

  // Fetch data concurrently for the tabs
  const [
    { data: storeSettings },
    { data: categories },
    { data: profiles },
    { data: roles },
    { data: userRoles }
  ] = await Promise.all([
    supabase.from('store_settings').select('*').eq('id', 1).single(),
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('profiles').select('*').order('first_name'),
    supabase.from('roles').select('*').order('name'),
    supabase.from('user_roles').select('*')
  ])

  // Map user profiles to include their active role
  const staffWithRoles = profiles?.map(p => {
    const userRole = userRoles?.find(ur => ur.user_id === p.id)
    return {
      ...p,
      role_id: userRole?.role_id || null
    }
  }) || []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your store, menu structure, and staff.</p>
      </div>

      <SettingsTabs activeTab={activeTab} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
        {activeTab === 'store' && (
          <StoreConfigTab settings={storeSettings} />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab categories={categories || []} />
        )}
        {activeTab === 'staff' && (
          <StaffTab staff={staffWithRoles} roles={roles || []} />
        )}
      </div>
    </div>
  )
}
