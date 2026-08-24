import crypto from 'crypto'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const TRAINING_TIMEZONE = process.env.TRAINING_CALENDAR_TIMEZONE ?? 'Europe/Amsterdam'
const DEFAULT_ALLOWED_WEEKDAYS = '5,6' // vrijdag (5), zaterdag (6)
const DEFAULT_ALLOWED_START_HOUR = 8
const DEFAULT_ALLOWED_END_HOUR = 12

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

function parseCalendarIdsFromEnv(value: string | undefined) {
  if (!value) return []
  return value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function getBlockingCalendarIds() {
  const trainingId = process.env.GOOGLE_CALENDAR_TRAINING_ID?.trim()
  const extraIds = parseCalendarIdsFromEnv(process.env.GOOGLE_CALENDAR_BLOCKING_IDS)
  const ids = [trainingId, ...extraIds].filter((id): id is string => Boolean(id))
  return Array.from(new Set(ids))
}

function getAllowedWeekdays() {
  const source = process.env.TRAINING_ALLOWED_WEEKDAYS?.trim() || DEFAULT_ALLOWED_WEEKDAYS
  const values = source
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
  return new Set(values.length > 0 ? values : [5, 6])
}

function getAllowedHours() {
  const startHour = Number(process.env.TRAINING_ALLOWED_START_HOUR ?? DEFAULT_ALLOWED_START_HOUR)
  const endHour = Number(process.env.TRAINING_ALLOWED_END_HOUR ?? DEFAULT_ALLOWED_END_HOUR)
  return {
    startHour: Number.isFinite(startHour) ? startHour : DEFAULT_ALLOWED_START_HOUR,
    endHour: Number.isFinite(endHour) ? endHour : DEFAULT_ALLOWED_END_HOUR,
  }
}

function getAvailabilityUntilIso() {
  const raw = process.env.TRAINING_AVAILABILITY_UNTIL?.trim()
  if (!raw) return null
  const parsed = Date.parse(raw)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = fmt.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return {
    weekday: weekdayMap[get('weekday')] ?? -1,
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function sameZonedDay(a: ReturnType<typeof getZonedParts>, b: ReturnType<typeof getZonedParts>) {
  return a.year === b.year && a.month === b.month && a.day === b.day
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
  const calendarIds = getBlockingCalendarIds()
  if (calendarIds.length === 0) {
    return {
      skipped: true as const,
      reason: 'GOOGLE_CALENDAR_TRAINING_ID (of GOOGLE_CALENDAR_BLOCKING_IDS) ontbreekt',
      busy: [] as TrainingBusyInterval[],
    }
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
      items: calendarIds.map((id) => ({ id })),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google freeBusy mislukt: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as {
    calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>
  }

  const busy = Object.values(payload.calendars ?? {}).flatMap((entry) => entry.busy ?? [])
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
  let maxMs = Date.parse(timeMaxIso)
  if (Number.isNaN(minMs) || Number.isNaN(maxMs) || minMs >= maxMs) {
    return { skipped: false as const, slots: [] as SuggestedTrainingSlot[] }
  }

  const untilIso = getAvailabilityUntilIso()
  if (untilIso) {
    const untilMs = Date.parse(untilIso)
    if (!Number.isNaN(untilMs)) {
      maxMs = Math.min(maxMs, untilMs)
    }
  }

  if (minMs >= maxMs) {
    return { skipped: false as const, slots: [] as SuggestedTrainingSlot[] }
  }

  const slotMs = slotMinutes * 60 * 1000
  const stepMs = Math.max(15, stepMinutes) * 60 * 1000
  const allowedWeekdays = getAllowedWeekdays()
  const { startHour, endHour } = getAllowedHours()
  const busyRanges = busyResult.busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end) && b.start < b.end)

  const found: SuggestedTrainingSlot[] = []
  for (let start = minMs; start + slotMs <= maxMs; start += stepMs) {
    const end = start + slotMs

    const startParts = getZonedParts(new Date(start), TRAINING_TIMEZONE)
    const endParts = getZonedParts(new Date(end), TRAINING_TIMEZONE)

    if (!allowedWeekdays.has(startParts.weekday)) continue
    if (!sameZonedDay(startParts, endParts)) continue

    const startMinutes = startParts.hour * 60 + startParts.minute
    const endMinutes = endParts.hour * 60 + endParts.minute
    if (startMinutes < startHour * 60) continue
    if (endMinutes > endHour * 60) continue

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
