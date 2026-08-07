import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const pathname = request.nextUrl.pathname

  // Openbare routes — geen auth check nodig
  const publicPaths = ['/login', '/api/']
  const isPublicRoute = publicPaths.some(path => pathname.startsWith(path))

  if (!isPublicRoute) {
    // Check of Supabase configuratie bestaat
    const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!hasSupabaseConfig) {
      console.warn('Middleware: Supabase URL of Key ontbreekt in environment variables. Auth check overgeslagen.')
      return response
    }

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({ name, value, ...options })
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({ name, value: '', ...options })
              response = NextResponse.next({
                request: {
                  headers: request.headers,
                },
              })
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      const { data: { user } } = await supabase.auth.getUser()

      const adminEmail = process.env.ADMIN_EMAIL || ''

      // Bescherm /dashboard routes — vereist ingelogde gebruiker
      if (pathname.startsWith('/dashboard')) {
        if (!user) {
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
        }

        // Admin hoort op /admin, niet op /dashboard
        if (user.email === adminEmail) {
          const url = request.nextUrl.clone()
          url.pathname = '/admin'
          return NextResponse.redirect(url)
        }

        // Forceer wachtwoord wijzigen bij eerste login (alleen voor klanten, niet voor admin)
        if (
          user.email !== adminEmail &&
          !user.user_metadata?.password_changed &&
          pathname !== '/dashboard/wachtwoord-wijzigen'
        ) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard/wachtwoord-wijzigen'
          return NextResponse.redirect(url)
        }

        // Forceer onboarding als deze nog niet voltooid is (na wachtwoord wijzigen)
        if (
          user.email !== adminEmail &&
          user.user_metadata?.password_changed &&
          !user.user_metadata?.onboarding_completed &&
          pathname !== '/dashboard/onboarding'
        ) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard/onboarding'
          return NextResponse.redirect(url)
        }
      }

      // Bescherm /admin routes — vereist admin e-mail
      if (pathname.startsWith('/admin')) {
        if (!user || user.email !== adminEmail) {
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
        }
      }

      // Redirect ingelogde gebruikers weg van /login
      if (pathname === '/login' && user) {
        const url = request.nextUrl.clone()
        url.pathname = user.email === adminEmail ? '/admin' : '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // Fallback: als Supabase niet bereikbaar is, sta alle verzoeken door
      console.error('Middleware auth check failed:', error)
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}
