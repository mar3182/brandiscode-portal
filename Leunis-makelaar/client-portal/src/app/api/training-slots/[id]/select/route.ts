import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingConfirmedEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * POST /api/training-slots/[id]/select
 * Klant kiest een tijdslot → slot wordt gemarkeerd als is_selected
 * en er wordt automatisch een confirmed training_session aangemaakt.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slotId = params.id

  // Controleer of klant ingelogd is
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return noStore({ error: 'Niet ingelogd' }, 401)

  const admin = createAdminClient()

  // Haal slot op
  const { data: slot, error: slotError } = await admin
    .from('training_slots')
    .select('*, training_intakes(client_id, contact_person, communication_email, communication_channel)')
    .eq('id', slotId)
    .single()

  if (slotError || !slot) return noStore({ error: 'Tijdslot niet gevonden' }, 404)

  // Verifieer dat dit slot van de ingelogde klant is
  const { data: clientUser } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .single()

  if (!clientUser || clientUser.client_id !== slot.client_id) {
    return noStore({ error: 'Niet gemachtigd' }, 403)
  }

  if (slot.is_selected) {
    return noStore({ error: 'Dit tijdslot is al gekozen' }, 422)
  }

  // Maak een confirmed training_session aan
  const { data: session, error: sessionError } = await admin
    .from('training_sessions')
    .insert({
      intake_id: slot.intake_id,
      client_id: slot.client_id,
      status: 'confirmed',
      session_start: slot.slot_start,
      session_end: slot.slot_end,
      proposed_duration_hours: null,
      location_or_link: slot.location_or_link,
    })
    .select('id')
    .single()

  if (sessionError || !session) return noStore({ error: 'Sessie aanmaken mislukt' }, 500)

  // Markeer slot als geselecteerd
  await admin
    .from('training_slots')
    .update({
      is_selected: true,
      selected_at: new Date().toISOString(),
      session_id: session.id,
    })
    .eq('id', slotId)

  // Markeer alle andere slots van dezelfde intake als niet-geselecteerd (cleanup)
  await admin
    .from('training_slots')
    .update({ is_selected: false })
    .eq('intake_id', slot.intake_id)
    .neq('id', slotId)

  // Haal klantgegevens op voor email
  const { data: client } = await admin
    .from('clients')
    .select('name, email, billing_email')
    .eq('id', slot.client_id)
    .single()

  const intakeData = slot.training_intakes as Record<string, unknown> | null
  const contactEmail =
    intakeData?.communication_channel === 'email' && intakeData?.communication_email
      ? String(intakeData.communication_email)
      : client?.email ?? ''

  const contactName =
    (intakeData?.contact_person as string | null) ?? client?.name ?? 'Klant'

  // Stuur bevestigingsmail
  if (contactEmail) {
    try {
      await sendTrainingConfirmedEmail(contactEmail, contactName, slot.slot_start)
    } catch (err) {
      console.error('Bevestigingsmail mislukt:', err instanceof Error ? err.message : String(err))
    }
  }

  // Update intake status naar 'planned'
  await admin
    .from('training_intakes')
    .update({ status: 'planned', planned_at: new Date().toISOString() })
    .eq('id', slot.intake_id)

  return noStore({ ok: true, session_id: session.id })
}
