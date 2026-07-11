import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingConfirmedEmail, sendTrainingProposalEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

/**
 * POST /api/admin/training-sessions/:id/decision
 * Body:
 *   action: 'accept' | 'reject' | 'counter_propose'
 *   session_start?: string (required for counter_propose)
 *   note?: string
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const action = typeof body.action === 'string' ? body.action : ''
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const proposedStart = parseDate(body.session_start)

  if (!['accept', 'reject', 'counter_propose'].includes(action)) {
    return noStore({ error: 'Ongeldige actie' }, 400)
  }

  if (action === 'counter_propose' && !proposedStart) {
    return noStore({ error: 'session_start is verplicht voor een tegenvoorstel' }, 400)
  }

  const admin = createAdminClient()

  const { data: session, error: sessionError } = await admin
    .from('training_sessions')
    .select('id, status, session_start, client_proposed_datetime, intake_id, confirm_token, proposed_duration_hours, location_or_link, agenda, training_intakes(contact_person, communication_channel, communication_email, clients(name, company, email))')
    .eq('id', params.id)
    .single()

  if (sessionError || !session) {
    return noStore({ error: 'Sessie niet gevonden' }, 404)
  }

  const intake = (Array.isArray(session.training_intakes) ? session.training_intakes[0] : session.training_intakes) as Record<string, unknown> | null
  const clientData = intake?.clients as Record<string, unknown> | null
  const channel = intake?.communication_channel as string | null
  const clientEmail = channel === 'email' && intake?.communication_email
    ? String(intake.communication_email)
    : String(clientData?.email ?? '')
  const contactName = String(intake?.contact_person ?? clientData?.name ?? 'Klant')
  const chosenStart = session.client_proposed_datetime ? new Date(session.client_proposed_datetime).toISOString() : session.session_start as string | null

  if (action === 'accept') {
    const { error: updateError } = await admin
      .from('training_sessions')
      .update({
        status: 'confirmed',
        session_start: chosenStart,
        confirmed_at: new Date().toISOString(),
        client_proposed_datetime: null,
        rescheduled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (updateError) return noStore({ error: updateError.message }, 500)

    if (clientEmail) {
      await sendTrainingConfirmedEmail(clientEmail, contactName, chosenStart).catch(() => {})
    }

    return noStore({ ok: true, action: 'accepted', session_start: chosenStart })
  }

  if (action === 'reject') {
    const { error: updateError } = await admin
      .from('training_sessions')
      .update({
        status: 'proposed',
        client_proposed_datetime: null,
        rescheduled_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (updateError) return noStore({ error: updateError.message }, 500)
    return noStore({ ok: true, action: 'rejected' })
  }

  // counter_propose
  const { error: updateError } = await admin
    .from('training_sessions')
    .update({
      status: 'proposed',
      session_start: proposedStart,
      client_proposed_datetime: null,
      rescheduled_reason: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (updateError) return noStore({ error: updateError.message }, 500)

  if (clientEmail) {
    await sendTrainingProposalEmail({
      to: clientEmail,
      contactName,
      companyName: String(clientData?.company ?? clientData?.name ?? 'Uw bedrijf'),
      sessionStart: proposedStart,
      durationHours: session.proposed_duration_hours as number | null,
      locationOrLink: session.location_or_link as string | null,
      agenda: session.agenda as string | null,
      confirmToken: String(session.confirm_token),
    }).catch(() => {})
  }

  return noStore({ ok: true, action: 'counter_proposed', session_start: proposedStart })
}
