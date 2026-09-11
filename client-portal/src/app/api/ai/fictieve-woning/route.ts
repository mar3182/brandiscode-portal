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
  // 12 scenes × 4 building types × 4 window patterns = 192 unieke combinaties
  const scenes = [
    { sky: '#e8eef2', ground: '#91a98d', sun: '#f4cf7b', body: '#d8a67c' },
    { sky: '#dbe8f2', ground: '#7896a1', sun: '#f6c36b', body: '#c9c3b4' },
    { sky: '#f0e4d2', ground: '#9caf82', sun: '#e8a866', body: '#b9c6c8' },
    { sky: '#d9e1ec', ground: '#7c967d', sun: '#f5d98b', body: '#d1ae91' },
    { sky: '#f2ece4', ground: '#8aaa82', sun: '#f4b87b', body: '#c8b6a6' },
    { sky: '#e4ecf2', ground: '#96a187', sun: '#f6d86b', body: '#b6a696' },
    { sky: '#f4e8d8', ground: '#829678', sun: '#e8c866', body: '#a69686' },
    { sky: '#e8f0f4', ground: '#78a196', sun: '#f4c87b', body: '#968676' },
    { sky: '#f0e8e4', ground: '#8a9682', sun: '#f6c87b', body: '#c6b6a6' },
    { sky: '#e4e8f0', ground: '#968278', sun: '#f4d86b', body: '#b69686' },
    { sky: '#f4f0e8', ground: '#827896', sun: '#e8b866', body: '#a68696' },
    { sky: '#e8f4f0', ground: '#789682', sun: '#f6d87b', body: '#96a686' },
  ]
  const scene = scenes[variant % scenes.length]
  // 4 building types (vrijstaand, tussen, hoek, appartement)
  const buildingType = variant % 4
  const building = buildingType === 0
    ? `<path d="M145 590 512 285l367 305v280H145Z" fill="${scene.body}"/><path d="m105 600 407-345 407 345-34 40-373-315-373 315Z" fill="${accent}"/>`
    : buildingType === 1
    ? `<rect x="155" y="440" width="714" height="430" rx="18" fill="${scene.body}"/><rect x="125" y="400" width="774" height="58" rx="12" fill="${accent}"/>`
    : buildingType === 2
    ? `<rect x="200" y="460" width="624" height="410" rx="12" fill="${scene.body}"/><path d="M200 460 512 300l312 160v410H200Z" fill="${accent}"/>`
    : `<rect x="100" y="500" width="300" height="370" rx="8" fill="${scene.body}"/><rect x="412" y="480" width="200" height="390" rx="8" fill="${accent}"/><rect x="624" y="500" width="300" height="370" rx="8" fill="${scene.body}"/>`
  // 4 window patterns
  const windows = buildingType === 0
    ? '<rect x="230" y="650" width="120" height="105"/><rect x="674" y="650" width="120" height="105"/>'
    : buildingType === 1
    ? '<rect x="225" y="570" width="130" height="115"/><rect x="447" y="570" width="130" height="115"/><rect x="669" y="570" width="130" height="115"/>'
    : buildingType === 2
    ? '<rect x="300" y="600" width="100" height="90"/><rect x="460" y="600" width="100" height="90"/><rect x="620" y="600" width="100" height="90"/>'
    : '<rect x="150" y="620" width="80" height="80"/><rect x="450" y="600" width="80" height="80"/><rect x="680" y="620" width="80" height="80"/>'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${scene.sky}"/><rect y="570" width="1024" height="454" fill="${scene.ground}"/><circle cx="820" cy="170" r="92" fill="${scene.sun}"/>${building}<rect x="420" y="650" width="180" height="220" rx="8" fill="#654d46"/><g fill="#b7d8df">${windows}</g><g fill="#fff" opacity=".7"><path d="M290 650h-10v105h10zM230 700h120v10H230zM734 650h-10v105h10zM674 700h120v10H674z"/></g><text x="512" y="955" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#23333b">${label}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

