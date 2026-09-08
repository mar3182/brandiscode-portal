import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId, checkAiToolLimit, logAiUsage } from '@/lib/ai-usage'
import { getToolAccessOrThrow } from '@/lib/ai-tool-access'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

function getOpenAI(): OpenAI {
  if (process.env.OPENAI_API_KEY) return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  if (process.env.GITHUB_TOKEN) {
    return new OpenAI({ apiKey: process.env.GITHUB_TOKEN, baseURL: 'https://models.inference.ai.azure.com' })
  }
  throw new Error('Geen AI-provider geconfigureerd')
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : []
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return response({ error: 'Niet ingelogd' }, 401)

  const clientId = await resolveClientId(user.email)
  if (!clientId) return response({ error: 'Je klanttoegang kon niet worden vastgesteld.' }, 403)

  const access = await getToolAccessOrThrow(clientId, 'funda-tekst')
  if (!access.allowed || !access.toolId) return response({ error: access.error || 'Je hebt geen toegang tot deze AI-tool.' }, 403)

  const usage = await checkAiToolLimit(clientId, access.toolId, access.monthlyTokenLimit)
  if (!usage.allowed) return response({ error: `Je maandelijkse tokenlimiet is bereikt (${usage.usedThisMonth}/${usage.limit}).` }, 429)

  const body = await req.json().catch(() => ({})) as { text?: unknown; format?: unknown; input_sample?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 12000) : ''
  const format = typeof body.format === 'string' ? body.format : 'funda'
  const inputSample = typeof body.input_sample === 'string' ? body.input_sample.slice(0, 5000) : '{}'
  if (!text) return response({ error: 'Er is geen tekst om te controleren.' }, 400)

  const openai = getOpenAI()
  const provider = process.env.OPENAI_API_KEY ? 'openai' : 'github-models'
  const model = 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: `Je bent een ervaren makelaar die dagelijks woningen verkoopt in de regio Tholen en Zeeland. Controleer AI-woningteksten professioneel en praktisch voor ${format}. Controleer feiten uitsluitend tegen de aangeleverde woninginvoer; je mag geen externe feiten verzinnen of doen alsof je de woning, locatie of markt extern hebt geverifieerd. Markeer niet-verifieerbare claims expliciet. Let op: verzonnen kenmerken, verkeerde cijfers/adresgegevens, ontbrekende belangrijke invoer, regionale en menselijke passendheid, kanaalgeschiktheid, leesbaarheid en overdreven verkoopclaims. Geef uitsluitend geldig JSON met precies deze velden: overall_score (integer 1-5), verdict (string), factual_checks (array van objecten met item, status als ok|attention|unknown, note), strengths (array strings), risks (array strings), recommendations (array strings).` ,
        },
        {
          role: 'user',
          content: `WONINGINVOER:\n${inputSample}\n\nGENERATED TEXT (${format}):\n${text}`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')) as Record<string, unknown>
    const result = {
      overall_score: typeof parsed.overall_score === 'number' ? Math.max(1, Math.min(5, Math.round(parsed.overall_score))) : 3,
      verdict: typeof parsed.verdict === 'string' ? parsed.verdict : 'Controle uitgevoerd; lees de aandachtspunten na.',
      factual_checks: Array.isArray(parsed.factual_checks) ? parsed.factual_checks : [],
      strengths: asStringArray(parsed.strengths),
      risks: asStringArray(parsed.risks),
      recommendations: asStringArray(parsed.recommendations),
    }

    const inputTokens = completion.usage?.prompt_tokens ?? Math.ceil((text.length + inputSample.length) / 4)
    const outputTokens = completion.usage?.completion_tokens ?? Math.ceil(raw.length / 4)
    await logAiUsage({ clientId, toolName: 'funda-tekst', provider, model, inputTokens, outputTokens, status: 'success' })

    return response({ result, format })
  } catch (error) {
    console.error('POST /api/ai/controleer-tekst error:', error)
    return response({ error: 'De AI-controle kon niet worden uitgevoerd.' }, 500)
  }
}
