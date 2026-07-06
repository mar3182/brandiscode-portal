import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  computeTrainingCompleteness,
  DEFAULT_FOCUS_AREA,
  normalizeTopTasks,
  type TrainingIntakeInput,
  type TrainingIntakeMemberInput,
  validateCommunicationPreference,
  validateTrainingIntake,
} from '@/lib/trainingIntake'
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

async function getCallerInfo() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !user.id) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .order('created_at', { ascending: true })
    .limit(1)

  const clientId = data?.[0]?.client_id
  if (!clientId) return null

  return { userId: user.id, clientId }
}

function mapIntakePayload(payload: Record<string, unknown>): TrainingIntakeInput {
  const members = Array.isArray(payload.members) ? payload.members : []
  return {
    training_duration: payload.training_duration === '2u' || payload.training_duration === '3u' ? payload.training_duration : '',
    preferred_datetime: typeof payload.preferred_datetime === 'string' ? payload.preferred_datetime : '',
    preferred_time_note: typeof payload.preferred_time_note === 'string' ? payload.preferred_time_note : '',
    contact_person: typeof payload.contact_person === 'string' ? payload.contact_person : '',
    contact_email: typeof payload.contact_email === 'string' ? payload.contact_email : '',
    focus_area: typeof payload.focus_area === 'string' && payload.focus_area.trim() ? payload.focus_area : DEFAULT_FOCUS_AREA,
    privacy_constraints: typeof payload.privacy_constraints === 'string' ? payload.privacy_constraints : '',
    data_usage_consent: Boolean(payload.data_usage_consent),
    communication_channel:
      payload.communication_channel === 'portal' || payload.communication_channel === 'email' || payload.communication_channel === 'whatsapp'
        ? payload.communication_channel
        : '',
    communication_email: typeof payload.communication_email === 'string' ? payload.communication_email : '',
    communication_whatsapp: typeof payload.communication_whatsapp === 'string' ? payload.communication_whatsapp : '',
    communication_consent: Boolean(payload.communication_consent),
    communication_notes: '',
    portal_notifications_enabled: Boolean(payload.portal_notifications_enabled),
    trainer_notes: typeof payload.trainer_notes === 'string' ? payload.trainer_notes : '',
    members: members.map((member, index) => {
      const item = member as Record<string, unknown>
      return {
        id: typeof item.id === 'string' ? item.id : undefined,
        full_name: typeof item.full_name === 'string' ? item.full_name : '',
        role: typeof item.role === 'string' ? item.role : '',
        top_tasks: Array.isArray(item.top_tasks) ? item.top_tasks.filter((task): task is string => typeof task === 'string') : [],
        bottleneck: typeof item.bottleneck === 'string' ? item.bottleneck : '',
        kpi_goal: typeof item.kpi_goal === 'string' ? item.kpi_goal : '',
        digital_skill: typeof item.digital_skill === 'number' ? item.digital_skill : null,
        ai_experience: typeof item.ai_experience === 'string' ? item.ai_experience : '',
        prompt_data_boundary: typeof item.prompt_data_boundary === 'string' ? item.prompt_data_boundary : '',
        training_day_availability: typeof item.training_day_availability === 'string' ? item.training_day_availability : '',
        sort_order: typeof item.sort_order === 'number' ? item.sort_order : index,
      } as TrainingIntakeMemberInput
    }),
  }
}

