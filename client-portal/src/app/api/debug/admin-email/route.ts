import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint - shows what ADMIN_EMAIL env var is set to
 * and whether current user is admin
 */
export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL

  const isAdmin = user && adminEmail ? user.email === adminEmail : false

  return NextResponse.json({
    user: user ? { email: user.email, id: user.id } : null,
    adminEmail: adminEmail || 'NOT SET',
    isAdmin,
    comparison: {
      userEmail: user?.email || 'no user',
      adminEmailEnv: adminEmail || 'NOT SET',
      match: user?.email === adminEmail,
    },
  })
}
