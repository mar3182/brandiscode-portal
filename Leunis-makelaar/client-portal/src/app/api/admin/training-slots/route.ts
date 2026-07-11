import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
 * GET /api/admin/training-slots?intake_id=xxx
 * Haalt alle slots op voor een intake
 */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const intakeId = req.nextUrl.searchParams.get('intake_id')
  if (!intakeId) return noStore({ error: 'intake_id is verplicht' }, 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('training_slots')
    .select('*')
    .eq('intake_id', intakeId)
    .order('slot_start', { ascending: true })

  if (error) return noStore({ error: error.message }, 500)
  return noStore({ slots: data })
}

/**
 * POST /api/admin/training-slots
 * Voegt een nieuw tijdslot toe voor een intake
 *
 * Body: { intake_id, slot_start, slot_end?, location_or_link? }
 */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { intake_id, slot_start, slot_end, location_or_link } = body

  if (!intake_id || typeof intake_id !== 'string') {
    return noStore({ error: 'intake_id is verplicht' }, 400)
  }
  if (!slot_start || typeof slot_start !== 'string' || isNaN(Date.parse(slot_start))) {
    return noStore({ error: 'slot_start is verplicht en moet een geldige ISO datum zijn' }, 400)
  }

  const admin = createAdminClient()

  // Haal client_id op via intake
  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select('client_id')
    .eq('id', intake_id)
    .single()

  if (intakeError || !intake) return noStore({ error: 'Intake niet gevonden' }, 404)

  // Maximaal 5 slots per intake
  const { count } = await admin
    .from('training_slots')
    .select('id', { count: 'exact', head: true })
    .eq('intake_id', intake_id)

  if ((count ?? 0) >= 5) {
    return noStore({ error: 'Maximaal 5 tijdsloten per intake toegestaan' }, 422)
  }

  const { data: slot, error: slotError } = await admin
    .from('training_slots')
    .insert({
      intake_id,
      client_id: intake.client_id,
      slot_start: new Date(slot_start).toISOString(),
      slot_end: slot_end && typeof slot_end === 'string' && !isNaN(Date.parse(slot_end))
        ? new Date(slot_end).toISOString()
        : null,
      location_or_link: typeof location_or_link === 'string' ? location_or_link.trim() || null : null,
    })
    .select()
    .single()

  if (slotError) return noStore({ error: slotError.message }, 500)
  return noStore({ slot }, 201)
}

/**
 * DELETE /api/admin/training-slots?id=xxx
 * Verwijdert een tijdslot (alleen als nog niet gekozen door klant)
 */
export async function DELETE(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const slotId = req.nextUrl.searchParams.get('id')
  if (!slotId) return noStore({ error: 'id is verplicht' }, 400)

  const admin = createAdminClient()

  // Controleer of slot al geselecteerd is
  const { data: existing } = await admin
    .from('training_slots')
    .select('is_selected')
    .eq('id', slotId)
    .single()

  if (existing?.is_selected) {
    return noStore({ error: 'Dit tijdslot is al gekozen door de klant en kan niet worden verwijderd' }, 422)
  }

  const { error } = await admin
    .from('training_slots')
    .delete()
    .eq('id', slotId)

  if (error) return noStore({ error: error.message }, 500)
  return noStore({ ok: true })
}
