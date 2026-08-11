import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KitchenApp } from '@/components/kitchen/KitchenApp'

export default async function KitchenPage() {
  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Realtime app runs entirely on the client
  return (
    <main className="h-screen bg-gray-900 overflow-hidden">
      <KitchenApp />
    </main>
  )
}
