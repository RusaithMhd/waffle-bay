import { redirect } from 'next/navigation'
import { KitchenApp } from '@/components/kitchen/KitchenApp'
import { getCurrentUserWithRole } from '@/lib/auth'
import { hasPermission }          from '@/lib/rbac'
import { AccessDenied }           from '@/components/AccessDenied'

export default async function KitchenPage() {
  const userWithRole = await getCurrentUserWithRole()
  if (!userWithRole) redirect('/login')

  if (!hasPermission(userWithRole.role, 'kitchen')) {
    return <AccessDenied role={userWithRole.role} />
  }

  // Realtime app runs entirely on the client
  return (
    <div className="h-full">
      <KitchenApp />
    </div>
  )
}
