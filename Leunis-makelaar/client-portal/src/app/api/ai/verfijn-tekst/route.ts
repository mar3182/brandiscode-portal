import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { VerfijnRequest, VerfijnResponse } from '@/lib/types'

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

const FORMAT_CONTEXT: Record<string, string> = {
  funda: 'Funda-advertentietekst in de stijl van Leunis Makelaars (~400 woorden, warm en belevingsgericht)',
  instagram: 'Instagram post voor Leunis Makelaars (~120 woorden + hashtags, energiek en visueel)',
  facebook: 'Facebook post voor Leunis Makelaars (~180 woorden, persoonlijk en informatief)',
  brochure: 'Brochure tekst voor Leunis Makelaars (~250 woorden, formeel en professioneel)',
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI()
    const body: VerfijnRequest = await req.json()

    if (!body.tekst?.trim() || !body.instructie?.trim()) {
      return NextResponse.json(
        { error: 'tekst en instructie zijn verplicht' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const formatContext = FORMAT_CONTEXT[body.format] ?? FORMAT_CONTEXT.funda

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Je bent copywriter voor Leunis Makelaars. Pas de onderstaande ${formatContext} aan op basis van de instructie van de makelaar. Geef ALLEEN de verbeterde tekst terug — geen uitleg, geen aanhalingstekens eromheen. Behoud de stijl en het format. Verzin GEEN nieuwe feiten of kenmerken die niet in de originele tekst staan.`,
        },
        {
          role: 'user',
          content: `Instructie van de makelaar: ${body.instructie}\n\nOriginele tekst:\n${body.tekst}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const tekst = completion.choices[0]?.message?.content?.trim() ?? ''
    const response: VerfijnResponse = { tekst }
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('verfijn-tekst fout:', message)
    return NextResponse.json(
      { error: `Verfijn mislukt: ${message}` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
