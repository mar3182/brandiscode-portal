import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { FundaTekstRequest, FundaTekstResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getOpenAI(): OpenAI {
  if (process.env.GITHUB_TOKEN) {
    return new OpenAI({
      apiKey: process.env.GITHUB_TOKEN,
      baseURL: 'https://models.inference.ai.azure.com',
    })
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  throw new Error('Geen GITHUB_TOKEN of OPENAI_API_KEY geconfigureerd')
}

const SYSTEM_PROMPT = `Je bent een professionele vastgoedtekstschrijver voor Leunis Makelaars op het eiland Tholen, Zeeland. Je schrijft wervende Funda-advertentieteksten in de herkenbare stijl van Leunis Makelaars.

SCHRIJFSTIJL:
- Warm, persoonlijk en belevingsgericht (niet droog of zakelijk)
- Enthousiasmerend maar authentiek — geen overdreven superlatieven
- Beschrijvende, sfeervolle taal: "karaktervolle", "sfeervolle", "royale", "fijne lichtinval"
- Professioneel-informeel: spreek de lezer aan als "je" of "u" (wissel niet)

VASTE STRUCTUUR:
1. Openingszin: sfeervolle inleiding met locatie en karakter van de woning (GEEN prijs noemen)
2. Beknopte introductie van het totaalplaatje
3. Ruimtebeschrijving: ALLEEN als je foto's of plattegrond hebt ontvangen maak je een kamer-voor-kamer beschrijving. Zonder beelden: schrijf sfeervolle algemene beschrijving. Verzin NOOIT specifieke kamers, ruimtes of details die niet zijn opgegeven of zichtbaar zijn.
4. Plaatsbeschrijving: "Tholen staat bekend om..." of de betreffende kern op het eiland
5. Reisafstanden: Bergen op Zoom ±20 min, Breda/Rotterdam/Antwerpen ±40 min
6. Vaste afsluiting: "Wij kunnen ons goed voorstellen dat u deze woning wilt bezichtigen. Neem contact op met Leunis Makelaars voor een afspraak!"

NOOIT:
- Prijs noemen
- "Uniek" of "droomwoning" gebruiken (te cliché)
- Meer dan 2 uitroeptekens in de hele tekst

VOORBEELDSTIJL (Hoogstraat 5, Tholen):
"Aan één van de oudste en meest karaktervolle straten van de historische binnenstad van Tholen staat dit schitterende Rijksmonument uit 1849. Een woning waar sfeer, historie en warmte op een unieke manier samenkomen. Authentieke details zoals hoge balkenplafonds, glas-in-loodramen, fraaie vloeren en karaktervolle raampartijen geven het huis een bijzondere uitstraling, terwijl de praktische indeling en het wooncomfort perfect aansluiten op het leven van nu."

WOORDAANTALLEN:
- kort: ~200 woorden
- normaal: ~400 woorden  
- uitgebreid: ~600 woorden`

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI()
    const body: FundaTekstRequest = await req.json()

    const lengteInstructie = {
      kort: 'Schrijf een beknopte tekst van circa 200 woorden.',
      normaal: 'Schrijf een volledige tekst van circa 400 woorden.',
      uitgebreid: 'Schrijf een uitgebreide tekst van circa 600 woorden met gedetailleerde kamer-voor-kamer beschrijving.',
    }[body.lengte]

    const hasImages = Array.isArray(body.images) && body.images.length > 0

    const imageNote = hasImages
      ? `\n\nJe hebt ${body.images!.length} afbeelding(en) ontvangen (foto's en/of plattegrond). Analyseer deze nauwkeurig. Baseer de ruimtebeschrijving uitsluitend op wat je daadwerkelijk ziet.`
      : '\n\nBELANGRIJK: Je hebt géén foto\'s of plattegrond ontvangen. Schrijf GEEN kamer-voor-kamer beschrijving en verzin GEEN specifieke ruimtes of details. Houd de beschrijving sfeervolle en algemeen, gebaseerd op de opgegeven gegevens.'

    const userPromptText = `Schrijf een Funda-advertentietekst voor de volgende woning:

Woningtype: ${body.woningtype}
Adres: ${body.adres}
${body.bouwjaar ? `Bouwjaar: ${body.bouwjaar}` : ''}
${body.woonoppervlakte ? `Woonoppervlakte: ${body.woonoppervlakte} m²` : ''}
${body.perceeloppervlakte ? `Perceeloppervlakte: ${body.perceeloppervlakte} m²` : ''}
${body.kamers ? `Kamers: ${body.kamers}` : ''}
${body.slaapkamers ? `Slaapkamers: ${body.slaapkamers}` : ''}
Ligging: ${body.ligging}
Kenmerken: ${body.kenmerken.join(', ')}
Staat: ${body.staat}
${body.bijzonderheden ? `Bijzonderheden: ${body.bijzonderheden}` : ''}

${lengteInstructie}${imageNote}`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = hasImages
      ? [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptText },
              ...body.images!.map((img) => ({
                type: 'image_url' as const,
                image_url: { url: img, detail: 'low' as const },
              })),
            ],
          },
        ]
      : [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPromptText },
        ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    })

    const tekst = completion.choices[0]?.message?.content ?? ''
    const woorden = tekst.split(/\s+/).filter(Boolean).length

    const response: FundaTekstResponse = { tekst, woorden }
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Funda-tekst fout:', message)
    return NextResponse.json(
      { error: `Fout bij genereren: ${message}` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
