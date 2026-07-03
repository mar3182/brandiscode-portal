import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_FOCUS_AREA, normalizeTopTasks } from '@/lib/trainingIntake'
import { NextRequest, NextResponse } from 'next/server'

type IntakeStatus = 'draft' | 'submitted' | 'reviewed' | 'planned'

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

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name, company, email, contact_person')
    .eq('id', params.id)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle()

  if (intakeError) return noStore({ error: intakeError.message }, 500)

  if (!intake) {
    return noStore({
      client,
      intake: null,
      members: [],
    })
  }

  const { data: members, error: membersError } = await admin
    .from('training_intake_members')
    .select('*')
    .eq('intake_id', intake.id)
    .order('sort_order', { ascending: true })

  if (membersError) return noStore({ error: membersError.message }, 500)

  return noStore({
    client,
    intake,
    members: members || [],
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const admin = createAdminClient()
  const body = (await req.json()) as {
    submit?: boolean
    training_duration?: '2u' | '3u' | ''
    preferred_datetime?: string
    preferred_time_note?: string
    contact_person?: string
    contact_email?: string
    focus_area?: string
    privacy_constraints?: string
    data_usage_consent?: boolean
    communication_channel?: 'portal' | 'email' | 'whatsapp' | ''
    communication_email?: string
    communication_whatsapp?: string
    communication_consent?: boolean
    communication_notes?: string
    portal_notifications_enabled?: boolean
    trainer_notes?: string
    members?: Array<{
      full_name?: string
      role?: string
      top_tasks?: string[]
      bottleneck?: string
      kpi_goal?: string
      digital_skill?: number | null
      ai_experience?: string
      prompt_data_boundary?: string
      training_day_availability?: string
      sort_order?: number
    }>
  }

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', params.id)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const contactPerson = (body.contact_person || '').trim()
  const contactEmail = (body.contact_email || '').trim().toLowerCase()

  if (body.submit && (!contactPerson || !contactEmail)) {
    return noStore(
      {
        error: 'Contactpersoon en contact e-mail zijn verplicht voor definitief indienen.',
      },
      422
    )
  }

  if (body.submit && !isEmail(contactEmail)) {
    return noStore({ error: 'Vul een geldig contact e-mailadres in.' }, 422)
  }

  const { data: existing, error: existingError } = await admin
    .from('training_intakes')
    .select('id, status')
    .eq('client_id', params.id)
    .maybeSingle()

  if (existingError) return noStore({ error: existingError.message }, 500)

  const now = new Date().toISOString()
  const submit = body.submit === true
  const nextStatus: IntakeStatus = submit ? 'reviewed' : 'draft'

  let communicationEmail = (body.communication_email || '').trim().toLowerCase() || null
  let communicationWhatsapp = (body.communication_whatsapp || '').trim() || null
  let portalNotificationsEnabled = Boolean(body.portal_notifications_enabled)

  if (body.communication_channel === 'portal') {
    communicationEmail = null
    communicationWhatsapp = null
    portalNotificationsEnabled = true
  } else if (body.communication_channel === 'email') {
    communicationWhatsapp = null
    portalNotificationsEnabled = false
  } else if (body.communication_channel === 'whatsapp') {
    communicationEmail = null
    portalNotificationsEnabled = false
  } else {
    communicationEmail = null
    communicationWhatsapp = null
    portalNotificationsEnabled = false
  }

  const intakePayload = {
    client_id: params.id,
    status: nextStatus,
    training_duration: body.training_duration === '2u' || body.training_duration === '3u' ? body.training_duration : null,
    preferred_datetime: (body.preferred_datetime || '').trim() || null,
    preferred_time_note: (body.preferred_time_note || '').trim() || null,
    contact_person: contactPerson || null,
    contact_email: contactEmail || null,
    focus_area: (body.focus_area || '').trim() || DEFAULT_FOCUS_AREA,
    privacy_constraints: (body.privacy_constraints || '').trim() || null,
    data_usage_consent: Boolean(body.data_usage_consent),
    communication_channel:
      body.communication_channel === 'portal' || body.communication_channel === 'email' || body.communication_channel === 'whatsapp'
        ? body.communication_channel
        : null,
    communication_email: communicationEmail,
    communication_whatsapp: communicationWhatsapp,
    communication_consent: Boolean(body.communication_consent),
    communication_notes: (body.communication_notes || '').trim() || null,
    portal_notifications_enabled: portalNotificationsEnabled,
    trainer_notes: (body.trainer_notes || '').trim() || null,
    submitted_at: submit ? now : existing?.status === 'reviewed' ? now : null,
    reviewed_at: submit ? now : null,
    updated_at: now,
    updated_by: user.id,
    created_by: user.id,
  }

  const { data: intake, error: intakeUpsertError } = existing
    ? await admin
      .from('training_intakes')
      .update(intakePayload)
      .eq('id', existing.id)
      .select('id, status')
      .single()
    : await admin
      .from('training_intakes')
      .insert(intakePayload)
      .select('id, status')
      .single()

  if (intakeUpsertError) return noStore({ error: intakeUpsertError.message }, 500)

  const { error: deleteMembersError } = await admin
    .from('training_intake_members')
    .delete()
    .eq('intake_id', intake.id)

  if (deleteMembersError) return noStore({ error: deleteMembersError.message }, 500)

  const members = Array.isArray(body.members) ? body.members : []
  const memberPayload = members.map((member, index) => ({
    intake_id: intake.id,
    client_id: params.id,
    full_name: (member.full_name || '').trim() || null,
    role: (member.role || '').trim() || null,
    top_tasks: normalizeTopTasks(Array.isArray(member.top_tasks) ? member.top_tasks : []),
    bottleneck: (member.bottleneck || '').trim() || null,
    kpi_goal: (member.kpi_goal || '').trim() || null,
    digital_skill: typeof member.digital_skill === 'number' ? member.digital_skill : null,
    ai_experience: (member.ai_experience || '').trim() || null,
    prompt_data_boundary: (member.prompt_data_boundary || '').trim() || null,
    training_day_availability: (member.training_day_availability || '').trim() || null,
    sort_order: typeof member.sort_order === 'number' ? member.sort_order : index,
    updated_at: now,
  }))

  if (memberPayload.length > 0) {
    const { error: memberInsertError } = await admin.from('training_intake_members').insert(memberPayload)
    if (memberInsertError) return noStore({ error: memberInsertError.message }, 500)
  }

  return noStore({
    success: true,
    intake_id: intake.id,
    status: intake.status,
  })
}
