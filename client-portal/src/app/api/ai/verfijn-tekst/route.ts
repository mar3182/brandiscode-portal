import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { VerfijnRequest, VerfijnResponse } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId, checkAiToolLimit, ensureAiBillingDraft, logAiUsage, limitReachedMessage } from '@/lib/ai-usage'
import { getToolAccessOrThrow } from '@/lib/ai-tool-access'

export const dynamic = 'force-dynamic'

function getOpenAI(): OpenAI {
  // OPENAI_API_KEY is preferred (has credits now)
  console.log('🔍 getOpenAI() called. GITHUB_TOKEN present:', !!process.env.GITHUB_TOKEN, 'OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    console.log('✅ Using OPENAI_API_KEY -> OpenAI direct')
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  // Fallback to GitHub Models / Azure
  if (process.env.GITHUB_TOKEN) {
    console.log('✅ Using GITHUB_TOKEN -> Azure Models')
    return new OpenAI({
      apiKey: process.env.GITHUB_TOKEN,
      baseURL: 'https://models.inference.ai.azure.com',
    })
  }
  console.error('❌ Neither GITHUB_TOKEN nor OPENAI_API_KEY available!')
  throw new Error('Geen GITHUB_TOKEN of OPENAI_API_KEY geconfigureerd')
}

const FORMAT_CONTEXT: Record<string, string> = {
  funda: 'Funda-advertentietekst in de stijl van Leunis Makelaars (~400 woorden, warm en belevingsgericht)',
  instagram: 'Instagram post voor Leunis Makelaars (~120 woorden + hashtags, energiek en visueel)',
  facebook: 'Facebook post voor Leunis Makelaars (~180 woorden, persoonlijk en informatief)',
  brochure: 'Brochure tekst voor Leunis Makelaars (~250 woorden, formeel en professioneel)',
}

export async function POST(req: NextRequest) {
  // Haal client_id op voor logging (verfijnen telt NIET mee als generatie)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json(
      { error: 'Niet ingelogd' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const provider = process.env.GITHUB_TOKEN ? 'github-models' : 'openai'
  const model = 'gpt-4o'
  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return NextResponse.json(
      { error: 'Je klanttoegang kon niet worden vastgesteld.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const access = await getToolAccessOrThrow(clientId, 'funda-tekst')
  if (!access.allowed || !access.toolId) {
    return NextResponse.json(
      { error: access.error || 'Je hebt nog geen toegang tot deze AI-tool. Neem contact op met Brand is Code.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const usage = await checkAiToolLimit(clientId, access.toolId, access.monthlyTokenLimit)
  if (!usage.allowed) {
    return NextResponse.json(
      { error: limitReachedMessage(usage.usedThisMonth, usage.limit ?? 0) },
      { status: 429, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const openai = getOpenAI()
    console.log(`🚀 Starting verfijn-tekst with provider: ${provider}`)
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

    if (clientId) {
      await logAiUsage({
        clientId,
        toolName: 'funda-tekst',
        provider,
        model,
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        status: 'success',
      })
      await ensureAiBillingDraft({
        clientId,
        toolId: access.toolId,
        accessId: access.accessId,
        monthlyTokenLimit: access.monthlyTokenLimit,
        userId: user.id,
      })
    }

    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const fullError = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    console.error('❌ Verfijn-tekst API error:', {
      message: fullError,
      provider,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasGitHubToken: !!process.env.GITHUB_TOKEN,
    })
    if (err instanceof Error && 'status' in err) {
      console.error('OpenAI API status:', (err as any).status)
      console.error('OpenAI API response:', (err as any).response?.data || (err as any).error)
    }
    return NextResponse.json(
      { error: `Verfijn mislukt: ${message}` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
