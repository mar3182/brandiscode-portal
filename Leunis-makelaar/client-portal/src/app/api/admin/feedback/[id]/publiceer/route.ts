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

async function generateSocialPosts(
  company: string,
  sprintTitle: string,
  rating: number,
  message: string
): Promise<SocialPosts> {
  const openai = getOpenAI()

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

  return {
    linkedin: parsed.linkedin ?? '',
    instagram: parsed.instagram ?? '',
    facebook: parsed.facebook ?? '',
  }
}

export async function POST(
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

  // Fetch feedback with joins
  const { data: feedback, error: feedbackError } = await admin
    .from('feedback')
    .select(
      `
      id,
      message,
      rating,
      client_id,
      sprint_id,
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
  const contactPerson = clientRow?.contact_person ?? company
  const sprintTitle = sprintRow?.title ?? 'Sprint'
  const rating = (feedback.rating as number | null) ?? 0
  const message = feedback.message as string

  // ── WordPress publicatie ─────────────────────────────────────────────────────
  let wordpressResult: { success: boolean; url?: string; skipped?: boolean; reason?: string }

  const wpUrl = process.env.WORDPRESS_URL
  const wpUsername = process.env.WORDPRESS_USERNAME
  const wpAppPassword = process.env.WORDPRESS_APP_PASSWORD

  if (!wpUrl || !wpAppPassword || !wpUsername) {
    wordpressResult = { success: false, skipped: true, reason: 'env vars not configured' }
  } else {
    try {
      const credentials = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString('base64')

      const wpBody = {
        title: `⭐️ ${rating}/5 — ${company}`,
        content: `${message}\n\n— ${contactPerson}, ${company}`,
        status: 'publish',
        categories: [],
        tags: [],
        meta: { review_rating: rating, review_client: company },
      }

      const wpResponse = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(wpBody),
      })

      if (!wpResponse.ok) {
        const errText = await wpResponse.text()
        wordpressResult = { success: false, reason: errText }
      } else {
        const wpData = (await wpResponse.json()) as { link?: string }
        wordpressResult = { success: true, url: wpData.link }
      }
    } catch (err) {
      wordpressResult = {
        success: false,
        reason: err instanceof Error ? err.message : 'Onbekende fout bij WordPress publicatie',
      }
    }
  }

  // ── AI social posts ──────────────────────────────────────────────────────────
  let socialPosts: SocialPosts = { linkedin: '', instagram: '', facebook: '' }

  try {
    socialPosts = await generateSocialPosts(company, sprintTitle, rating, message)
  } catch (aiErr) {
    console.error('AI social posts genereren mislukt:', aiErr)
  }

  // ── Mark as published ────────────────────────────────────────────────────────
  const { error: updateError } = await admin
    .from('feedback')
    .update({ is_published: true })
    .eq('id', feedbackId)

  if (updateError) {
    console.error('Feedback is_published bijwerken mislukt:', updateError.message)
  }

  return NextResponse.json(
    { wordpress: wordpressResult, socialPosts },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
