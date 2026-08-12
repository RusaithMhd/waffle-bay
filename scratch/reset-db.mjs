import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDb() {
  console.log('Fetching admin profiles...');
  const { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'admin').single();
  const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role_id', adminRole.id);
  const adminIds = admins?.map(a => a.user_id) || [];
  
  if (adminIds.length > 0) {
    console.log('Admin IDs to keep:', adminIds);
    
    // Get all users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (users && users.users) {
      const nonAdmins = users.users.filter(u => !adminIds.includes(u.id));
      console.log(`Found ${nonAdmins.length} non-admin users to delete.`);
      
      for (const u of nonAdmins) {
        console.log(`Deleting user ${u.email}...`);
        // Deleting from auth.users will cascade to public.profiles and public.user_roles
        const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
        if (delError) {
          console.error(`Failed to delete user ${u.id}:`, delError);
        } else {
          console.log(`✅ Deleted user ${u.email}`);
        }
      }
    }
  } else {
    console.warn('⚠️ No admins found! Not deleting any users to prevent lockout.');
  }

  console.log('🎉 Database Reset Complete!');
}

resetDb();
