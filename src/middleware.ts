import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const pathname = request.nextUrl.pathname

  // Bescherm /dashboard routes — vereist ingelogde gebruiker
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Forceer wachtwoord wijzigen bij eerste login (alleen voor klanten, niet voor admin)
    if (
      user.email !== process.env.ADMIN_EMAIL &&
      !user.user_metadata?.password_changed &&
      pathname !== '/dashboard/wachtwoord-wijzigen'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/wachtwoord-wijzigen'
      return NextResponse.redirect(url)
    }
  }

  // Bescherm /admin routes — vereist admin e-mail
  if (pathname.startsWith('/admin')) {
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect ingelogde gebruikers weg van /login
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = user.email === process.env.ADMIN_EMAIL ? '/admin' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
}
