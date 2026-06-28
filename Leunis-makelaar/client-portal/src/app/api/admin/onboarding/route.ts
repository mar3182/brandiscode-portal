import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

function jsonNoStore(payload: any, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return jsonNoStore({ error: 'Unauthorized' }, 401)

  const offerteId = req.nextUrl.searchParams.get('offerte_id')
  const clientEmail = req.nextUrl.searchParams.get('client_email')
  if (!offerteId) return jsonNoStore({ error: 'offerte_id is verplicht' }, 400)

  const admin = createAdminClient()

  const { data: offerte, error: offerteError } = await admin
    .from('offertes')
    .select('id, client_id, title')
    .eq('id', offerteId)
    .single()

  if (offerteError) return jsonNoStore({ error: offerteError.message }, 500)

  let clientId = offerte?.client_id || null
  let candidateClientIds: string[] = clientId ? [clientId] : []

  if (clientEmail) {
    const { data: clientUserByEmail } = await admin
      .from('client_users')
      .select('client_id')
      .eq('email', clientEmail)
      .single()

    if (clientUserByEmail?.client_id) {
      clientId = clientUserByEmail.client_id
    }
  }

  if (clientId) {
    const { data: baseClient } = await admin
      .from('clients')
      .select('company')
      .eq('id', clientId)
      .single()

    if (baseClient?.company) {
      const { data: companyClients } = await admin
        .from('clients')
        .select('id')
        .eq('company', baseClient.company)

      const ids = (companyClients || []).map((c) => c.id)
      if (ids.length > 0) {
        candidateClientIds = Array.from(new Set([...(candidateClientIds || []), ...ids]))
      }
    }

    if (!candidateClientIds.includes(clientId)) {
      candidateClientIds.push(clientId)
    }
  }

  let { data: questions, error: questionsError } = await admin
    .from('onboarding_questions')
    .select('*')
    .eq('offerte_id', offerteId)
    .order('sort_order', { ascending: true })

  // Fallback: some environments contain duplicate/new offerte rows while onboarding
  // questions were attached to another offerte of the same client.
  if (!questionsError && (!questions || questions.length === 0) && clientId) {
    const { data: clientOffertes, error: clientOffertesError } = await admin
      .from('offertes')
      .select('id')
      .eq('client_id', clientId)

    if (clientOffertesError) {
      return jsonNoStore({ error: clientOffertesError.message }, 500)
    }

    const clientOfferteIds = (clientOffertes || []).map((o) => o.id)
    if (clientOfferteIds.length > 0) {
      const fallback = await admin
        .from('onboarding_questions')
        .select('*')
        .in('offerte_id', clientOfferteIds)
        .order('sort_order', { ascending: true })

      questions = fallback.data || []
      questionsError = fallback.error
    }
  }

  if (questionsError) return jsonNoStore({ error: questionsError.message }, 500)

  let questionIds = (questions || []).map((q) => q.id)
  let { data: answers, error: answersError } = questionIds.length
    ? await admin
      .from('onboarding_answers')
      .select('*')
      .in('question_id', questionIds)
      .order('answered_at', { ascending: false })
    : { data: [], error: null }

  if (answersError) return jsonNoStore({ error: answersError.message }, 500)

  const byQuestion = new Map<string, any[]>()
  for (const answer of answers || []) {
    const existing = byQuestion.get(answer.question_id) || []
    existing.push(answer)
    byQuestion.set(answer.question_id, existing)
  }

  // Robust fallback for missing direct question_id matches:
  // use all answers of this client and map by sort_order (primary) and question text (secondary).
  if ((candidateClientIds || []).length > 0 && (questions || []).length > 0) {
    const { data: clientAnswers, error: clientAnswersError } = await admin
      .from('onboarding_answers')
      .select('id, question_id, client_id, answer, answered_at')
      .in('client_id', candidateClientIds)
      .order('answered_at', { ascending: false })

    if (clientAnswersError) {
      return jsonNoStore({ error: clientAnswersError.message }, 500)
    }

    const clientAnswerQuestionIds = Array.from(
      new Set((clientAnswers || []).map((a: any) => a.question_id).filter(Boolean))
    )

    const { data: answerQuestions, error: answerQuestionsError } = clientAnswerQuestionIds.length
      ? await admin
        .from('onboarding_questions')
        .select('id, question, sort_order, offerte_id')
        .in('id', clientAnswerQuestionIds)
      : { data: [], error: null }

    if (answerQuestionsError) {
      return jsonNoStore({ error: answerQuestionsError.message }, 500)
    }

    const questionMetaById = new Map<string, any>()
    for (const q of answerQuestions || []) {
      questionMetaById.set(q.id, q)
    }

    const byQuestionText = new Map<string, any[]>()
    const bySortOrder = new Map<number, any[]>()
    for (const entry of clientAnswers || []) {
      const related = questionMetaById.get(entry.question_id)

      const text = related?.question
      if (!text || typeof text !== 'string') continue

      const sortOrder = related?.sort_order
      if (typeof sortOrder === 'number') {
        const existingByOrder = bySortOrder.get(sortOrder) || []
        existingByOrder.push(entry)
        bySortOrder.set(sortOrder, existingByOrder)
      }

      const key = text.trim().toLowerCase()
      const existing = byQuestionText.get(key) || []
      existing.push(entry)
      byQuestionText.set(key, existing)
    }

    for (const q of questions || []) {
      if ((byQuestion.get(q.id) || []).length > 0) continue

      const fromOrder = bySortOrder.get(q.sort_order)
      if (fromOrder && fromOrder.length > 0) {
        byQuestion.set(q.id, fromOrder)
        continue
      }

      const key = (q.question || '').trim().toLowerCase()
      const mapped = byQuestionText.get(key)
      if (mapped && mapped.length > 0) {
        byQuestion.set(q.id, mapped)
      }
    }
  }

  // Final fallback: if still no answers, resolve by identical offerte title and sort_order
  // across all matching offerte variants (ignores client mismatch noise).
  const hasAnyAnswer = (questions || []).some((q: any) => (byQuestion.get(q.id) || []).length > 0)
  if (!hasAnyAnswer && offerte?.title && (questions || []).length > 0) {
    const { data: siblingOffertes, error: siblingOffertesError } = await admin
      .from('offertes')
      .select('id')
      .eq('title', offerte.title)

    if (siblingOffertesError) {
      return jsonNoStore({ error: siblingOffertesError.message }, 500)
    }

    const siblingOfferteIds = (siblingOffertes || []).map((o) => o.id)
    if (siblingOfferteIds.length > 0) {
      const { data: siblingQuestions, error: siblingQuestionsError } = await admin
        .from('onboarding_questions')
        .select('id, sort_order')
        .in('offerte_id', siblingOfferteIds)

      if (siblingQuestionsError) {
        return jsonNoStore({ error: siblingQuestionsError.message }, 500)
      }

      const siblingQuestionIds = (siblingQuestions || []).map((q) => q.id)
      const sortByQuestionId = new Map<string, number>()
      for (const q of siblingQuestions || []) {
        sortByQuestionId.set(q.id, q.sort_order)
      }

      if (siblingQuestionIds.length > 0) {
        const { data: siblingAnswers, error: siblingAnswersError } = await admin
          .from('onboarding_answers')
          .select('id, question_id, client_id, answer, answered_at')
          .in('question_id', siblingQuestionIds)
          .order('answered_at', { ascending: false })

        if (siblingAnswersError) {
          return jsonNoStore({ error: siblingAnswersError.message }, 500)
        }

        const bySortOrderGlobal = new Map<number, any[]>()
        for (const a of siblingAnswers || []) {
          const sortOrder = sortByQuestionId.get(a.question_id)
          if (typeof sortOrder !== 'number') continue
          if (typeof a.answer !== 'string' || a.answer.trim().length === 0) continue
          const existing = bySortOrderGlobal.get(sortOrder) || []
          existing.push(a)
          bySortOrderGlobal.set(sortOrder, existing)
        }

        for (const q of questions || []) {
          if ((byQuestion.get(q.id) || []).length > 0) continue
          const mapped = bySortOrderGlobal.get(q.sort_order)
          if (mapped && mapped.length > 0) {
            byQuestion.set(q.id, mapped)
          }
        }
      }
    }
  }

  const firstNonEmptyAnswer = (items: any[]) =>
    (items || []).find((a: any) => typeof a?.answer === 'string' && a.answer.trim().length > 0)

  const merged = (questions || []).map((q) => ({
    ...q,
    answers: byQuestion.get(q.id) || [],
    answer: firstNonEmptyAnswer(byQuestion.get(q.id) || [])?.answer || null,
  }))

  return jsonNoStore(merged)
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { offerte_id, question, hint, answer_type, options, sort_order, is_required } = body

  if (!offerte_id || !question) {
    return NextResponse.json({ error: 'offerte_id en question zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('onboarding_questions')
    .insert({
      offerte_id,
      question,
      hint: hint ?? null,
      answer_type: answer_type || 'text',
      options: options ?? null,
      sort_order: sort_order ?? 0,
      is_required: is_required ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questionId = req.nextUrl.searchParams.get('id')
  if (!questionId) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('onboarding_questions').delete().eq('id', questionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
