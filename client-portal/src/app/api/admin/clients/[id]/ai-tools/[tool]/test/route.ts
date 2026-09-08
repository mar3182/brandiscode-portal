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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; tool: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as {
    test_input?: unknown
    system_prompt?: unknown
    prompt_version_id?: unknown
  }
  const testInput = typeof body.test_input === 'string' ? body.test_input.trim().slice(0, 8000) : ''
  if (!testInput) return noStore({ error: 'Testinvoer is verplicht.' }, 400)

  const admin = createAdminClient()
  let systemPrompt = typeof body.system_prompt === 'string' ? body.system_prompt.trim().slice(0, 12000) : ''
  let promptVersionId = typeof body.prompt_version_id === 'string' ? body.prompt_version_id : ''

  if (!systemPrompt && promptVersionId) {
    const { data: version } = await admin
      .from('ai_prompt_versions')
      .select('id, system_prompt')
      .eq('id', promptVersionId)
      .maybeSingle()
    if (version?.system_prompt) systemPrompt = version.system_prompt
  }

  if (!systemPrompt) {
    systemPrompt = 'Je bent een professionele vastgoedtekstschrijver voor Leunis Makelaars. Schrijf een feitelijke, warme en publiceerbare woningbeschrijving. Gebruik uitsluitend de opgegeven feiten en verzin geen kenmerken. Geef alleen de tekst terug.'
    promptVersionId = ''
  }

  try {
    const result = await runAiPrompt({ systemPrompt, userInput: testInput })
    return noStore({
      output_text: result.text,
      provider: result.provider,
      model: result.model,
      prompt_version_id: promptVersionId,
      client_id: params.id,
      is_admin_test: true,
    })
  } catch (error) {
    console.error('POST admin AI test error:', error)
    return noStore({ error: 'De AI-test is mislukt.' }, 500)
  }
}
