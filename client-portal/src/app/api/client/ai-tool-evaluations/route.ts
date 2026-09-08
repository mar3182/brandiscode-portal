import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const
const FORMATS = new Set(['funda', 'instagram', 'facebook', 'brochure'])
const SCORE_FIELDS = [
  'factual_accuracy',
  'completeness',
  'leunis_style',
  'channel_fit',
  'activation',
  'readability',
] as const

type ScoreField = (typeof SCORE_FIELDS)[number]

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return response({ error: 'Niet ingelogd' }, 401)

    const admin = createAdminClient()
    const { data: clientUser } = await admin
      .from('client_users')
      .select('client_id')
      .eq('email', user.email)
      .maybeSingle()

    if (!clientUser?.client_id) return response({ error: 'Klant niet gevonden' }, 404)

    const body = await req.json() as Record<string, unknown>
    const toolId = typeof body.tool_id === 'string' ? body.tool_id : ''
    const generationKey = typeof body.generation_key === 'string' ? body.generation_key.trim().slice(0, 120) : ''
    const resultFormat = typeof body.result_format === 'string' ? body.result_format : ''
    const generatedTextSample = typeof body.generated_text_sample === 'string'
      ? body.generated_text_sample.trim().slice(0, 1000)
      : ''
    const inputSample = typeof body.input_sample === 'string'
      ? body.input_sample.trim().slice(0, 2000)
      : null
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : null

    if (!toolId || !generationKey || !FORMATS.has(resultFormat) || !generatedTextSample) {
      return response({ error: 'Ongeldige evaluatiegegevens' }, 400)
    }

    let parsedInputSample: Record<string, unknown> = {}
    if (inputSample) {
      try {
        const parsed = JSON.parse(inputSample) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedInputSample = parsed as Record<string, unknown>
        }
      } catch {
        return response({ error: 'Ongeldige invoergegevens voor deze evaluatie' }, 400)
      }
    }

    const { data: access } = await admin
      .from('ai_tool_access')
      .select('id')
      .eq('tool_id', toolId)
      .eq('client_id', clientUser.client_id)
      .is('access_revoked_at', null)
      .maybeSingle()

    if (!access) return response({ error: 'Je hebt geen toegang tot deze AI-tool' }, 403)

    const scores: Record<ScoreField, number> = {} as Record<ScoreField, number>
    for (const field of SCORE_FIELDS) {
      const value = body[field]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
        return response({ error: 'Geef voor elk criterium een cijfer van 1 tot 5' }, 400)
      }
      scores[field] = value
    }

    const { data, error } = await admin
      .from('ai_tool_evaluations')
      .insert({
        tool_id: toolId,
        client_id: clientUser.client_id,
        result_session_id: generationKey,
        channel: resultFormat,
        score_factual_accuracy: scores.factual_accuracy,
        score_completeness: scores.completeness,
        score_leunis_style: scores.leunis_style,
        score_channel_fit: scores.channel_fit,
        score_activation: scores.activation,
        score_readability: scores.readability,
        free_comment: comment || null,
        generated_text_sample: generatedTextSample,
        input_sample: parsedInputSample,
        created_by: user.id,
      })
      .select('id, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return response({ error: 'Deze tekst is al geëvalueerd' }, 409)
      console.error('POST /api/client/ai-tool-evaluations error:', error.message)
      return response({ error: 'Evaluatie opslaan is niet gelukt' }, 500)
    }

    return response({ message: 'Bedankt voor je evaluatie', evaluation: data }, 201)
  } catch (error) {
    console.error('POST /api/client/ai-tool-evaluations error:', error)
    return response({ error: 'Evaluatie opslaan is niet gelukt' }, 500)
  }
}
