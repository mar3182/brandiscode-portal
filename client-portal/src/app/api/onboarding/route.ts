import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getCallerClientId() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .order('created_at', { ascending: true })
    .limit(1)

  return data?.[0]?.client_id || null
}

export async function GET() {
  const clientId = await getCallerClientId()
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select(
      'id, email, name, company, phone, contact_person, kvk_number, btw_number, iban, billing_email, ' +
      'billing_address_line1, billing_address_line2, billing_postal_code, billing_city, billing_country, onboarding_completed_at, created_at'
    )
    .eq('id', clientId)
    .single()

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })

  const { data: offertes, error: offertesError } = await admin
    .from('offertes')
    .select('id')
    .eq('client_id', clientId)

  if (offertesError) return NextResponse.json({ error: offertesError.message }, { status: 500 })

  const offerteIds = (offertes || []).map((o) => o.id)
  if (offerteIds.length === 0) {
    return NextResponse.json(
      {
        client: client ?? null,
        questions: [],
      },
      { status: 200 }
    )
  }

  const { data: questions, error: questionsError } = await admin
    .from('onboarding_questions')
    .select('*')
    .in('offerte_id', offerteIds)
    .order('sort_order', { ascending: true })

  if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 })

  const questionIds = (questions || []).map((q) => q.id)
  const { data: answers, error: answersError } = questionIds.length
    ? await admin
      .from('onboarding_answers')
      .select('*')
      .eq('client_id', clientId)
      .in('question_id', questionIds)
    : { data: [], error: null }

  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 })

  const answerMap = new Map((answers || []).map((a) => [a.question_id, a.answer]))
  const merged = (questions || []).map((q) => ({
    ...q,
    answer: answerMap.get(q.id) ?? null,
  }))

  return NextResponse.json({
    client: client ?? null,
    questions: merged,
  })
}

export async function POST(req: NextRequest) {
  const clientId = await getCallerClientId()
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { question_id, answer } = body

  if (!question_id || typeof answer !== 'string') {
    return NextResponse.json({ error: 'question_id en answer zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('onboarding_answers')
    .upsert(
      {
        question_id,
        client_id: clientId,
        answer,
        answered_at: new Date().toISOString(),
      },
      { onConflict: 'question_id,client_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
