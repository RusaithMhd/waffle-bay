'use client'

import { useState }      from 'react'
import Link              from 'next/link'
import { usePathname }   from 'next/navigation'
import {
  LayoutDashboard, ChefHat, Package, Calculator,
  LogOut, Store, Coffee, Settings, Menu, X, Layers
} from 'lucide-react'
import { createClient }  from '@/lib/supabase/client'
import { useRouter }     from 'next/navigation'
import { useSettings }   from '@/components/SettingsProvider'
import { AppRole, getNavItemsForRole, NavItem } from '@/lib/rbac'
import { RoleBadge }     from '@/components/RoleBadge'
import { logout }        from '@/app/login/actions'

// Map icon names from rbac.ts to actual Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Store, ChefHat, Coffee, Package, Calculator, Settings, Layers,
}

interface AppShellProps {
  children:  React.ReactNode
  userRole?: AppRole | null
}

export function AppShell({ children, userRole }: AppShellProps) {
  const pathname              = usePathname()
  const router                = useRouter()
  const supabase              = createClient()
  const settings              = useSettings()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: NavItem[] = getNavItemsForRole(userRole)

  const handleSignOut = async () => {
    await logout()
  }

  const isFullScreen = pathname === '/pos' || pathname === '/kitchen'

  // ── Shared nav link renderer ────────────────────────────────────────────────
  const NavLink = ({ item }: { item: NavItem }) => {
    const IconComp = ICON_MAP[item.icon] || Store
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
          isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <IconComp className={`flex-shrink-0 h-5 w-5 mr-3 ${isActive ? 'text-orange-600' : 'text-gray-400'}`} />
        {item.name}
      </Link>
    )
  }

  // ── Sign out button ─────────────────────────────────────────────────────────
  const SignOutButton = () => (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
    >
      <LogOut className="flex-shrink-0 h-5 w-5 mr-3 text-gray-400 group-hover:text-red-600" />
      Sign Out
    </button>
  )

  // ── Sidebar brand header ────────────────────────────────────────────────────
  const BrandHeader = () => (
    <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
      <div className="flex items-center space-x-2">
        <div className="bg-orange-500 p-1.5 rounded-lg shrink-0">
          <Store className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">{settings.store_name}</span>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex z-50 shrink-0">
        <BrandHeader />

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Role badge + sign out */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {userRole && (
            <div className="flex items-center space-x-2 px-1">
              <RoleBadge role={userRole} size="md" />
            </div>
          )}
          <SignOutButton />
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex w-64 max-w-xs flex-col bg-white shadow-xl h-full">
            <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 p-1.5 rounded-lg">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">{settings.store_name}</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {navItems.map(item => <NavLink key={item.href} item={item} />)}
            </nav>

            <div className="p-4 border-t border-gray-200 space-y-3">
              {userRole && (
                <div className="flex items-center space-x-2 px-1">
                  <RoleBadge role={userRole} size="md" />
                </div>
              )}
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <main className={`flex-1 relative focus:outline-none ${isFullScreen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {/* Mobile header — hidden for full-screen pages (POS, Kitchen) */}
        {!isFullScreen && (
          <div className="md:hidden bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 sticky top-0 z-40">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 -ml-2"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 p-1 rounded-md">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-bold text-gray-900">{settings.store_name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {userRole && <RoleBadge role={userRole} />}
              <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="h-full w-full">{children}</div>
      </main>
    </div>
  )
}
