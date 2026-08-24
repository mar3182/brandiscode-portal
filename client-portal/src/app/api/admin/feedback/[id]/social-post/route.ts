import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

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

interface SocialPosts {
  linkedin: string
  instagram: string
  facebook: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json(
      { error: 'Geen toegang' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { id: feedbackId } = params
  const admin = createAdminClient()

  const { data: feedback, error: feedbackError } = await admin
    .from('feedback')
    .select(
      `
      id,
      message,
      rating,
      clients ( company, contact_person ),
      sprints ( title )
    `
    )
    .eq('id', feedbackId)
    .single()

  if (feedbackError || !feedback) {
    return NextResponse.json(
      { error: 'Feedback niet gevonden' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const clientRow = (feedback.clients as unknown) as { company: string | null; contact_person: string | null } | null
  const sprintRow = (feedback.sprints as unknown) as { title: string } | null

  const company = clientRow?.company ?? 'Onbekend bedrijf'
  const sprintTitle = sprintRow?.title ?? 'Sprint'
  const rating = (feedback.rating as number | null) ?? 0
  const message = feedback.message as string

  const openai = getOpenAI()

  let socialPosts: SocialPosts

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Je bent een social media expert voor Brand is Code, een AI-consultancybedrijf. Genereer drie varianten op basis van een klantreview. Tone: professioneel maar persoonlijk, geen overdreven superlatieven. Taal: Nederlands.',
        },
        {
          role: 'user',
          content: `Review van ${company} (Sprint: ${sprintTitle}, Rating: ${rating}/5):\n"${message}"\n\nGenereer:\n1. LinkedIn post (max 200 woorden, zakelijk)\n2. Instagram caption (max 100 woorden, energiek, max 5 hashtags)\n3. Facebook post (max 150 woorden, warm en toegankelijk)\n\nFormatteer als JSON: { "linkedin": "...", "instagram": "...", "facebook": "..." }`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Partial<SocialPosts>

    socialPosts = {
      linkedin: parsed.linkedin ?? '',
      instagram: parsed.instagram ?? '',
      facebook: parsed.facebook ?? '',
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `AI-generatie mislukt: ${err instanceof Error ? err.message : 'Onbekende fout'}`,
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(socialPosts, { headers: { 'Cache-Control': 'no-store' } })
}
