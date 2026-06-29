import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingProposalEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

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

/**
 * POST /api/admin/send-notification
 *
 * Body: { session_id: string }
 *
 * Haalt de sessie + bijbehorende intake + klant op en stuurt
 * het trainingsvoorstel per e-mail naar de klant.
 * Kan meerdere keren aangeroepen worden (resend).
 */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const { session_id } = body as { session_id?: string }

  if (!session_id || typeof session_id !== 'string') {
    return noStore({ error: 'session_id is verplicht' }, 400)
  }

  const admin = createAdminClient()

  // Haal sessie op inclusief intake en klantgegevens
  const { data: session, error: sessionError } = await admin
    .from('training_sessions')
    .select('*, training_intakes(*, clients(name, company, email, contact_person, communication_email, communication_channel))')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return noStore({ error: 'Sessie niet gevonden' }, 404)
  }

  const intake = session.training_intakes as Record<string, unknown> | null
  if (!intake) return noStore({ error: 'Intake niet gekoppeld aan sessie' }, 422)

  const client = intake.clients as Record<string, unknown> | null
  if (!client) return noStore({ error: 'Klant niet gevoppeld aan intake' }, 422)

  // Bepaal het e-mailadres op basis van communicatievoorkeur
  const channel = intake.communication_channel as string | null
  const contactEmail =
    channel === 'email' && intake.communication_email
      ? String(intake.communication_email)
      : String(client.email ?? '')

  if (!contactEmail) {
    return noStore({ error: 'Geen e-mailadres beschikbaar voor deze klant' }, 422)
  }

  const contactName = String(intake.contact_person ?? client.name ?? 'Klant')
  const companyName = String(client.company ?? client.name ?? 'Uw bedrijf')

  try {
    await sendTrainingProposalEmail({
      to: contactEmail,
      contactName,
      companyName,
      sessionStart: session.session_start as string | null,
      durationHours: session.proposed_duration_hours as number | null,
      locationOrLink: session.location_or_link as string | null,
      agenda: session.agenda as string | null,
      confirmToken: session.confirm_token as string,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return noStore({ error: `E-mail versturen mislukt: ${message}` }, 500)
  }

  return noStore({ success: true, sent_to: contactEmail })
}
