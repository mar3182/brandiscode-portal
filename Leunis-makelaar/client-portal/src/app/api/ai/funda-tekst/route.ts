import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { FundaTekstRequest, FundaTekstResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `Je bent een professionele vastgoedtekstschrijver voor Leunis Makelaars op het eiland Tholen, Zeeland. Je schrijft wervende Funda-advertentieteksten in de herkenbare stijl van Leunis Makelaars.

SCHRIJFSTIJL:
- Warm, persoonlijk en belevingsgericht (niet droog of zakelijk)
- Enthousiasmerend maar authentiek — geen overdreven superlatieven
- Beschrijvende, sfeervolle taal: "karaktervolle", "sfeervolle", "royale", "fijne lichtinval"
- Professioneel-informeel: spreek de lezer aan als "je" of "u" (wissel niet)

VASTE STRUCTUUR:
1. Openingszin: sfeervolle inleiding met locatie en karakter van de woning (GEEN prijs noemen)
2. Beknopte introductie van het totaalplaatje
3. Kamer-voor-kamer beschrijving: Begane grond → 1e verdieping → eventueel 2e verdieping → Tuin/buitenruimte
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
    const body: FundaTekstRequest = await req.json()

    const lengteInstructie = {
      kort: 'Schrijf een beknopte tekst van circa 200 woorden.',
      normaal: 'Schrijf een volledige tekst van circa 400 woorden.',
      uitgebreid: 'Schrijf een uitgebreide tekst van circa 600 woorden met gedetailleerde kamer-voor-kamer beschrijving.',
    }[body.lengte]

    const userPrompt = `Schrijf een Funda-advertentietekst voor de volgende woning:

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

${lengteInstructie}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    })

    const tekst = completion.choices[0]?.message?.content ?? ''
    const woorden = tekst.split(/\s+/).filter(Boolean).length

    const response: FundaTekstResponse = { tekst, woorden }
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('Funda-tekst fout:', err)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden bij het genereren van de tekst.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
