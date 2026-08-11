import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { AppRole, ROLE_HOME, ROUTE_PERMISSIONS, hasPermission } from '@/lib/rbac'

async function getRoleForUser(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<AppRole | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  return ((data?.roles as any)?.name?.toLowerCase() as AppRole) || null
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const pathname    = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login')
  const isPublic    = pathname.startsWith('/error') || pathname.startsWith('/_next')

  if (isPublic) return supabaseResponse

  // ── 1. Not authenticated → go to login ──────────────────────────────────────
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── 2. Authenticated + trying to visit login → role-aware home ───────────────
  if (user && isAuthRoute) {
    const role = await getRoleForUser(supabase, user.id)
    if (!role) {
      // If they have no role, let them stay on login to re-authenticate or see an error
      return supabaseResponse
    }
    const home = ROLE_HOME[role] || '/'
    const url  = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  // ── 3. Authenticated + visiting app route → RBAC check ──────────────────────
  if (user) {
    const role = await getRoleForUser(supabase, user.id)

    // Find the most specific matching route permission
    // Sort by length descending so '/settings/staff' matches before '/settings'
    const matchedRoute = Object.keys(ROUTE_PERMISSIONS)
      .filter(r => pathname === r || pathname.startsWith(r === '/' ? '/__never__' : r + '/') || pathname === r)
      .sort((a, b) => b.length - a.length)[0]

    if (matchedRoute) {
      const requiredPermission = ROUTE_PERMISSIONS[matchedRoute]
      if (!hasPermission(role, requiredPermission)) {
        // Redirect to role home rather than showing a raw 403
        let home = '/login'
        if (role && ROLE_HOME[role]) {
          home = ROLE_HOME[role]
        } else {
          home = '/login?message=Account+requires+a+valid+role.+Please+sign+in+again.'
        }
        
        const url  = request.nextUrl.clone()
        url.pathname = home.split('?')[0]
        url.search = home.includes('?') ? home.split('?')[1] : ''
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
