import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    // Let the page render: the dashboard layout shows a connection error
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user ?? null
    if (error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.status >= 500)) {
      throw error
    }
  } catch (e) {
    // Supabase unreachable: don't block, the dashboard layout shows the error
    console.error('Supabase unreachable in middleware:', e?.message)
    return supabaseResponse
  }

  // Protected routes - dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Owner-only check
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'federico.bellezza.dev@gmail.com'
    if (user.email !== OWNER_EMAIL) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated owner from login to dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    const OWNER_EMAIL = process.env.OWNER_EMAIL || 'federico.bellezza.dev@gmail.com'
    if (user.email === OWNER_EMAIL) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
