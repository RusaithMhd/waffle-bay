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

export async function createStaffUser(payload: CreateStaffPayload) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      first_name: payload.firstName,
      last_name: payload.lastName,
    },
  })

  if (authError || !createdAuth.user) {
    return { success: false, error: authError?.message || 'Failed to create user' }
  }

  const newUserId = createdAuth.user.id

  await admin.from('profiles').upsert({
    id: newUserId,
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
  }, { onConflict: 'id' })

  const { error: roleError } = await admin.from('user_roles').upsert({
    user_id: newUserId,
    role_id: payload.roleId,
  }, { onConflict: 'user_id' })

  if (roleError) {
    await admin.from('user_roles').delete().eq('user_id', newUserId)
    await admin.from('user_roles').insert({ user_id: newUserId, role_id: payload.roleId })
  }

  revalidatePath('/settings')
  return { success: true, userId: newUserId }
}

export async function updateStaffUser(userId: string, firstName: string, lastName: string) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    }
  })

  if (authError) return { success: false, error: authError.message }

  const { error: profileError } = await admin.from('profiles').update({
    first_name: firstName,
    last_name: lastName
  }).eq('id', userId)

  if (profileError) return { success: false, error: profileError.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteStaffUser(userId: string) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { success: false, error: 'Unauthorized' }

  if (caller.id === userId) {
    return { success: false, error: 'Cannot delete your own account' }
  }

  const admin = createAdminClient()

  // Clean up related records (just in case cascade is not on)
  await admin.from('user_roles').delete().eq('user_id', userId)
  await admin.from('profiles').delete().eq('id', userId)

  const { error } = await admin.auth.admin.deleteUser(userId)
  
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
