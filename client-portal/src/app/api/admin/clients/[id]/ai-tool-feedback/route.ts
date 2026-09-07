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

/** GET /api/admin/clients/[id]/ai-tool-feedback — Alle AI tool feedback van deze klant */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const { id: clientId } = params
  const admin = createAdminClient()

  // Verify client exists
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  // Fetch all AI tool feedback from this client
  const { data, error } = await admin
    .from('ai_tool_feedback')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return noStore({ error: error.message }, 500)

  return noStore({ feedback: data ?? [] })
}
