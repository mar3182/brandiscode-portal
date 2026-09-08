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

function createFallbackImage(label: string, accent: string, variant: number): string {
  const scenes = [
    { sky: '#e8eef2', ground: '#91a98d', sun: '#f4cf7b', body: '#d8a67c' },
    { sky: '#dbe8f2', ground: '#7896a1', sun: '#f6c36b', body: '#c9c3b4' },
    { sky: '#f0e4d2', ground: '#9caf82', sun: '#e8a866', body: '#b9c6c8' },
    { sky: '#d9e1ec', ground: '#7c967d', sun: '#f5d98b', body: '#d1ae91' },
  ]
  const scene = scenes[variant % scenes.length]
  const building = variant % 2 === 0
    ? `<path d="M145 590 512 285l367 305v280H145Z" fill="${scene.body}"/><path d="m105 600 407-345 407 345-34 40-373-315-373 315Z" fill="${accent}"/>`
    : `<rect x="155" y="440" width="714" height="430" rx="18" fill="${scene.body}"/><rect x="125" y="400" width="774" height="58" rx="12" fill="${accent}"/>`
  const windows = variant % 2 === 0
    ? '<rect x="230" y="650" width="120" height="105"/><rect x="674" y="650" width="120" height="105"/>'
    : '<rect x="225" y="570" width="130" height="115"/><rect x="447" y="570" width="130" height="115"/><rect x="669" y="570" width="130" height="115"/>'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${scene.sky}"/><rect y="570" width="1024" height="454" fill="${scene.ground}"/><circle cx="820" cy="170" r="92" fill="${scene.sun}"/>${building}<rect x="420" y="650" width="180" height="220" rx="8" fill="#654d46"/><g fill="#b7d8df">${windows}</g><g fill="#fff" opacity=".7"><path d="M290 650h-10v105h10zM230 700h120v10H230zM734 650h-10v105h10zM674 700h120v10H674z"/></g><text x="512" y="955" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#23333b">${label}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function asText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

type SyntheticProfile = {
  adres: string
  plaats: string
  woningtype: string
  ligging: string
  kenmerken: string[]
  staat: string
  bouwjaar: string
  woonoppervlakte: string
  perceeloppervlakte: string
  kamers: string
  slaapkamers: string
  vraagprijs: string
}

const SYNTHETIC_PROFILES: SyntheticProfile[] = [
  {
    adres: 'Zeedistelstraat 14', plaats: 'Tholen', woningtype: 'Tussenwoning',
    ligging: 'Rustige woonwijk op loopafstand van het centrum van Tholen', kenmerken: ['Tuin op het zuiden', 'Dakkapel', 'Vloerverwarming'], staat: 'Goed onderhouden', bouwjaar: '2018', woonoppervlakte: '118', perceeloppervlakte: '174', kamers: '5', slaapkamers: '3', vraagprijs: '€ 389.000 k.k.',
  },
  {
    adres: 'Kreekzicht 7', plaats: 'Sint-Annaland', woningtype: 'Vrijstaande woning',
    ligging: 'Aan de rand van het dorp met vrij uitzicht over het landschap', kenmerken: ['Garage', 'Zonnepanelen', 'Open keuken'], staat: 'Instapklaar', bouwjaar: '2006', woonoppervlakte: '156', perceeloppervlakte: '612', kamers: '6', slaapkamers: '4', vraagprijs: '€ 575.000 k.k.',
  },
  {
    adres: 'Appelgaard 22', plaats: 'Oud-Vossemeer', woningtype: '2-onder-1-kapwoning',
    ligging: 'Groene, kindvriendelijke straat nabij voorzieningen en wandelroutes', kenmerken: ['Garage', 'Tuin op het westen', 'Badkamer vernieuwd'], staat: 'Gerenoveerd', bouwjaar: '1994', woonoppervlakte: '132', perceeloppervlakte: '298', kamers: '5', slaapkamers: '4', vraagprijs: '€ 449.000 k.k.',
  },
  {
    adres: 'Windroos 3', plaats: 'Poortvliet', woningtype: 'Appartement',
    ligging: 'Rustig gelegen met zicht op de dorpskern en de polders', kenmerken: ['Balkon', 'Inpandige berging', 'Dubbele beglazing'], staat: 'Goed onderhouden', bouwjaar: '2012', woonoppervlakte: '86', perceeloppervlakte: 'n.v.t.', kamers: '3', slaapkamers: '2', vraagprijs: '€ 319.000 k.k.',
  },
]

function normalizeSyntheticHome(raw: unknown, fallback: SyntheticProfile): Record<string, unknown> {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const kenmerken = Array.isArray(source.kenmerken)
    ? source.kenmerken.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : []

  return {
    woningtype: asText(source.woningtype, fallback.woningtype),
    adres: asText(source.adres, fallback.adres),
    plaats: asText(source.plaats, fallback.plaats),
    vraagprijs: asText(source.vraagprijs, fallback.vraagprijs),
    bouwjaar: asText(source.bouwjaar, fallback.bouwjaar),
    woonoppervlakte: asText(source.woonoppervlakte, fallback.woonoppervlakte),
    perceeloppervlakte: asText(source.perceeloppervlakte, fallback.perceeloppervlakte),
    kamers: asText(source.kamers, fallback.kamers),
    slaapkamers: asText(source.slaapkamers, fallback.slaapkamers),
    prijsklasse: asText(source.prijsklasse, 'midden'),
    ligging: asText(source.ligging, fallback.ligging),
    kenmerken: kenmerken.length > 0 ? kenmerken : fallback.kenmerken,
    staat: asText(source.staat, fallback.staat),
    bijzonderheden: asText(source.bijzonderheden, 'Ruime leefruimtes en veel natuurlijke lichtinval.'),
    lengte: asText(source.lengte, 'normaal'),
  }
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
    const variationSeed = crypto.randomUUID()
    const variationNumber = Number.parseInt(variationSeed.replace(/-/g, '').slice(0, 8), 16)
    const fallbackIndex = variationNumber % SYNTHETIC_PROFILES.length
    const fallbackProfile = SYNTHETIC_PROFILES[fallbackIndex]
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
          content: `Maak een nieuwe, gevarieerde synthetische testwoning in Zeeland die geschikt is om een Funda-, Instagram-, Facebook- en brochuretekst te testen. Kies lengte normaal. De interface toont zelf dat dit testdata is; zet geen woorden als fictief, synthetisch of demo in de woningvelden. Gebruik deze variatiecode ${variationSeed} en dit profiel als richting, maar neem niet letterlijk steeds dezelfde waarden over: ${JSON.stringify(fallbackProfile)}.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const jsonContent = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
    const data = normalizeSyntheticHome(JSON.parse(jsonContent), fallbackProfile)

    let images: string[] = []
    let imageSource: 'openai' | 'demo-fallback' = 'openai'
    if (process.env.OPENAI_API_KEY) {
      try {
        const imagePrompt = `Create a realistic but entirely fictional real-estate listing photo of a ${String(data.woningtype)} in a Dutch Zeeland village. No people, no readable signs, no logos, no exact real-world landmark, no text. Warm daylight, professional property photography, ${String(data.bijzonderheden)}. This is variation ${variationSeed}; use a clearly different camera angle, facade composition and garden arrangement from any previous generation.`
        const imageResult = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'low',
          n: 2,
        })
        images = (imageResult.data ?? [])
          .map((image) => image.b64_json ? `data:image/png;base64,${image.b64_json}` : '')
          .filter(Boolean)
        if (images.length === 0) throw new Error('Geen beelden ontvangen')
      } catch (imageError) {
        console.warn('OpenAI image generation unavailable, using demo fallback:', imageError)
        imageSource = 'demo-fallback'
        images = []
      }
    }

    if (images.length === 0) {
      imageSource = 'demo-fallback'
      images = [
        createFallbackImage(`${fallbackProfile.plaats} - beeld ${variationSeed.slice(0, 4)}A`, '#6e8792', variationNumber),
        createFallbackImage(`${fallbackProfile.plaats} - beeld ${variationSeed.slice(0, 4)}B`, '#806b5e', variationNumber + 1),
      ]
    }

    await logAiUsage({
      clientId,
      toolName: 'funda-tekst',
      provider,
      model,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      status: 'success',
    })

    return response({ data, images, image_source: imageSource, synthetic: true })
  } catch (error) {
    console.error('POST /api/ai/fictieve-woning error:', error)
    return response({ error: 'De fictieve testwoning kon niet worden gegenereerd.' }, 500)
  }
}