async function getIntakeForClient(clientId: string) {
  const admin = createAdminClient()

  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (intakeError) throw intakeError

  if (!intake) {
    const { data: clientProfile } = await admin
      .from('clients')
      .select('name, email, contact_person, billing_email')
      .eq('id', clientId)
      .maybeSingle()

    const { data: teamMembers } = await admin
      .from('client_users')
      .select('name, role')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    const prefilledMembers: TrainingIntakeMemberInput[] = (teamMembers || []).map((member, index) => ({
      full_name: member.name || '',
      role: member.role || '',
      top_tasks: [],
      bottleneck: '',
      kpi_goal: '',
      digital_skill: null,
      ai_experience: '',
      prompt_data_boundary: '',
      training_day_availability: '',
      sort_order: index,
    }))

    const emptyInput: TrainingIntakeInput = {
      training_duration: '',
      preferred_datetime: '',
      preferred_time_note: '',
      contact_person: clientProfile?.contact_person || clientProfile?.name || '',
      contact_email: clientProfile?.email || clientProfile?.billing_email || '',
      focus_area: DEFAULT_FOCUS_AREA,
      privacy_constraints: '',
      data_usage_consent: false,
      communication_channel: '',
      communication_email: '',
      communication_whatsapp: '',
      communication_consent: false,
      communication_notes: '',
      portal_notifications_enabled: false,
      trainer_notes: '',
      members: prefilledMembers,
    }

    return {
      intake: {
        status: 'draft',
        training_duration: emptyInput.training_duration,
        preferred_datetime: emptyInput.preferred_datetime,
        preferred_time_note: emptyInput.preferred_time_note,
        contact_person: emptyInput.contact_person,
        contact_email: emptyInput.contact_email,
        focus_area: emptyInput.focus_area,
        privacy_constraints: emptyInput.privacy_constraints,
        data_usage_consent: emptyInput.data_usage_consent,
        communication_channel: emptyInput.communication_channel,
        communication_email: emptyInput.communication_email,
        communication_whatsapp: emptyInput.communication_whatsapp,
        communication_consent: emptyInput.communication_consent,
        communication_notes: emptyInput.communication_notes,
        portal_notifications_enabled: emptyInput.portal_notifications_enabled,
        trainer_notes: emptyInput.trainer_notes,
      },
      members: prefilledMembers,
      sessions: [],
      completeness: computeTrainingCompleteness(emptyInput),
    }
  }

  const { data: members, error: memberError } = await admin
    .from('training_intake_members')
    .select('*')
    .eq('intake_id', intake.id)
    .order('sort_order', { ascending: true })

  if (memberError) throw memberError

  const { data: sessions, error: sessionError } = await admin
    .from('training_sessions')
    .select('*')
    .eq('intake_id', intake.id)
    .order('created_at', { ascending: false })

  if (sessionError) throw sessionError

  const input: TrainingIntakeInput = {
    training_duration: intake.training_duration || '',
    preferred_datetime: intake.preferred_datetime || '',
    preferred_time_note: intake.preferred_time_note || '',
    contact_person: intake.contact_person || '',
    contact_email: intake.contact_email || '',
    focus_area: intake.focus_area || DEFAULT_FOCUS_AREA,
    privacy_constraints: intake.privacy_constraints || '',
    data_usage_consent: Boolean(intake.data_usage_consent),
    communication_channel:
      intake.communication_channel === 'portal' || intake.communication_channel === 'email' || intake.communication_channel === 'whatsapp'
        ? intake.communication_channel
        : '',
    communication_email: intake.communication_email || '',
    communication_whatsapp: intake.communication_whatsapp || '',
    communication_consent: Boolean(intake.communication_consent),
    communication_notes: '',
    portal_notifications_enabled: Boolean(intake.portal_notifications_enabled),
    trainer_notes: intake.trainer_notes || '',
    members: (members || []).map((member) => ({
      id: member.id,
      full_name: member.full_name || '',
      role: member.role || '',
      top_tasks: Array.isArray(member.top_tasks) ? member.top_tasks : [],
      bottleneck: member.bottleneck || '',
      kpi_goal: member.kpi_goal || '',
      digital_skill: typeof member.digital_skill === 'number' ? member.digital_skill : null,
      ai_experience: member.ai_experience || '',
      prompt_data_boundary: member.prompt_data_boundary || '',
      training_day_availability: member.training_day_availability || '',
      sort_order: member.sort_order || 0,
    })),
  }

  return {
    intake,
    members: members || [],
    sessions: sessions || [],
    completeness: computeTrainingCompleteness(input),
  }
}

