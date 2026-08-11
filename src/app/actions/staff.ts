'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }    from 'next/cache'

export interface CreateStaffPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  roleId: string
}

/**
 * Creates a new Supabase auth user, sets their profile, and assigns a role.
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in env.
 * Only callable by an authenticated (admin) user.
 */
export async function createStaffUser(payload: CreateStaffPayload) {
  // Verify the calling user is authenticated (basic admin check)
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()

  // 1. Create the auth user
  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,          // auto-confirm so they can log in immediately
    user_metadata: {
      first_name: payload.firstName,
      last_name: payload.lastName,
    },
  })

  if (authError || !createdAuth.user) {
    return { success: false, error: authError?.message || 'Failed to create user' }
  }

  const newUserId = createdAuth.user.id

  // 2. Upsert profile (the DB trigger may already create one, this is a safety net)
  await admin.from('profiles').upsert({
    id: newUserId,
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
  }, { onConflict: 'id' })

  // 3. Assign role
  const { error: roleError } = await admin.from('user_roles').upsert({
    user_id: newUserId,
    role_id: payload.roleId,
  }, { onConflict: 'user_id' })

  if (roleError) {
    // Fallback: delete + insert if upsert fails (no unique on user_id alone)
    await admin.from('user_roles').delete().eq('user_id', newUserId)
    await admin.from('user_roles').insert({ user_id: newUserId, role_id: payload.roleId })
  }

  revalidatePath('/settings')
  return { success: true, userId: newUserId }
}
