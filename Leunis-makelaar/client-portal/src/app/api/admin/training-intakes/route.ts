import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

function getMissingFields(intake: Record<string, unknown>, memberCount: number) {
  const missing: string[] = []

  if (!intake.training_duration) missing.push('Gewenste trainingsduur')
  if (!intake.preferred_datetime) missing.push('Voorkeursdatum/tijd')
  if (!intake.contact_person) missing.push('Contactpersoon')
  if (!intake.contact_email) missing.push('Contact e-mail')
  if (!intake.focus_area) missing.push('Focusgebied')
  if (!intake.privacy_constraints) missing.push('Privacy/security randvoorwaarden')
  if (!intake.data_usage_consent) missing.push('Akkoord datagebruik')
  if (memberCount === 0) missing.push('Teamlidgegevens')

  return missing
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = req.nextUrl.searchParams.get('client_id')
  const admin = createAdminClient()

  const baseQuery = admin
    .from('training_intakes')
    .select('*, clients(id, name, company, email), training_intake_members(*), training_sessions(*)')
    .order('updated_at', { ascending: false })

  const { data, error } = clientId ? await baseQuery.eq('client_id', clientId) : await baseQuery

  if (error) return noStore({ error: error.message }, 500)

  const mapped = (data || []).map((item) => {
    const memberCount = Array.isArray(item.training_intake_members) ? item.training_intake_members.length : 0
    const missingRequiredFields = getMissingFields(item as unknown as Record<string, unknown>, memberCount)
    return {
      ...item,
      missingRequiredFields,
      readyForTraining: missingRequiredFields.length === 0,
    }
  })

  return noStore(mapped)
}

export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = (await req.json()) as {
    intake_id?: string
    status?: 'draft' | 'submitted' | 'reviewed' | 'planned'
    trainer_notes?: string
    session?: {
      status?: 'proposed' | 'confirmed' | 'completed' | 'cancelled'
      session_start?: string
      session_end?: string
      proposed_duration_hours?: 2 | 3
      location_or_link?: string
      agenda?: string
      admin_notes?: string
    }
  }

  if (!body.intake_id) return noStore({ error: 'intake_id is verplicht' }, 400)

  const admin = createAdminClient()

  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select('id, client_id')
    .eq('id', body.intake_id)
    .single()

  if (intakeError) return noStore({ error: intakeError.message }, 500)

  const updatePayload: Record<string, unknown> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (typeof body.status === 'string') {
    updatePayload.status = body.status
    if (body.status === 'reviewed') updatePayload.reviewed_at = new Date().toISOString()
    if (body.status === 'planned') updatePayload.planned_at = new Date().toISOString()
  }

  if (typeof body.trainer_notes === 'string') {
    updatePayload.trainer_notes = body.trainer_notes.trim() || null
  }

  const { error: updateError } = await admin
    .from('training_intakes')
    .update(updatePayload)
    .eq('id', body.intake_id)

  if (updateError) return noStore({ error: updateError.message }, 500)

  if (body.session) {
    const { error: sessionError } = await admin.from('training_sessions').insert({
      intake_id: body.intake_id,
      client_id: intake.client_id,
      status: body.session.status || 'proposed',
      session_start: body.session.session_start || null,
      session_end: body.session.session_end || null,
      proposed_duration_hours: body.session.proposed_duration_hours || null,
      location_or_link: body.session.location_or_link?.trim() || null,
      agenda: body.session.agenda?.trim() || null,
      admin_notes: body.session.admin_notes?.trim() || null,
      created_by: user.id,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })

    if (sessionError) return noStore({ error: sessionError.message }, 500)
  }

  return noStore({ success: true })
}
