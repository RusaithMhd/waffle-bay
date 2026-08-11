'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ChefHat, 
  Package, 
  Calculator, 
  LogOut,
  Store
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Point of Sale', href: '/pos', icon: Store },
  { name: 'Kitchen Display', href: '/kitchen', icon: ChefHat },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Accounting', href: '/accounting', icon: Calculator },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex z-50">
        <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Waffle Bay</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon
                  className={`flex-shrink-0 h-5 w-5 mr-3 ${
                    isActive ? 'text-orange-600' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
          >
            <LogOut className="flex-shrink-0 h-5 w-5 mr-3 text-gray-400 group-hover:text-red-600" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-1.5 rounded-lg">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Waffle Bay</span>
          </div>
          <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        
        {/* Render the specific page */}
        <div className="h-full w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
