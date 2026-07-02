import { createAdminClient } from '@/lib/supabase/admin'
import { google, calendar_v3 } from 'googleapis'

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'
const FULL_SYNC_LOOKBACK_DAYS = 180

type TrainingSessionStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'

export interface GoogleWebhookHeaders {
  channelId: string | null
  resourceId: string | null
  resourceState: string | null
  resourceUri: string | null
  messageNumber: number | null
}

export interface GoogleCalendarSyncResult {
  ok: boolean
  processed: number
  created: number
  updated: number
  skipped: number
  cancelled: number
  reason?: string
}

interface GoogleCalendarWatchStateRow {
  calendar_id: string
  channel_id: string | null
  resource_id: string | null
  resource_uri: string | null
  sync_token: string | null
  expiration: string | null
  last_message_number: number | null
}

interface ClientRow {
  id: string
  name: string
  company: string | null
  email: string
  contact_person: string | null
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Ontbrekende environment variable: ${name}`)
  return value
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, '\n')
}

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

function deriveDurationHours(startIso: string | null, endIso: string | null): 2 | 3 | null {
  if (!startIso || !endIso) return null

  const durationMs = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (durationMs <= 0) return null

  const durationHours = Math.round(durationMs / (1000 * 60 * 60))
  if (durationHours === 2 || durationHours === 3) return durationHours
  return null
}

function extractAttendeeEmail(event: calendar_v3.Schema$Event): string | null {
  const attendees = Array.isArray(event.attendees) ? event.attendees : []
  const preferredAttendee = attendees.find((attendee) => attendee.email && !attendee.organizer && !attendee.self)
  const fallbackAttendee = attendees.find((attendee) => attendee.email)
  return preferredAttendee?.email?.trim().toLowerCase() ?? fallbackAttendee?.email?.trim().toLowerCase() ?? null
}

function extractLocationOrLink(event: calendar_v3.Schema$Event): string | null {
  const location = event.location?.trim()
  if (location) return location

  const conferenceLink = event.hangoutLink?.trim()
  if (conferenceLink) return conferenceLink

  const entryPoints = Array.isArray(event.conferenceData?.entryPoints) ? event.conferenceData?.entryPoints : []
  const videoEntry = entryPoints?.find((entry) => entry.uri)
  return videoEntry?.uri?.trim() ?? null
}

function buildSessionMetadata(event: calendar_v3.Schema$Event) {
  return {
    source: 'google-calendar',
    google_event_status: event.status ?? null,
    google_summary: event.summary ?? null,
    google_description: event.description ?? null,
    google_attendees: (event.attendees ?? []).map((attendee) => ({
      email: attendee.email ?? null,
      responseStatus: attendee.responseStatus ?? null,
      organizer: attendee.organizer ?? false,
      self: attendee.self ?? false,
    })),
    google_updated_at: event.updated ?? null,
    google_html_link: event.htmlLink ?? null,
  }
}

function nextStatusForEvent(eventStatus: string | null | undefined, existingStatus?: string | null): TrainingSessionStatus {
  if (eventStatus === 'cancelled') return 'cancelled'

  if (existingStatus === 'confirmed' || existingStatus === 'completed' || existingStatus === 'rescheduled') {
    return existingStatus
  }

  return 'proposed'
}

async function getCalendarApi() {
  const clientEmail = requiredEnv('GOOGLE_CALENDAR_CLIENT_EMAIL')
  const privateKey = normalizePrivateKey(requiredEnv('GOOGLE_CALENDAR_PRIVATE_KEY'))

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [GOOGLE_CALENDAR_SCOPE],
  })

  await auth.authorize()

  return google.calendar({ version: 'v3', auth })
}

async function fetchCalendarEvents(syncToken?: string | null) {
  const calendarId = requiredEnv('GOOGLE_CALENDAR_ID')
  const calendarApi = await getCalendarApi()

  const items: calendar_v3.Schema$Event[] = []
  let nextPageToken: string | undefined
  let nextSyncToken: string | null | undefined

  do {
    const response = await calendarApi.events.list({
      calendarId,
      maxResults: 2500,
      pageToken: nextPageToken,
      showDeleted: true,
      singleEvents: true,
      ...(syncToken
        ? { syncToken }
        : { timeMin: new Date(Date.now() - FULL_SYNC_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString() }),
    })

    items.push(...(response.data.items ?? []))
    nextPageToken = response.data.nextPageToken ?? undefined
    nextSyncToken = response.data.nextSyncToken ?? nextSyncToken
  } while (nextPageToken)

  return { items, nextSyncToken: nextSyncToken ?? null }
}

async function getClientByEmail(email: string): Promise<ClientRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select('id, name, company, email, contact_person')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Klant lookup mislukt: ${error.message}`)
  return data
}

async function ensureTrainingIntake(client: ClientRow) {
  const admin = createAdminClient()
  const { data: existing, error: existingError } = await admin
    .from('training_intakes')
    .select('id')
    .eq('client_id', client.id)
    .maybeSingle()

  if (existingError) throw new Error(`Training intake lookup mislukt: ${existingError.message}`)
  if (existing?.id) return existing.id as string

  const { data: created, error: createError } = await admin
    .from('training_intakes')
    .insert({
      client_id: client.id,
      status: 'planned',
      contact_person: client.contact_person ?? client.name,
      contact_email: client.email,
      communication_channel: 'email',
      communication_email: client.email,
      communication_consent: false,
      portal_notifications_enabled: false,
      planned_at: new Date().toISOString(),
      metadata: {
        source: 'google-calendar',
        auto_created_by_webhook: true,
      },
    })
    .select('id')
    .single()

  if (createError) throw new Error(`Training intake aanmaken mislukt: ${createError.message}`)
  return created.id as string
}

