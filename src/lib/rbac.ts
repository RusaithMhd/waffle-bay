/**
 * RBAC — Centralized Role-Based Access Control Configuration
 *
 * This is the single source of truth for all roles, permissions, and
 * route-to-permission mappings in the Waffle Bay POS system.
 *
 * To add a new route restriction: add it to ROUTE_PERMISSIONS.
 * To change a role's access: modify ROLE_PERMISSIONS.
 * Never scatter authorization logic across individual components.
 */

// ── Role Names ────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'manager' | 'cashier' | 'chef'

export const ROLES = {
  ADMIN:   'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  CHEF:    'chef',
} as const

// ── Permissions ───────────────────────────────────────────────────────────────

export type Permission =
  | '*'               // admin wildcard
  | 'dashboard'
  | 'pos'
  | 'kitchen'
  | 'products.view'
  | 'products.manage'
  | 'inventory'
  | 'accounting'
  | 'settings'
  | 'shifts'
  | 'reports'

// ── Role → Permissions Map ────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: ['*'],

  manager: [
    'dashboard',
    'pos',
    'kitchen',
    'products.view',
    'products.manage',
    'inventory',
    'shifts',
    'reports',
  ],

  cashier: [
    'pos',
    'shifts',
  ],

  chef: [
    'kitchen',
  ],
}

// ── Route → Required Permission ───────────────────────────────────────────────
// Key = pathname prefix. Value = permission required to access it.

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/':            'dashboard',
  '/pos':         'pos',
  '/kitchen':     'kitchen',
  '/products':    'products.view',
  '/inventory':   'inventory',
  '/accounting':  'accounting',
  '/settings':    'settings',
}

// ── Role home pages (redirect after login) ───────────────────────────────────

export const ROLE_HOME: Record<AppRole, string> = {
  admin:   '/',
  manager: '/',
  cashier: '/pos',
  chef:    '/kitchen',
}

// ── Helper: Does a role have a permission? ────────────────────────────────────

export function hasPermission(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true          // admin wildcard
  return perms.includes(permission)
}

// ── Helper: Get nav items for a role ─────────────────────────────────────────

export interface NavItem {
  name:   string
  href:   string
  icon:   string          // lucide icon name — resolved in the component
  permission: Permission
}

export const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard',      href: '/',          icon: 'LayoutDashboard', permission: 'dashboard'       },
  { name: 'Point of Sale',  href: '/pos',        icon: 'Store',           permission: 'pos'             },
  { name: 'Kitchen',        href: '/kitchen',    icon: 'ChefHat',         permission: 'kitchen'         },
  { name: 'Products',       href: '/products',   icon: 'Coffee',          permission: 'products.view'   },
  { name: 'Inventory',      href: '/inventory',  icon: 'Package',         permission: 'inventory'       },
  { name: 'Accounting',     href: '/accounting', icon: 'Calculator',      permission: 'accounting'      },
  { name: 'Settings',       href: '/settings',   icon: 'Settings',        permission: 'settings'        },
]

export function getNavItemsForRole(role: AppRole | null | undefined): NavItem[] {
  return ALL_NAV_ITEMS.filter(item => hasPermission(role, item.permission))
}

// ── Role display config ───────────────────────────────────────────────────────

export const ROLE_DISPLAY: Record<AppRole, { label: string; color: string }> = {
  admin:   { label: 'Admin',   color: 'bg-purple-100 text-purple-700' },
  manager: { label: 'Manager', color: 'bg-blue-100   text-blue-700'   },
  cashier: { label: 'Cashier', color: 'bg-green-100  text-green-700'  },
  chef:    { label: 'Chef',    color: 'bg-amber-100  text-amber-700'  },
}
