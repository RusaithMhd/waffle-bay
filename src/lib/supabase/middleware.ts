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
      return supabaseResponse
    }
    const home = ROLE_HOME[role] || '/'
    const url  = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  // ── 3. Authenticated + visiting app route ───────────────────────────────────
  // RBAC checks are handled inside the page.tsx Server Components.
  // We do not query the database for roles here to eliminate unnecessary latency on every navigation.

  return supabaseResponse
}
