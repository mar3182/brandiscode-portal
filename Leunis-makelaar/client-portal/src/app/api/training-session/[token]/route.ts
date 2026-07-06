import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrainingConfirmedEmail, sendRescheduledNotificationEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * GET /api/training-session/[token]
 * Publiek endpoint — geen auth vereist.
 * Geeft sessie + intake-samenvatting terug voor de bevestigingspagina.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient()

  const { data: session, error } = await admin
    .from('training_sessions')
    .select('id, status, session_start, session_end, proposed_duration_hours, location_or_link, agenda, confirmed_at, client_proposed_datetime, training_intakes(contact_person, training_duration, clients(name, company))')
    .eq('confirm_token', params.token)
    .single()

  if (error || !session) return noStore({ error: 'Ongeldig of verlopen bevestigingslink' }, 404)

  // Mask intern veld
  const { training_intakes, ...rest } = session as Record<string, unknown>
  const intake = training_intakes as Record<string, unknown> | null
  const clientInfo = intake?.clients as Record<string, unknown> | null

  return noStore({
    session: rest,
    contactPerson: intake?.contact_person ?? null,
    companyName: clientInfo?.company ?? clientInfo?.name ?? null,
  })
}

/**
 * POST /api/training-session/[token]
 * Body: { action: 'confirm' | 'reschedule', proposed_datetime?: string (ISO), reason?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient()

  const { data: session, error } = await admin
    .from('training_sessions')
    .select('id, status, session_start, intake_id, training_intakes(contact_person, communication_channel, communication_email, clients(name, company, email))')
    .eq('confirm_token', params.token)
    .single()

  if (error || !session) return noStore({ error: 'Ongeldig of verlopen bevestigingslink' }, 404)

  if (session.status === 'confirmed') {
    return noStore({ error: 'Deze training is al bevestigd' }, 409)
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string
    proposed_datetime?: string
    reason?: string
  }

  const { action, proposed_datetime, reason } = body

  if (action !== 'confirm' && action !== 'reschedule') {
    return noStore({ error: 'action moet "confirm" of "reschedule" zijn' }, 400)
  }

  const intake = session.training_intakes as unknown as Record<string, unknown> | null
  const clientData = intake?.clients as { name?: string; company?: string; email?: string } | null

  if (action === 'confirm') {
    const { error: updateError } = await admin
      .from('training_sessions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (updateError) return noStore({ error: updateError.message }, 500)

    // Bevestigings-e-mail naar klant
    const channel = intake?.communication_channel as string | null
    const clientEmail =
      channel === 'email' && intake?.communication_email
        ? String(intake.communication_email)
        : String(clientData?.email ?? '')

    if (clientEmail) {
      await sendTrainingConfirmedEmail(
        clientEmail,
        String(intake?.contact_person ?? clientData?.name ?? 'Klant'),
        session.session_start as string | null
      ).catch(() => {})
    }

    return noStore({ success: true, action: 'confirmed' })
  }

  // action === 'reschedule'
  if (!proposed_datetime || isNaN(Date.parse(proposed_datetime))) {
    return noStore({ error: 'proposed_datetime is verplicht en moet een geldige datum zijn' }, 400)
  }

  const { error: updateError } = await admin
    .from('training_sessions')
    .update({
      status: 'rescheduled',
      client_proposed_datetime: new Date(proposed_datetime).toISOString(),
      rescheduled_reason: typeof reason === 'string' ? reason.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  if (updateError) return noStore({ error: updateError.message }, 500)

  // Notificeer admin
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const clientName = String(clientData?.company ?? clientData?.name ?? 'Onbekende klant')
    await sendRescheduledNotificationEmail(adminEmail, clientName, proposed_datetime).catch(() => {})
  }

  return noStore({ success: true, action: 'rescheduled' })
}
