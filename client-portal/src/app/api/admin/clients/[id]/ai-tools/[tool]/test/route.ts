import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { runAiPrompt } from '@/lib/ai-generation'
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

/**
 * POST .../ai-tools/[tool]/test — admin-testrun (sandbox).
 * Slaat de klantquotum-check (checkAiLimit) bewust over en schrijft nooit naar
 * klantzichtbare tabellen. Logt uitsluitend naar ai_usage_events met is_admin_test=true.
 */
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

  const testInput = body.test_input
  if (testInput === undefined || testInput === null || testInput === '') {
    return noStore({ error: 'test_input is verplicht' }, 400)
  }

  const explicitVersionId = typeof body.prompt_version_id === 'string' ? body.prompt_version_id : null

  let promptVersion: AiPromptVersion | null = null

  if (explicitVersionId) {
    const { data, error } = await admin
      .from('ai_prompt_versions')
      .select('*')
      .eq('id', explicitVersionId)
      .eq('tool_name', toolName)
      .maybeSingle()
    if (error) return noStore({ error: error.message }, 500)
    promptVersion = (data as AiPromptVersion | null) ?? null
  } else {
    const { data, error } = await admin
      .from('ai_prompt_versions')
      .select('*')
      .eq('client_id', clientId)
      .eq('tool_name', toolName)
      .eq('is_active', true)
      .maybeSingle()
    if (error) return noStore({ error: error.message }, 500)
    promptVersion = (data as AiPromptVersion | null) ?? null

    // Fallback naar het standaardsjabloon (client_id IS NULL) als de klant nog
    // geen eigen actieve promptversie heeft.
    if (!promptVersion) {
      const fallback = await admin
        .from('ai_prompt_versions')
        .select('*')
        .is('client_id', null)
        .eq('tool_name', toolName)
        .eq('is_active', true)
        .maybeSingle()
      if (fallback.error) return noStore({ error: fallback.error.message }, 500)
      promptVersion = (fallback.data as AiPromptVersion | null) ?? null
    }
  }

  if (!promptVersion) {
    return noStore({ error: 'Geen (actieve) promptversie gevonden voor deze tool' }, 404)
  }

  const userInput = typeof testInput === 'string' ? testInput : JSON.stringify(testInput)

  try {
    const result = await runAiPrompt({ systemPrompt: promptVersion.system_prompt, userInput })

    await admin.from('ai_usage_events').insert({
      client_id: clientId,
      tool_name: toolName,
      provider: result.provider,
      model: result.model,
      mode: 'managed',
      input_tokens: result.inputTokens ?? null,
      output_tokens: result.outputTokens ?? null,
      estimated_cost: null,
      request_status: 'success',
      is_admin_test: true,
    })

    return noStore({
      output_text: result.text,
      prompt_version_id: promptVersion.id,
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('AI Workbench testrun mislukt:', message)

    await admin.from('ai_usage_events').insert({
      client_id: clientId,
      tool_name: toolName,
      provider: 'unknown',
      model: 'unknown',
      mode: 'managed',
      request_status: 'error',
      is_admin_test: true,
    })

    return noStore({ error: `Fout bij genereren: ${message}` }, 500)
  }
}
