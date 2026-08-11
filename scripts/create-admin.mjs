import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
  const email = 'admin@wafflebay.com'
  const password = 'password123'
  
  console.log('Checking for existing user...')
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers()
  let user = usersData?.users.find(u => u.email === email)
  
  if (!user) {
    console.log('Creating admin user...')
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: 'Super', last_name: 'Admin' }
    })
    if (error) throw error
    user = data.user
  } else {
    console.log('User already exists, updating password...')
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
  }
  
  if (!user) throw new Error('User not found or created')

  // Make sure admin role exists
  console.log('Ensuring roles exist...')
  const roles = ['admin', 'manager', 'cashier', 'chef']
  for (const role of roles) {
    await admin.from('roles').upsert({ name: role }, { onConflict: 'name' })
  }
  
  const { data: adminRole } = await admin.from('roles').select('id').eq('name', 'admin').single()
  
  if (!adminRole) throw new Error('Admin role not found')

  console.log('Updating profile and role...')
  await admin.from('profiles').upsert({
    id: user.id,
    email,
    first_name: 'Super',
    last_name: 'Admin'
  })
  
  await admin.from('user_roles').upsert({
    user_id: user.id,
    role_id: adminRole.id
  }, { onConflict: 'user_id' })
  
  console.log('Admin user setup complete! Email: admin@wafflebay.com, Password: password123')
}

createAdmin().catch(console.error)
