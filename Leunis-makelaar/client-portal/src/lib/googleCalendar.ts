import crypto from 'crypto'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const TRAINING_TIMEZONE = process.env.TRAINING_CALENDAR_TIMEZONE ?? 'Europe/Amsterdam'

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function buildJwtAssertion(serviceEmail: string, privateKey: string, scope: string, subject?: string) {
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload: Record<string, unknown> = {
    iss: serviceEmail,
    scope,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }

  if (subject) payload.sub = subject

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const toSign = `${encodedHeader}.${encodedPayload}`

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(toSign)
  signer.end()

  const signature = signer.sign(privateKey)
  return `${toSign}.${base64UrlEncode(signature)}`
}

async function getGoogleAccessToken() {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const impersonateUser = process.env.GOOGLE_IMPERSONATE_USER

  if (!serviceEmail || !privateKey) return null

  const assertion = buildJwtAssertion(
    serviceEmail,
    privateKey,
    'https://www.googleapis.com/auth/calendar',
    impersonateUser
  )

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => '')
    throw new Error(`Google token ophalen mislukt: ${tokenRes.status} ${body}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string }
  return tokenData.access_token ?? null
}

export type TrainingCalendarEventInput = {
  sessionId: string
  sessionStart: string
  sessionEnd?: string | null
  summary: string
  description?: string | null
  location?: string | null
  attendeeEmail?: string | null
}

export type TrainingBusyInterval = {
  start: string
  end: string
}

export type SuggestedTrainingSlot = {
  start: string
  end: string
}

export async function createTrainingCalendarEvent(input: TrainingCalendarEventInput) {
  const calendarId = process.env.GOOGLE_CALENDAR_TRAINING_ID
  if (!calendarId) {
    return { skipped: true as const, reason: 'GOOGLE_CALENDAR_TRAINING_ID ontbreekt' }
  }

  const accessToken = await getGoogleAccessToken()
  if (!accessToken) {
    return { skipped: true as const, reason: 'Google service account credentials ontbreken' }
  }

  const start = new Date(input.sessionStart)
  const end = input.sessionEnd ? new Date(input.sessionEnd) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const payload: Record<string, unknown> = {
    summary: input.summary,
    description: input.description || undefined,
    location: input.location || undefined,
    start: {
      dateTime: start.toISOString(),
      timeZone: TRAINING_TIMEZONE,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: TRAINING_TIMEZONE,
    },
    extendedProperties: {
      private: {
        training_session_id: input.sessionId,
      },
    },
  }

  if (input.attendeeEmail) {
    payload.attendees = [{ email: input.attendeeEmail }]
  }

  const eventRes = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!eventRes.ok) {
    const body = await eventRes.text().catch(() => '')
    throw new Error(`Google Calendar event aanmaken mislukt: ${eventRes.status} ${body}`)
  }

  const eventData = (await eventRes.json()) as { id?: string; htmlLink?: string }
  return {
    skipped: false as const,
    eventId: eventData.id ?? null,
    eventUrl: eventData.htmlLink ?? null,
  }
}

export async function getTrainingCalendarBusyIntervals(timeMinIso: string, timeMaxIso: string) {
  const calendarId = process.env.GOOGLE_CALENDAR_TRAINING_ID
  if (!calendarId) {
    return { skipped: true as const, reason: 'GOOGLE_CALENDAR_TRAINING_ID ontbreekt', busy: [] as TrainingBusyInterval[] }
  }

  const accessToken = await getGoogleAccessToken()
  if (!accessToken) {
    return { skipped: true as const, reason: 'Google service account credentials ontbreken', busy: [] as TrainingBusyInterval[] }
  }

  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      timeZone: TRAINING_TIMEZONE,
      items: [{ id: calendarId }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google freeBusy mislukt: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>
  }

  const busy = payload.calendars?.[calendarId]?.busy ?? []
  return { skipped: false as const, busy }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart
}

export async function suggestTrainingSlots(params: {
  timeMinIso: string
  timeMaxIso: string
  slotMinutes: number
  stepMinutes?: number
  maxResults?: number
}) {
  const { timeMinIso, timeMaxIso, slotMinutes } = params
  const stepMinutes = params.stepMinutes ?? 30
  const maxResults = params.maxResults ?? 8

  const busyResult = await getTrainingCalendarBusyIntervals(timeMinIso, timeMaxIso)
  if (busyResult.skipped) {
    return { skipped: true as const, reason: busyResult.reason, slots: [] as SuggestedTrainingSlot[] }
  }

  const minMs = Date.parse(timeMinIso)
  const maxMs = Date.parse(timeMaxIso)
  if (Number.isNaN(minMs) || Number.isNaN(maxMs) || minMs >= maxMs) {
    return { skipped: false as const, slots: [] as SuggestedTrainingSlot[] }
  }

  const slotMs = slotMinutes * 60 * 1000
  const stepMs = Math.max(15, stepMinutes) * 60 * 1000
  const busyRanges = busyResult.busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end) && b.start < b.end)

  const found: SuggestedTrainingSlot[] = []
  for (let start = minMs; start + slotMs <= maxMs; start += stepMs) {
    const end = start + slotMs

    const hour = new Date(start).getHours()
    // Soft business-hours filter
    if (hour < 8 || hour > 18) continue

    const hasConflict = busyRanges.some((b) => overlaps(start, end, b.start, b.end))
    if (hasConflict) continue

    found.push({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    })

    if (found.length >= maxResults) break
  }

  return { skipped: false as const, slots: found }
}
