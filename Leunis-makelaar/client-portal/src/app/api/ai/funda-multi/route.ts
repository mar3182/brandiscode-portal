import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { FundaTekstRequest, FundaMultiResponse } from '@/lib/types'

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

const SYSTEM_PROMPT = `Je bent een vastgoedcopywriter voor Leunis Makelaars op het eiland Tholen, Zeeland. Je schrijft content voor 4 media-kanalen tegelijk. Geef je antwoord als geldig JSON met PRECIES deze sleutels: "funda", "instagram", "facebook", "brochure".

FUNDA (~400 woorden):
- Warm, persoonlijk, belevingsgericht — de Leunis-stijl
- Structuur: sfeervolle opening → totaalplaatje → ligging → reisafstanden (Bergen op Zoom ±20 min, Breda/Rotterdam/Antwerpen ±40 min) → afsluiting
- Afsluiting altijd: "Wij kunnen ons goed voorstellen dat u deze woning wilt bezichtigen. Neem contact op met Leunis Makelaars voor een afspraak!"

INSTAGRAM (~120 woorden):
- Energiek, visueel en op gevoel gericht
- Maximaal 2 emoji's
- Eindig met 6-8 hashtags: #Tholen #Zeeland #Wonen #LeunisMakelaars #WonenOpZeeland + 2-3 specifieke tags
- Geen prijs

FACEBOOK (~180 woorden):
- Persoonlijker en informatiever dan Instagram — spreek de lezer direct aan als "je"
- Vermeld locatie en de 3 belangrijkste kenmerken
- Eindig met: "Interesse? Neem contact op of bezoek onze website voor meer informatie."
- Geen prijs

BROCHURE (~250 woorden):
- Formeel en professioneel — geschikt voor print
- Neutrale, beschrijvende stijl — geen marketingkreten
- Objectief overzicht: locatie, woningtype, kenmerken, ligging
- Geen uitroeptekens

VOOR ALLE FORMATEN — NOOIT:
- Prijs noemen
- "Uniek" of "droomwoning" gebruiken
- Specifieke kenmerken noemen (balkon, garage, inloopdouche, vloerverwarming, zonnepanelen, airco, laadpaal, dakkapel, etc.) die NIET zijn opgegeven in kenmerken of bijzonderheden`

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI()
    const body: FundaTekstRequest = await req.json()

    const hasImages = Array.isArray(body.images) && body.images.length > 0

    const imageNote = hasImages
      ? `\n\nJe hebt ${body.images!.length} afbeelding(en) ontvangen. Analyseer deze en baseer de beschrijvingen op wat je daadwerkelijk ziet.`
      : '\n\nBELANGRIJK: Geen foto\'s of plattegrond ontvangen. Schrijf GEEN kamer-voor-kamer beschrijving en verzin GEEN specifieke ruimtes.'

    const userPrompt = `Genereer content voor alle 4 kanalen voor deze woning:

Woningtype: ${body.woningtype}
Adres: ${body.adres}
${body.bouwjaar ? `Bouwjaar: ${body.bouwjaar}` : ''}
${body.woonoppervlakte ? `Woonoppervlakte: ${body.woonoppervlakte} m²` : ''}
${body.perceeloppervlakte ? `Perceeloppervlakte: ${body.perceeloppervlakte} m²` : ''}
${body.kamers ? `Kamers: ${body.kamers}` : ''}
${body.slaapkamers ? `Slaapkamers: ${body.slaapkamers}` : ''}
Ligging: ${body.ligging}
Kenmerken: ${body.kenmerken.length > 0 ? body.kenmerken.join(', ') : 'geen opgegeven'}
Staat: ${body.staat}
${body.bijzonderheden ? `Bijzonderheden: ${body.bijzonderheden}` : ''}
${imageNote}

Geef je antwoord als JSON: { "funda": "...", "instagram": "...", "facebook": "...", "brochure": "..." }`

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = hasImages
      ? [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              ...body.images!.map((img) => ({
                type: 'image_url' as const,
                image_url: { url: img, detail: 'low' as const },
              })),
            ],
          },
        ]
      : [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as FundaMultiResponse

    if (!parsed.funda || !parsed.instagram || !parsed.facebook || !parsed.brochure) {
      throw new Error('Onvolledig antwoord van AI — probeer opnieuw')
    }

    return NextResponse.json(parsed, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('funda-multi fout:', message)
    return NextResponse.json(
      { error: `Fout bij genereren: ${message}` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
