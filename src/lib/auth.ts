/**
 * Server-side auth helper.
 * Call getCurrentUserWithRole() in any Server Component or Server Action
 * to get the authenticated user and their resolved role in a single DB round-trip.
 */
import { createClient } from '@/lib/supabase/server'
import { AppRole }      from '@/lib/rbac'

export interface UserWithRole {
  id:    string
  email: string
  role:  AppRole | null
}

export async function getCurrentUserWithRole(): Promise<UserWithRole | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch the user's role via user_roles → roles join
  const { data: userRoleRow } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const roleName = (userRoleRow?.roles as any)?.name?.toLowerCase() as AppRole | null

  return {
    id:    user.id,
    email: user.email || '',
    role:  roleName,
  }
}
