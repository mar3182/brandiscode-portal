import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrainingConfirmedEmail, sendRescheduledNotificationEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) return null
  return new Date(ms)
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
    .select('id, status, session_start, intake_id, confirm_token, metadata, training_intakes(contact_person, communication_channel, communication_email, clients(name, company, email))')
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

  const sessionStartDate = parseIsoDate(session.session_start)
  const proposedDate = parseIsoDate(proposed_datetime)
  if (!sessionStartDate || !proposedDate) {
    return noStore({ error: 'Huidige sessiedatum of tegenvoorstel is ongeldig' }, 400)
  }

  if (proposedDate.getTime() <= sessionStartDate.getTime()) {
    return noStore({ error: 'Tegenvoorstel moet later zijn dan de huidige trainingsdatum' }, 422)
  }

  const metadata = asRecord(session.metadata)
  const deadlineFromMeta = parseIsoDate(metadata.reschedule_until)
  const windowHours =
    typeof metadata.reschedule_window_hours === 'number'
      ? metadata.reschedule_window_hours
      : typeof metadata.reschedule_window_hours === 'string'
        ? Number(metadata.reschedule_window_hours)
        : Number(process.env.TRAINING_RESCHEDULE_DEFAULT_HOURS ?? 24)

  const deadlineDate = deadlineFromMeta
    ?? (Number.isFinite(windowHours)
      ? new Date(sessionStartDate.getTime() - Math.max(0, windowHours) * 60 * 60 * 1000)
      : null)

  if (deadlineDate && new Date().getTime() > deadlineDate.getTime()) {
    return noStore({
      error: `Wijzigen kan niet meer. De wijzigtermijn liep tot ${deadlineDate.toLocaleString('nl-NL')}.`,
    }, 422)
  }

  // propose_other_date — zet status terug op proposed zodat admin opnieuw kan beoordelen
  const { error: updateError } = await admin
    .from('training_sessions')
    .update({
      status: 'rescheduled',
      client_proposed_datetime: proposedDate.toISOString(),
      rescheduled_reason: note?.trim() || null,
      metadata: {
        ...metadata,
        proposed_at: now,
      },
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