async function upsertSessionFromGoogleEvent(event: calendar_v3.Schema$Event, calendarId: string) {
  const admin = createAdminClient()
  const googleEventId = event.id?.trim()
  if (!googleEventId) {
    return { processed: false, created: false, updated: false, cancelled: false, skipped: true }
  }

  const { data: existing, error: existingError } = await admin
    .from('training_sessions')
    .select('id, status, intake_id, client_id, google_attendee_email')
    .eq('google_calendar_id', calendarId)
    .eq('google_event_id', googleEventId)
    .maybeSingle()

  if (existingError) throw new Error(`Bestaande sessie lookup mislukt: ${existingError.message}`)

  const attendeeEmail = extractAttendeeEmail(event) ?? existing?.google_attendee_email ?? null
  if (!attendeeEmail) {
    console.info('Google Calendar webhook: event without attendee email', { googleEventId })
    return { processed: false, created: false, updated: false, cancelled: false, skipped: true }
  }

  const client = await getClientByEmail(attendeeEmail)
  if (!client) {
    console.info('Google Calendar webhook: onbekende klant, event genegeerd', { googleEventId, attendeeEmail })
    return { processed: false, created: false, updated: false, cancelled: false, skipped: true }
  }

  const intakeId = await ensureTrainingIntake(client)

  const sessionStart = toIsoOrNull(event.start?.dateTime ?? event.start?.date ?? null)
  const sessionEnd = toIsoOrNull(event.end?.dateTime ?? event.end?.date ?? null)
  const durationHours = deriveDurationHours(sessionStart, sessionEnd)
  const locationOrLink = extractLocationOrLink(event)
  const summary = event.summary?.trim() ?? ''
  const description = event.description?.trim() ?? ''
  const agenda = description || summary || null
  const metadata = buildSessionMetadata(event)

  const nextStatus = nextStatusForEvent(event.status, existing?.status ?? null)
  const payload = {
    intake_id: intakeId,
    client_id: client.id,
    status: nextStatus,
    session_start: sessionStart,
    session_end: sessionEnd,
    proposed_duration_hours: durationHours,
    location_or_link: locationOrLink,
    agenda,
    admin_notes: summary || null,
    google_calendar_id: calendarId,
    google_event_id: googleEventId,
    google_attendee_email: attendeeEmail,
    metadata,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error: updateError } = await admin
      .from('training_sessions')
      .update(payload)
      .eq('id', existing.id)

    if (updateError) throw new Error(`Sessie updaten mislukt: ${updateError.message}`)

    return {
      processed: true,
      created: false,
      updated: true,
      cancelled: nextStatus === 'cancelled',
      skipped: false,
    }
  }

  const { error: insertError } = await admin
    .from('training_sessions')
    .insert({
      ...payload,
      created_by: null,
      updated_by: null,
      created_at: new Date().toISOString(),
    })

  if (insertError) throw new Error(`Sessie aanmaken mislukt: ${insertError.message}`)

  return {
    processed: true,
    created: true,
    updated: false,
    cancelled: nextStatus === 'cancelled',
    skipped: false,
  }
}

async function loadWatchState(calendarId: string): Promise<GoogleCalendarWatchStateRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('google_calendar_watch_state')
    .select('calendar_id, channel_id, resource_id, resource_uri, sync_token, expiration, last_message_number')
    .eq('calendar_id', calendarId)
    .maybeSingle()

  if (error) throw new Error(`Watch state ophalen mislukt: ${error.message}`)
  return data
}

async function saveWatchState(calendarId: string, headers: GoogleWebhookHeaders, syncToken: string | null) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('google_calendar_watch_state')
    .upsert({
      calendar_id: calendarId,
      channel_id: headers.channelId,
      resource_id: headers.resourceId,
      resource_uri: headers.resourceUri,
      sync_token: syncToken,
      expiration: null,
      last_message_number: headers.messageNumber,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'calendar_id' })

  if (error) throw new Error(`Watch state opslaan mislukt: ${error.message}`)
}

export async function syncGoogleCalendarSessions(headers: GoogleWebhookHeaders): Promise<GoogleCalendarSyncResult> {
  const calendarId = requiredEnv('GOOGLE_CALENDAR_ID')
  const currentState = await loadWatchState(calendarId)

  if (
    currentState?.last_message_number !== null &&
    currentState?.last_message_number !== undefined &&
    headers.messageNumber !== null &&
    headers.messageNumber <= currentState.last_message_number
  ) {
    return {
      ok: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      cancelled: 0,
      reason: 'duplicate-message',
    }
  }

  if (headers.resourceState === 'sync' && currentState?.sync_token) {
    await saveWatchState(calendarId, headers, currentState.sync_token)
    return {
      ok: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      cancelled: 0,
      reason: 'channel-sync-ack',
    }
  }

  let events
  try {
    events = await fetchCalendarEvents(currentState?.sync_token ?? null)
  } catch (error) {
    const googleError = error as { code?: number; response?: { status?: number } }
    const statusCode = googleError.code ?? googleError.response?.status

    if (statusCode === 410) {
      events = await fetchCalendarEvents(null)
    } else {
      throw error
    }
  }

  let processed = 0
  let created = 0
  let updated = 0
  let skipped = 0
  let cancelled = 0

  for (const event of events.items) {
    const result = await upsertSessionFromGoogleEvent(event, calendarId)
    if (result.processed) processed += 1
    if (result.created) created += 1
    if (result.updated) updated += 1
    if (result.skipped) skipped += 1
    if (result.cancelled) cancelled += 1
  }

  await saveWatchState(calendarId, headers, events.nextSyncToken)

  return {
    ok: true,
    processed,
    created,
    updated,
    skipped,
    cancelled,
  }
}
