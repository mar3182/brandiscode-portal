import { createAdminClient } from '@/lib/supabase/admin'
import { validateCommunicationPreference } from '@/lib/trainingIntake'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingProposalEmail } from '@/lib/email'
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

function getMissingFields(intake: Record<string, unknown>, memberCount: number) {
  const missing: string[] = []

  if (!intake.training_duration) missing.push('Gewenste trainingsduur')
  if (!intake.preferred_datetime) missing.push('Voorkeursdatum/tijd')
  if (!intake.contact_person) missing.push('Contactpersoon')
  if (!intake.contact_email) missing.push('Contact e-mail')
  if (!intake.focus_area) missing.push('Focusgebied')
  if (!intake.privacy_constraints) missing.push('Privacy/security randvoorwaarden')
  if (!intake.data_usage_consent) missing.push('Akkoord datagebruik')

  const channel = intake.communication_channel
  if (channel !== 'portal' && channel !== 'email' && channel !== 'whatsapp') {
    missing.push('Communicatiekanaal')
  } else if (!intake.communication_consent) {
    missing.push('Communicatie-toestemming')
  } else if (channel === 'portal' && !intake.portal_notifications_enabled) {
    missing.push('Portalmeldingen')
  } else if (channel === 'email' && !intake.communication_email) {
    missing.push('Communicatie e-mail')
  } else if (channel === 'whatsapp' && !intake.communication_whatsapp) {
    missing.push('WhatsApp-nummer')
  }

  if (memberCount === 0) missing.push('Teamlidgegevens')

  return missing
}

function canTransition(from: IntakeStatus, to: IntakeStatus) {
  if (from === to) return true
  if (to === 'draft') return true

  const allowed: Record<IntakeStatus, IntakeStatus[]> = {
    draft: ['submitted'],
    submitted: ['reviewed'],
    reviewed: ['planned'],
    planned: [],
  }

  return allowed[from].includes(to)
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

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = (await req.json()) as { client_id?: string }
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : ''

  if (!clientId) return noStore({ error: 'client_id is verplicht' }, 400)

  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const { data: existing, error: existingError } = await admin
    .from('training_intakes')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingError) return noStore({ error: existingError.message }, 500)

  if (existing) {
    return noStore({
      success: true,
      created: false,
      intake_id: existing.id,
      message: 'Er bestaat al een intake voor deze klant.',
    })
  }

  const now = new Date().toISOString()
  const { data: created, error: createError } = await admin
    .from('training_intakes')
    .insert({
      client_id: clientId,
      status: 'draft',
      updated_by: user.id,
      created_by: user.id,
      updated_at: now,
    })
    .select('id')
    .single()

  if (createError) return noStore({ error: createError.message }, 500)

  return noStore({
    success: true,
    created: true,
    intake_id: created.id,
    message: 'Concept-intake aangemaakt.',
  })
}

