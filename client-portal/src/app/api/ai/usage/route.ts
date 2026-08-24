import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId, checkAiLimit } from '@/lib/ai-usage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return NextResponse.json({ error: 'Geen klantaccount gevonden' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const usage = await checkAiLimit(clientId)

  return NextResponse.json(
    {
      usedThisMonth: usage.usedThisMonth,
      limit: usage.limit,
      percentUsed: usage.percentUsed,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
