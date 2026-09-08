import { NextResponse } from 'next/server'
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
    return new OpenAI({
      apiKey: process.env.GITHUB_TOKEN,
      baseURL: 'https://models.inference.ai.azure.com',
    })
  }
  throw new Error('Geen AI-provider geconfigureerd')
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return response({ error: 'Niet ingelogd' }, 401)

  const clientId = await resolveClientId(user.email)
  if (!clientId) return response({ error: 'Je klanttoegang kon niet worden vastgesteld.' }, 403)

  const access = await getToolAccessOrThrow(clientId, 'funda-tekst')
  if (!access.allowed || !access.toolId) {
    return response({ error: access.error || 'Je hebt nog geen toegang tot deze AI-tool.' }, 403)
  }

  const usage = await checkAiToolLimit(clientId, access.toolId, access.monthlyTokenLimit)
  if (!usage.allowed) {
    return response({ error: `Je maandelijkse tokenlimiet is bereikt (${usage.usedThisMonth}/${usage.limit}).` }, 429)
  }

  const openai = getOpenAI()
  const provider = process.env.OPENAI_API_KEY ? 'openai' : 'github-models'
  const model = 'gpt-4o-mini'

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: 'Je maakt synthetische, duidelijk fictieve Nederlandse woningdata voor een demo. Gebruik geen bestaande personen, echte prijzen of herkenbare adressen. Geef alleen geldig JSON terug met de velden woningtype, adres, plaats, vraagprijs, bouwjaar, woonoppervlakte, perceeloppervlakte, kamers, slaapkamers, ligging, kenmerken (array), staat, bijzonderheden en lengte. Gebruik een geloofwaardige maar fictieve straatnaam en plaats.',
        },
        {
          role: 'user',
          content: 'Maak een aantrekkelijke fictieve testwoning in Zeeland die geschikt is om een Funda-, Instagram-, Facebook- en brochuretekst te testen. Kies lengte normaal. Zet in bijzonderheden expliciet dat alle gegevens fictief zijn.',
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const data = JSON.parse(raw) as Record<string, unknown>
    const requiredStrings = ['woningtype', 'adres', 'plaats', 'vraagprijs', 'bouwjaar', 'woonoppervlakte', 'perceeloppervlakte', 'kamers', 'slaapkamers', 'ligging', 'staat', 'bijzonderheden', 'lengte']
    if (requiredStrings.some((key) => typeof data[key] !== 'string') || !Array.isArray(data.kenmerken)) {
      throw new Error('De fictieve woningdata is onvolledig')
    }

    const imagePrompt = `Create a realistic but entirely fictional real-estate listing photo of a ${String(data.woningtype)} in a Dutch Zeeland village. No people, no readable signs, no logos, no exact real-world landmark, no text. Warm daylight, professional property photography, ${String(data.bijzonderheden)}.`
    const imageResult = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: imagePrompt,
      size: '1024x1024',
      quality: 'low',
      n: 2,
    })

    const images = (imageResult.data ?? [])
      .map((image) => image.b64_json ? `data:image/png;base64,${image.b64_json}` : '')
      .filter(Boolean)

    if (images.length === 0) throw new Error('Er konden geen fictieve woningafbeeldingen worden gemaakt')

    await logAiUsage({
      clientId,
      toolName: 'funda-tekst',
      provider,
      model,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      status: 'success',
    })

    return response({ data, images, synthetic: true })
  } catch (error) {
    console.error('POST /api/ai/fictieve-woning error:', error)
    return response({ error: 'De fictieve testwoning kon niet worden gegenereerd.' }, 500)
  }
}
