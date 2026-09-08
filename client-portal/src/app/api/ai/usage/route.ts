import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId, checkAiToolLimit } from '@/lib/ai-usage'
import { getToolAccessOrThrow } from '@/lib/ai-tool-access'

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

  const access = await getToolAccessOrThrow(clientId, 'funda-tekst')
  if (!access.allowed || !access.toolId) {
    return NextResponse.json(
      { error: access.error || 'Geen toegang tot deze AI-tool' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const usage = await checkAiToolLimit(clientId, access.toolId, access.monthlyTokenLimit)

  return NextResponse.json(
    {
      usedThisMonth: usage.usedThisMonth,
      limit: usage.limit,
      percentUsed: usage.percentUsed,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