export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = (await req.json()) as {
    intake_id?: string
    status?: 'draft' | 'submitted' | 'reviewed' | 'planned'
    trainer_notes?: string
    communication_channel?: 'portal' | 'email' | 'whatsapp'
    communication_email?: string
    communication_whatsapp?: string
    communication_consent?: boolean
    communication_notes?: string
    portal_notifications_enabled?: boolean
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

  const { data: intakeWithClient, error: intakeError } = await admin
    .from('training_intakes')
    .select('id, client_id, status, training_duration, preferred_datetime, contact_person, contact_email, focus_area, privacy_constraints, data_usage_consent, communication_channel, communication_email, communication_whatsapp, communication_consent, communication_notes, portal_notifications_enabled, clients(name, company, email)')
    .eq('id', body.intake_id)
    .single()

  if (intakeError) return noStore({ error: intakeError.message }, 500)

  const intake = intakeWithClient as Omit<typeof intakeWithClient, 'clients'>
  const clientData = intakeWithClient?.clients as { name?: string; company?: string; email?: string } | null

  const { count: memberCount, error: memberCountError } = await admin
    .from('training_intake_members')
    .select('id', { count: 'exact', head: true })
    .eq('intake_id', body.intake_id)

  if (memberCountError) return noStore({ error: memberCountError.message }, 500)

  let missingRequiredFields = getMissingFields(
    intake as unknown as Record<string, unknown>,
    memberCount || 0
  )

  const updatePayload: Record<string, unknown> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  const nextCommunication = {
    communication_channel: body.communication_channel ?? intake.communication_channel,
    communication_email: body.communication_email ?? intake.communication_email ?? '',
    communication_whatsapp: body.communication_whatsapp ?? intake.communication_whatsapp ?? '',
    communication_consent: typeof body.communication_consent === 'boolean' ? body.communication_consent : Boolean(intake.communication_consent),
    communication_notes: body.communication_notes ?? intake.communication_notes ?? '',
    portal_notifications_enabled:
      typeof body.portal_notifications_enabled === 'boolean'
        ? body.portal_notifications_enabled
        : Boolean(intake.portal_notifications_enabled),
  }

  const communicationFieldsTouched =
    body.communication_channel !== undefined ||
    body.communication_email !== undefined ||
    body.communication_whatsapp !== undefined ||
    body.communication_consent !== undefined ||
    body.communication_notes !== undefined ||
    body.portal_notifications_enabled !== undefined

  if (communicationFieldsTouched) {
    const communicationErrors = validateCommunicationPreference(nextCommunication)
    if (communicationErrors.length > 0) {
      return noStore(
        {
          error: 'Communicatievoorkeur is onvolledig of ongeldig.',
          validationErrors: communicationErrors,
        },
        422
      )
    }

    updatePayload.communication_channel = nextCommunication.communication_channel || null
    updatePayload.communication_consent = nextCommunication.communication_consent
    updatePayload.communication_notes = nextCommunication.communication_notes?.trim() || null

    if (nextCommunication.communication_channel === 'portal') {
      updatePayload.portal_notifications_enabled = true
      updatePayload.communication_email = null
      updatePayload.communication_whatsapp = null
      missingRequiredFields = getMissingFields(
        {
          ...intake,
          communication_channel: 'portal',
          communication_consent: nextCommunication.communication_consent,
          communication_notes: nextCommunication.communication_notes,
          portal_notifications_enabled: true,
          communication_email: null,
          communication_whatsapp: null,
        },
        memberCount || 0
      )
    } else if (nextCommunication.communication_channel === 'email') {
      updatePayload.portal_notifications_enabled = false
      updatePayload.communication_email = nextCommunication.communication_email.trim().toLowerCase() || null
      updatePayload.communication_whatsapp = null
      missingRequiredFields = getMissingFields(
        {
          ...intake,
          communication_channel: 'email',
          communication_consent: nextCommunication.communication_consent,
          communication_notes: nextCommunication.communication_notes,
          portal_notifications_enabled: false,
          communication_email: nextCommunication.communication_email.trim().toLowerCase() || null,
          communication_whatsapp: null,
        },
        memberCount || 0
      )
    } else if (nextCommunication.communication_channel === 'whatsapp') {
      updatePayload.portal_notifications_enabled = false
      updatePayload.communication_email = null
      updatePayload.communication_whatsapp = nextCommunication.communication_whatsapp.trim() || null
      missingRequiredFields = getMissingFields(
        {
          ...intake,
          communication_channel: 'whatsapp',
          communication_consent: nextCommunication.communication_consent,
          communication_notes: nextCommunication.communication_notes,
          portal_notifications_enabled: false,
          communication_email: null,
          communication_whatsapp: nextCommunication.communication_whatsapp.trim() || null,
        },
        memberCount || 0
      )
    }
  }

  if (typeof body.status === 'string') {
    const currentStatus = intake.status as IntakeStatus
    const nextStatus = body.status as IntakeStatus

    if (!canTransition(currentStatus, nextStatus)) {
      return noStore(
        {
          error: `Ongeldige statusovergang van ${currentStatus} naar ${nextStatus}.`,
          details: 'Gebruik de volgorde: draft -> submitted -> reviewed -> planned.',
        },
        422
      )
    }

    if (nextStatus === 'planned' && missingRequiredFields.length > 0) {
      return noStore(
        {
          error: 'Kan niet plannen: intake is nog niet compleet.',
          missingRequiredFields,
        },
        422
      )
    }

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
    const hasCommunicationGap = missingRequiredFields.some((field) =>
      ['Communicatiekanaal', 'Communicatie-toestemming', 'Portalmeldingen', 'Communicatie e-mail', 'WhatsApp-nummer'].includes(field)
    )

    const communicationErrors = validateCommunicationPreference({
      communication_channel: (nextCommunication.communication_channel as 'portal' | 'email' | 'whatsapp' | '') || '',
      communication_email: String(nextCommunication.communication_email || ''),
      communication_whatsapp: String(nextCommunication.communication_whatsapp || ''),
      communication_consent: Boolean(nextCommunication.communication_consent),
      portal_notifications_enabled: Boolean(nextCommunication.portal_notifications_enabled),
    })

    if (hasCommunicationGap || communicationErrors.length > 0) {
      return noStore(
        {
          error: 'Voorstel versturen kan nog niet: communicatievoorkeur is incompleet.',
          missingRequiredFields,
          validationErrors: communicationErrors,
        },
        422
      )
    }

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

    // Auto-trigger: stuur e-mail zodra sessie aangemaakt wordt bij 'planned' status
    if (updatePayload.status === 'planned' || (intake.status === 'planned' && !updatePayload.status)) {
      try {
        const { data: newSession } = await admin
          .from('training_sessions')
          .select('confirm_token, session_start, proposed_duration_hours, location_or_link, agenda')
          .eq('intake_id', body.intake_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (newSession) {
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
            }).catch(() => {
              // e-mail fout blokkeert de response niet — admin kan handmatig opnieuw sturen
            })
          }
        }
      } catch {
        // zwijgend falen: sessie is wél aangemaakt
      }
    }
  }

  return noStore({ success: true })
}
