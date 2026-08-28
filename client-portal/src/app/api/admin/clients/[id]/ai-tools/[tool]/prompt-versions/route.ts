import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { AiPromptVersion } from '@/lib/types'
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

/** GET .../prompt-versions — lijst versies aflopend op version_number */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; tool: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const toolName = params.tool
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const { data, error } = await admin
    .from('ai_prompt_versions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tool_name', toolName)
    .order('version_number', { ascending: false })

  if (error) return noStore({ error: error.message }, 500)

  return noStore({ prompt_versions: (data ?? []) as AiPromptVersion[] })
}

/** POST .../prompt-versions — nieuwe versie aanmaken, optioneel meteen activeren */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; tool: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const toolName = params.tool
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const systemPrompt = typeof body.system_prompt === 'string' ? body.system_prompt.trim() : ''
  if (!systemPrompt) {
    return noStore({ error: 'system_prompt is verplicht' }, 400)
  }

  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0 ? body.notes.trim() : null
  const createdBy = typeof body.created_by === 'string' && body.created_by.trim().length > 0
    ? body.created_by.trim()
    : user.email ?? null
  const activate = body.activate === true

  const { data: lastVersion, error: lastVersionError } = await admin
    .from('ai_prompt_versions')
    .select('version_number')
    .eq('client_id', clientId)
    .eq('tool_name', toolName)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastVersionError) return noStore({ error: lastVersionError.message }, 500)

  const nextVersionNumber = ((lastVersion as { version_number: number } | null)?.version_number ?? 0) + 1

  // Activeren gebeurt sequentieel: eerst de bestaande actieve versie voor deze
  // (client_id, tool_name)-scope deactiveren, dan pas de nieuwe versie actief
  // inserten. De unieke partiële index (ux_ai_prompt_versions_active_per_scope)
  // voorkomt dat er ooit 2 actieve versies tegelijk bestaan.
  if (activate) {
    const { error: deactivateError } = await admin
      .from('ai_prompt_versions')
      .update({ is_active: false })
      .eq('client_id', clientId)
      .eq('tool_name', toolName)
      .eq('is_active', true)

    if (deactivateError) return noStore({ error: deactivateError.message }, 500)
  }

  const { data: inserted, error: insertError } = await admin
    .from('ai_prompt_versions')
    .insert({
      client_id: clientId,
      tool_name: toolName,
      version_number: nextVersionNumber,
      system_prompt: systemPrompt,
      notes,
      is_active: activate,
      created_by: createdBy,
    })
    .select('*')
    .single()

  if (insertError) return noStore({ error: insertError.message }, 500)

  return noStore({ prompt_version: inserted as AiPromptVersion }, 201)
}
