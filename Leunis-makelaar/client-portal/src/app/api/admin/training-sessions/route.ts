import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingProposalEmail } from '@/lib/email'
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

/**
 * POST /api/admin/training-sessions
 *
 * Body:
 *   intake_id:                  string (required)
 *   session_start:              ISO datetime (required)
 *   proposed_duration_hours:    2 | 3 (optional, default null)
 *   location_or_link:           string (optional)
 *   agenda:                     string (optional, newline-separated items)
 *   admin_notes:                string (optional)
 *   send_email:                 boolean (optional, default true)
 *
 * Returneert de nieuwe sessie + confirm_token
 * Stuurt automatisch e-mail naar klant tenzij send_email=false
 */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { intake_id, session_start, proposed_duration_hours, location_or_link, agenda, admin_notes, send_email } = body

  if (!intake_id || typeof intake_id !== 'string') {
    return noStore({ error: 'intake_id is verplicht' }, 400)
  }

  if (!session_start || typeof session_start !== 'string' || isNaN(Date.parse(session_start))) {
    return noStore({ error: 'session_start is verplicht en moet een geldige ISO datetime zijn' }, 400)
  }

  const admin = createAdminClient()

  // Haal intake + klant gegevens op
  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select(`
      id, client_id, status, contact_person, communication_channel, communication_email, communication_whatsapp,
      clients(name, company, email)
    `)
    .eq('id', intake_id)
    .single()

  if (intakeError) return noStore({ error: 'Intake niet gevonden' }, 404)

  const clientData = (intake?.clients as unknown as Record<string, unknown>) || null

  // Maak sessie aan
  const { data: newSession, error: sessionError } = await admin
    .from('training_sessions')
    .insert({
      intake_id,
      client_id: intake.client_id,
      status: 'proposed',
      session_start: new Date(session_start as string).toISOString(),
      session_end: null,
      proposed_duration_hours: proposed_duration_hours ? Number(proposed_duration_hours) : null,
      location_or_link: typeof location_or_link === 'string' ? location_or_link.trim() || null : null,
      agenda: typeof agenda === 'string' ? agenda.trim() || null : null,
      admin_notes: typeof admin_notes === 'string' ? admin_notes.trim() || null : null,
      created_by: user.id,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select('id, confirm_token, session_start, proposed_duration_hours, location_or_link, agenda')
    .single()

  if (sessionError) return noStore({ error: sessionError.message }, 500)

  // Stuur e-mail tenzij send_email=false
  let emailSent = false
  if (send_email !== false && newSession) {
    try {
      const channel = intake.communication_channel as string | null
      const contactEmail =
        channel === 'email' && intake.communication_email
          ? String(intake.communication_email)
          : String(clientData?.email ?? '')

      if (contactEmail) {
        await sendTrainingProposalEmail({
          to: contactEmail,
          contactName: String(intake.contact_person ?? clientData?.name ?? 'Klant'),
          companyName: String(clientData?.company ?? clientData?.name ?? 'Uw bedrijf'),
          sessionStart: newSession.session_start as string | null,
          durationHours: newSession.proposed_duration_hours as number | null,
          locationOrLink: newSession.location_or_link as string | null,
          agenda: newSession.agenda as string | null,
          confirmToken: newSession.confirm_token as string,
        })
        emailSent = true
      }
    } catch (err) {
      // Log fout maar blokkeer niet de response — sessie is wél aangemaakt
      console.error('Training proposal email failed:', err instanceof Error ? err.message : String(err))
    }
  }

  return noStore(
    {
      success: true,
      session_id: newSession?.id,
      confirm_token: newSession?.confirm_token,
      email_sent: emailSent,
    },
    201
  )
}