export async function GET() {
  const caller = await getCallerInfo()
  if (!caller) return noStore({ error: 'Niet ingelogd' }, 401)

  try {
    const result = await getIntakeForClient(caller.clientId)
    return noStore(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    return noStore({ error: message }, 500)
  }
}

export async function PUT(req: NextRequest) {
  const caller = await getCallerInfo()
  if (!caller) return noStore({ error: 'Niet ingelogd' }, 401)

  const body = (await req.json()) as Record<string, unknown>
  const input = mapIntakePayload(body)
  const isSubmit = body.submit === true
  const communicationErrors = validateCommunicationPreference(input)

  if (input.communication_channel && communicationErrors.length > 0) {
    return noStore(
      {
        error: 'Communicatievoorkeur is onvolledig of ongeldig.',
        validationErrors: communicationErrors,
        completeness: computeTrainingCompleteness(input),
      },
      422
    )
  }

  if (isSubmit) {
    const submitErrors = validateTrainingIntake(input)
    if (submitErrors.length > 0) {
      return noStore({
        error: 'Niet alle verplichte velden zijn ingevuld.',
        validationErrors: submitErrors,
        completeness: computeTrainingCompleteness(input),
      }, 422)
    }
  }

  const admin = createAdminClient()

  const { data: existing, error: existingError } = await admin
    .from('training_intakes')
    .select('id')
    .eq('client_id', caller.clientId)
    .maybeSingle()

  if (existingError) return noStore({ error: existingError.message }, 500)

  let communicationEmail: string | null = input.communication_email.trim().toLowerCase() || null
  let communicationWhatsapp: string | null = input.communication_whatsapp.trim() || null
  let portalNotificationsEnabled = input.portal_notifications_enabled

  if (input.communication_channel === 'portal') {
    communicationEmail = null
    communicationWhatsapp = null
    portalNotificationsEnabled = true
  } else if (input.communication_channel === 'email') {
    communicationWhatsapp = null
    portalNotificationsEnabled = false
  } else if (input.communication_channel === 'whatsapp') {
    communicationEmail = null
    portalNotificationsEnabled = false
  }

  const intakePayload = {
    client_id: caller.clientId,
    status: isSubmit ? 'submitted' : 'draft',
    training_duration: input.training_duration || null,
    preferred_datetime: input.preferred_datetime || null,
    preferred_time_note: input.preferred_time_note.trim() || null,
    contact_person: input.contact_person.trim() || null,
    contact_email: input.contact_email.trim().toLowerCase() || null,
    focus_area: input.focus_area.trim() || DEFAULT_FOCUS_AREA,
    privacy_constraints: input.privacy_constraints.trim() || null,
    data_usage_consent: input.data_usage_consent,
    communication_channel: input.communication_channel || null,
    communication_email: communicationEmail,
    communication_whatsapp: communicationWhatsapp,
    communication_consent: input.communication_consent,
    portal_notifications_enabled: portalNotificationsEnabled,
    submitted_at: isSubmit ? new Date().toISOString() : null,
    updated_by: caller.userId,
    updated_at: new Date().toISOString(),
    created_by: caller.userId,
  }

  const { data: intake, error: upsertError } = existing
    ? await admin
      .from('training_intakes')
      .update(intakePayload)
      .eq('id', existing.id)
      .select('*')
      .single()
    : await admin
      .from('training_intakes')
      .insert(intakePayload)
      .select('*')
      .single()

  if (upsertError) return noStore({ error: upsertError.message }, 500)

  const { error: deleteError } = await admin
    .from('training_intake_members')
    .delete()
    .eq('intake_id', intake.id)

  if (deleteError) return noStore({ error: deleteError.message }, 500)

  const memberPayload = input.members.map((member, index) => ({
    intake_id: intake.id,
    client_id: caller.clientId,
    full_name: member.full_name.trim() || null,
    role: member.role.trim() || null,
    top_tasks: normalizeTopTasks(member.top_tasks),
    bottleneck: member.bottleneck.trim() || null,
    kpi_goal: member.kpi_goal.trim() || null,
    digital_skill: member.digital_skill,
    ai_experience: member.ai_experience.trim() || null,
    prompt_data_boundary: member.prompt_data_boundary.trim() || null,
    training_day_availability: member.training_day_availability.trim() || null,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }))

  if (memberPayload.length > 0) {
    const { error: memberInsertError } = await admin.from('training_intake_members').insert(memberPayload)
    if (memberInsertError) return noStore({ error: memberInsertError.message }, 500)
  }

  return noStore({
    success: true,
    status: isSubmit ? 'submitted' : 'draft',
    completeness: computeTrainingCompleteness(input),
  })
}
