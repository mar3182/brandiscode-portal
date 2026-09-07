import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

/** GET /api/admin/clients/[id]/ai-tools — overzicht: tools, toegang, recent gebruik, kosten deze maand */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const admin = createAdminClient()

  // Verify client exists
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

  // Fetch all AI tools, access records, and usage data
  const [toolsRes, accessRes, recentUsageRes, monthUsageRes] = await Promise.all([
    admin.from('ai_tools').select('*').order('name'),
    admin.from('ai_tool_access').select('*').eq('client_id', clientId),
    admin
      .from('ai_usage_daily')
      .select('*')
      .eq('client_id', clientId)
      .order('usage_date', { ascending: false })
      .limit(30),
    admin
      .from('ai_usage_daily')
      .select('tokens_used')
      .eq('client_id', clientId)
      .gte('usage_date', startOfMonth.toISOString().split('T')[0]),
  ])

  if (toolsRes.error) return noStore({ error: toolsRes.error.message }, 500)
  if (accessRes.error) return noStore({ error: accessRes.error.message }, 500)
  if (recentUsageRes.error) return noStore({ error: recentUsageRes.error.message }, 500)
  if (monthUsageRes.error) return noStore({ error: monthUsageRes.error.message }, 500)

  const tools = toolsRes.data ?? []
  const access = accessRes.data ?? []
  const recentUsage = recentUsageRes.data ?? []
  const monthUsage = monthUsageRes.data ?? []

  // Calculate monthly tokens
  const tokensThisMonth = monthUsage.reduce((sum, row) => sum + (row.tokens_used || 0), 0)

  // Build tools with access info
  const toolsWithAccess = tools.map(tool => {
    const toolAccess = access.find((a: any) => a.tool_id === tool.id)
    return {
      ...tool,
      has_access: !!toolAccess,
      access_type: toolAccess?.access_type || null,
      access_granted_at: toolAccess?.access_granted_at || null,
      monthly_token_limit: toolAccess?.monthly_token_limit || null,
    }
  })

  return noStore({
    tools: toolsWithAccess,
    access_records: access,
    recent_usage: recentUsage,
    tokens_this_month: tokensThisMonth,
  })
}

