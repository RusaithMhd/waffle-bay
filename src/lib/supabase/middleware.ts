import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes each role is ALLOWED to access (exact pathname or prefix)
const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
  kitchen: ['/kitchen'],
  pos:     ['/pos'],
  // admin / manager have no restrictions — they can access everything
}

// Where each restricted role lands after login
const ROLE_HOME: Record<string, string> = {
  kitchen: '/kitchen',
  pos:     '/pos',
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  // IMPORTANT: Do not write any logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const pathname   = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login')

  // 1. Not logged in — redirect to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Logged in, trying to hit login — redirect to home (role-aware)
  if (user && isAuthRoute) {
    // Fetch role to decide where to send them
    const { data: userRoleRow } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single()

    const roleName: string = (userRoleRow?.roles as any)?.name?.toLowerCase() || ''
    const home = ROLE_HOME[roleName] || '/'

    const url = request.nextUrl.clone()
    url.pathname = home
    return NextResponse.redirect(url)
  }

  // 3. Logged in, not on login — check role restrictions
  if (user) {
    const { data: userRoleRow } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .single()

    const roleName: string = (userRoleRow?.roles as any)?.name?.toLowerCase() || ''
    const allowedPaths = ROLE_ALLOWED_PATHS[roleName]

    if (allowedPaths) {
      // This role is restricted — check if the current path is allowed
      const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
      if (!isAllowed) {
        // Redirect them to their designated home
        const url = request.nextUrl.clone()
        url.pathname = ROLE_HOME[roleName] || '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
