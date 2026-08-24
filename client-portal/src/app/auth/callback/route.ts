import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const safeNext = next && next.startsWith('/') ? next : '/'
      // Redirect to root page or safe next URL - root page will check if user is admin and route accordingly
      return NextResponse.redirect(`${origin}${safeNext}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
