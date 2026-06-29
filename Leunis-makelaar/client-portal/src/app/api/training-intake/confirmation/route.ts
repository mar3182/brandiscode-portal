import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrainingConfirmedEmail, sendRescheduledNotificationEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/training-intake/confirmation
 * Authenticated — klant bevestigt of stelt nieuwe datum voor vanuit het dashboard.
 * Body: { action: 'accept', session_id: string }
 *    |  { action: 'propose_other_date', session_id: string, proposed_datetime: string, note?: string }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return noStore({ error: 'Niet ingelogd' }, 401)

  const body = await req.json().catch(() => null)
  if (!body || !body.action || !body.session_id) {
    return noStore({ error: 'Verplichte velden ontbreken: action, session_id' }, 400)
  }

  const { action, session_id, proposed_datetime, note } = body as {
    action: string
    session_id: string
    proposed_datetime?: string
    note?: string
  }

  if (action !== 'accept' && action !== 'propose_other_date') {
    return noStore({ error: 'Ongeldige actie. Gebruik "accept" of "propose_other_date".' }, 400)
  }

  if (action === 'propose_other_date' && !proposed_datetime) {
    return noStore({ error: 'proposed_datetime is verplicht bij een tegenvoorstel.' }, 400)
  }

  const admin = createAdminClient()

  // Haal sessie op en verifieer dat die bij deze klant hoort
  const { data: session, error: sessionError } = await admin
    .from('training_sessions')
    .select('id, status, session_start, intake_id, confirm_token, training_intakes(contact_person, communication_channel, communication_email, clients(name, company, email))')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return noStore({ error: 'Sessie niet gevonden' }, 404)
  }

  // Controleer eigenaarschap via client_users
  const { data: clientUser } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email!)
    .single()

  const intake = (Array.isArray(session.training_intakes) ? session.training_intakes[0] : session.training_intakes) as Record<string, unknown> | null
  const clientInfo = intake?.clients as Record<string, unknown> | null

  if (!clientUser || clientInfo?.email !== user.email) {
    // Extra check: zoek de client_id via de intake
    const { data: intakeRow } = await admin
      .from('training_intakes')
      .select('client_id')
      .eq('id', session.intake_id)
      .single()

    if (!intakeRow || intakeRow.client_id !== clientUser?.client_id) {
      return noStore({ error: 'Geen toegang tot deze sessie' }, 403)
    }
  }

  if (session.status === 'confirmed' && action === 'accept') {
    return noStore({ error: 'Deze training is al bevestigd' }, 409)
  }

  const now = new Date().toISOString()

  if (action === 'accept') {
    const { error: updateError } = await admin
      .from('training_sessions')
      .update({ status: 'confirmed', confirmed_at: now })
      .eq('id', session_id)

    if (updateError) return noStore({ error: updateError.message }, 500)

    // Stuur bevestigingsmail naar klant
    try {
      await sendTrainingConfirmedEmail(
        user.email!,
        String(intake?.contact_person ?? user.email),
        session.session_start as string | null,
      )
    } catch {
      // Mail-fout mag de response niet blokkeren
    }

    return noStore({ ok: true, status: 'confirmed' })
  }

  // propose_other_date
  const { error: updateError } = await admin
    .from('training_sessions')
    .update({
      status: 'rescheduled',
      client_proposed_datetime: proposed_datetime,
      rescheduled_reason: note?.trim() || null,
    })
    .eq('id', session_id)

  if (updateError) return noStore({ error: updateError.message }, 500)

  // Stuur notificatie naar admin
  try {
    const adminEmail = process.env.ADMIN_EMAIL!
    const clientLabel = String(clientInfo?.company ?? clientInfo?.name ?? user.email)
    await sendRescheduledNotificationEmail(
      adminEmail,
      clientLabel,
      proposed_datetime!,
    )
  } catch {
    // Mail-fout mag de response niet blokkeren
  }

  return noStore({ ok: true, status: 'rescheduled' })
}