async function imageDataUrl(image: { b64_json?: string | null; url?: string | null }): Promise<string> {
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  if (!image.url) return ''

  const imageResponse = await fetch(image.url)
  if (!imageResponse.ok) return ''
  const contentType = imageResponse.headers.get('content-type') || 'image/png'
  const bytes = Buffer.from(await imageResponse.arrayBuffer())
  return `data:${contentType};base64,${bytes.toString('base64')}`
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

const THOLEN_MUNICIPALITY_KERNS = [
  'Tholen', 'Poortvliet', 'Scherpenisse', 'Sint-Maartensdijk',
  'Stavenisse', 'Sint-Annaland', 'Oud-Vossemeer', 'Sint-Philipsland', 'Anna Jacobapolder',
]

const SYNTHETIC_PROFILES: SyntheticProfile[] = [
  {
    adres: 'Zeedistelstraat 14', plaats: 'Tholen', woningtype: 'Tussenwoning',
    ligging: 'Rustige woonwijk op loopafstand van het centrum van Tholen', kenmerken: ['Tuin op het zuiden', 'Dakkapel', 'Vloerverwarming'], staat: 'Goed onderhouden', bouwjaar: '2018', woonoppervlakte: '118', perceeloppervlakte: '174', kamers: '5', slaapkamers: '3', vraagprijs: '€ 389.000 k.k.',
  },
  {
    adres: 'Schuttershof 4', plaats: 'Tholen', woningtype: 'Vrijstaande woning',
    ligging: 'Kindvriendelijke woonwijk aan de rand van het centrum', kenmerken: ['Garage', 'Zonnepanelen', 'Tuin op het zuiden'], staat: 'Instapklaar', bouwjaar: '2006', woonoppervlakte: '156', perceeloppervlakte: '612', kamers: '6', slaapkamers: '4', vraagprijs: '€ 575.000 k.k.',
  },
  {
    adres: 'Hoogstraat 5', plaats: 'Tholen', woningtype: 'Woning',
    ligging: 'In de historische binnenstad van Tholen, nabij markt en haven', kenmerken: ['Monument', 'Balkenplafond', 'Glas-in-loodramen'], staat: 'Gerenoveerd', bouwjaar: '1849', woonoppervlakte: '142', perceeloppervlakte: '98', kamers: '5', slaapkamers: '3', vraagprijs: '€ 489.000 k.k.',
  },
  {
    adres: 'Havenstraat 8', plaats: 'Poortvliet', woningtype: 'Appartement',
    ligging: 'Rustig gelegen met zicht op de dorpskern en de polders', kenmerken: ['Balkon', 'Inpandige berging', 'Dubbele beglazing'], staat: 'Goed onderhouden', bouwjaar: '2012', woonoppervlakte: '86', perceeloppervlakte: 'n.v.t.', kamers: '3', slaapkamers: '2', vraagprijs: '€ 319.000 k.k.',
  },
  {
    adres: 'Kerkweg 22', plaats: 'Sint-Philipsland', woningtype: '2-onder-1-kapwoning',
    ligging: 'Rustige straat nabij dorpskern en basisschool', kenmerken: ['Tuin op het westen', 'Vloerverwarming', 'Badkamer vernieuwd'], staat: 'Instapklaar', bouwjaar: '1994', woonoppervlakte: '132', perceeloppervlakte: '298', kamers: '5', slaapkamers: '4', vraagprijs: '€ 449.000 k.k.',
  },
  {
    adres: 'Bosstraat 15', plaats: 'Sint-Annaland', woningtype: 'Bungalow',
    ligging: 'Landelijk gelegen aan de rand van het dorp met uitzicht over de polder', kenmerken: ['Vrijstaande schuur', 'Zonnepanelen', 'Open keuken'], staat: 'Goed onderhouden', bouwjaar: '1985', woonoppervlakte: '105', perceeloppervlakte: '450', kamers: '4', slaapkamers: '3', vraagprijs: '€ 365.000 k.k.',
  },
  {
    adres: 'Dorpsstraat 33', plaats: 'Scherpenisse', woningtype: 'Vrijstaande woning',
    ligging: 'Groene omgeving nabij het Scherpenissemeer', kenmerken: ['Garage', 'Tuin op het zuiden', 'Zonnepanelen', 'Badkamer vernieuwd'], staat: 'Instapklaar', bouwjaar: '2015', woonoppervlakte: '168', perceeloppervlakte: '520', kamers: '6', slaapkamers: '4', vraagprijs: '€ 525.000 k.k.',
  },
  {
    adres: 'Molenweg 7', plaats: 'Sint-Maartensdijk', woningtype: 'Tussenwoning',
    ligging: 'Karaktervol dorp met historische molen en gezellige dorpskern', kenmerken: ['Dakkapel', 'Vloerverwarming', 'Inpandige berging'], staat: 'Goed onderhouden', bouwjaar: '2001', woonoppervlakte: '115', perceeloppervlakte: '210', kamers: '4', slaapkamers: '3', vraagprijs: '€ 345.000 k.k.',
  },
  {
    adres: 'Stavenisseweg 12', plaats: 'Stavenisse', woningtype: '2-onder-1-kapwoning',
    ligging: 'Rustige ligging aan de rand van het dorp', kenmerken: ['Tuin op het westen', 'Zonnepanelen', 'Dubbele beglazing'], staat: 'Gerenoveerd', bouwjaar: '2008', woonoppervlakte: '128', perceeloppervlakte: '245', kamers: '5', slaapkamers: '3', vraagprijs: '€ 398.000 k.k.',
  },
  {
    adres: 'Anna Jacobapolder 18', plaats: 'Anna Jacobapolder', woningtype: 'Vrijstaande woning',
    ligging: 'Landelijk gelegen met uitzicht over de polder', kenmerken: ['Vrijstaande schuur', 'Zonnepanelen', 'Open keuken', 'Laadpaal'], staat: 'Instapklaar', bouwjaar: '2020', woonoppervlakte: '175', perceeloppervlakte: '680', kamers: '6', slaapkamers: '4', vraagprijs: '€ 595.000 k.k.',
  },
  {
    adres: 'Oud-Vossemeer 45', plaats: 'Oud-Vossemeer', woningtype: 'Appartement',
    ligging: 'Nabij het centrum en wandelroutes door de natuur', kenmerken: ['Balkon', 'Inpandige berging', 'Airco'], staat: 'Goed onderhouden', bouwjaar: '2016', woonoppervlakte: '92', perceeloppervlakte: 'n.v.t.', kamers: '3', slaapkamers: '2', vraagprijs: '€ 289.000 k.k.',
  },
]

function normalizeSyntheticHome(raw: unknown, fallback: SyntheticProfile): Record<string, unknown> {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const kenmerken = Array.isArray(source.kenmerken)
    ? source.kenmerken.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : []

  return {
    woningtype: asText(source.woningtype, fallback.woningtype),
    // Forceer de adres en plaats vanuit het fallback profiel (alleen dorpen op het eiland Tholen)
    adres: fallback.adres,
    plaats: fallback.plaats,
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
    
    // Forceer de plaats vanuit het profiel (alleen dorpen op het eiland Tholen)
    const forcedPlace = fallbackProfile.plaats
    
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: 'Je maakt synthetische, duidelijk fictieve Nederlandse woningdata voor een demo. Gebruik GEEN bestaande personen, echte prijzen of herkenbare adressen. Geef alleen geldig JSON terug met de velden woningtype, adres, plaats, vraagprijs, bouwjaar, woonoppervlakte, perceeloppervlakte, kamers, slaapkamers, ligging, kenmerken (array), staat, bijzonderheden en lengte. Gebruik een geloofwaardige maar fictieve straatnaam.\n\nSTRIKTE REGEL: De "plaats" veld in de JSON MOET exact overeenkomen met de "place" parameter die ik je geef. Gebruik GEEN andere plaatsen.',
        },
        {
          role: 'user',
          content: `Maak een nieuwe, gevarieerde synthetische testwoning die geschikt is om een Funda-, Instagram-, Facebook- en brochuretekst te testen. Kies lengte normaal.\n\nJE PLAATS VELD MOET EXACT DIT ZIJN: ${forcedPlace}\n\nGebruik GEEN andere plaatsen. De interface toont zelf dat dit testdata is; zet geen woorden als fictief, synthetisch of demo in de woningvelden. Gebruik deze variatiecode ${variationSeed} en dit profiel als richting, maar neem niet letterlijk steeds dezelfde waarden over behalve de plaats: ${JSON.stringify(fallbackProfile)}.`,
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
        const imagePrompt = `Create a realistic but entirely fictional real-estate listing photo of a ${String(data.woningtype)} in a Dutch Zeeland village on the island of Tholen, Netherlands. No people, no readable signs, no logos, no exact real-world landmark, no text. Warm daylight, professional property photography. Features typical Zeeland architecture: red brick facades, dark roof tiles, white window frames, possibly a small garden with native Zeeland plants. Include polder landscape or water views in the background. This is variation ${variationSeed}; use a clearly different camera angle, facade composition and garden arrangement from any previous generation.`
        const imageResult = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: imagePrompt,
          size: '1024x1024',
          quality: 'low',
          n: 2,
        })
        images = (await Promise.all((imageResult.data ?? []).map(imageDataUrl))).filter(Boolean)
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

    // Save synthetic home data to funda_descriptions with labels
    try {
      const admin = createClient()
      const totalTokens = (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0)
      
      await admin.from('funda_descriptions').insert({
        client_id: clientId,
        tool_id: access.toolId,
        access_id: access.accessId,
        form_data: {
          woningtype: data.woningtype,
          adres: data.adres,
          plaats: data.plaats,
          vraagprijs: data.vraagprijs,
          bouwjaar: data.bouwjaar,
          woonoppervlakte: data.woonoppervlakte,
          perceeloppervlakte: data.perceeloppervlakte,
          kamers: data.kamers,
          slaapkamers: data.slaapkamers,
          ligging: data.ligging,
          kenmerken: data.kenmerken,
          staat: data.staat,
          bijzonderheden: data.bijzonderheden,
          lengte: data.lengte,
        },
        generated_text: JSON.stringify(data),
        media_format: 'funda',
        source_type: 'synthetic',
        synthetic_label: '[FICTIEVE WONING - TESTDATA]',
        images: images,
        token_count: totalTokens,
        cost_eur: Number((totalTokens / 1000000 * 0.01).toFixed(4)), // Lower cost for synthetic
        is_synthetic: true,
      })
    } catch (saveError) {
      console.warn('Failed to save synthetic funda_description (non-critical):', saveError)
    }

    return response({ data, images, image_source: imageSource, synthetic: true })
  } catch (error) {
    console.error('POST /api/ai/fictieve-woning error:', error)
    return response({ error: 'De fictieve testwoning kon niet worden gegenereerd.' }, 500)
  }
}
