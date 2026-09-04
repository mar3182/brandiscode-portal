import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// List of known client slugs (wordt dynamisch uit database gehaald in productie)
const CLIENT_SLUGS = new Set([
  'brand-is-code',
  'brand-is-code_1',
  'leunis-makelaars',
  'mcj-advocatuur',
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  // Controleer of dit een klant-specifieke URL is
  const firstPathSegment = pathname.split('/')[1]

  // Als het een bekende client slug is, rout naar klant dashboard
  if (firstPathSegment && CLIENT_SLUGS.has(firstPathSegment)) {
    // Proxy door naar [clientId] routing
    return response
  }

  // Bestaande routing voor admin/dashboard
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
