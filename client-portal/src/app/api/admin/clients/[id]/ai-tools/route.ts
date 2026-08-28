import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { AiPromptVersion, AiUsageEvent, ClientAiSettings } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const
const RECENT_USAGE_LIMIT = 20

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

/** GET /api/admin/clients/[id]/ai-tools — overzicht: instellingen, actieve promptversies, recent gebruik, kosten deze maand */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [settingsRes, promptVersionsRes, recentUsageRes, monthUsageRes] = await Promise.all([
    admin.from('client_ai_settings').select('*').eq('client_id', clientId).maybeSingle(),
    admin
      .from('ai_prompt_versions')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('tool_name', { ascending: true }),
    admin
      .from('ai_usage_events')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_admin_test', false)
      .order('created_at', { ascending: false })
      .limit(RECENT_USAGE_LIMIT),
    admin
      .from('ai_usage_events')
      .select('estimated_cost')
      .eq('client_id', clientId)
      .eq('is_admin_test', false)
      .gte('created_at', startOfMonth.toISOString()),
  ])

  if (settingsRes.error) return noStore({ error: settingsRes.error.message }, 500)
  if (promptVersionsRes.error) return noStore({ error: promptVersionsRes.error.message }, 500)
  if (recentUsageRes.error) return noStore({ error: recentUsageRes.error.message }, 500)
  if (monthUsageRes.error) return noStore({ error: monthUsageRes.error.message }, 500)

  const costThisMonth = ((monthUsageRes.data ?? []) as { estimated_cost: number | null }[]).reduce(
    (sum, row) => sum + (row.estimated_cost ?? 0),
    0
  )

  return noStore({
    settings: (settingsRes.data as ClientAiSettings | null) ?? null,
    active_prompt_versions: (promptVersionsRes.data ?? []) as AiPromptVersion[],
    recent_usage: (recentUsageRes.data ?? []) as AiUsageEvent[],
    cost_this_month: costThisMonth,
  })
}

