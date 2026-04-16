import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const isAdmin = user?.email === process.env.ADMIN_EMAIL
      return NextResponse.redirect(`${origin}${isAdmin ? '/admin' : '/dashboard'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
