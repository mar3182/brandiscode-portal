import { syncGoogleCalendarSessions, type GoogleWebhookHeaders } from '@/lib/googleCalendar'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function getWebhookSecret() {
  return process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET ?? ''
}

function verifyWebhookToken(req: NextRequest) {
  const token = req.headers.get('x-goog-channel-token') ?? ''
  const expected = getWebhookSecret()
  return Boolean(expected) && token === expected
}

function readHeaders(req: NextRequest): GoogleWebhookHeaders {
  const messageNumberHeader = req.headers.get('x-goog-message-number')
  const parsedMessageNumber = messageNumberHeader ? Number(messageNumberHeader) : null

  return {
    channelId: req.headers.get('x-goog-channel-id'),
    resourceId: req.headers.get('x-goog-resource-id'),
    resourceState: req.headers.get('x-goog-resource-state'),
    resourceUri: req.headers.get('x-goog-resource-uri'),
    messageNumber: parsedMessageNumber !== null && Number.isFinite(parsedMessageNumber) ? parsedMessageNumber : null,
  }
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookToken(req)) {
    return noStore({ error: 'Invalid Google Calendar webhook token' }, 401)
  }

  const headers = readHeaders(req)

  try {
    const result = await syncGoogleCalendarSessions(headers)
    return noStore({ success: true, ...result })
  } catch (error) {
    console.error('Google Calendar webhook verwerking mislukt:', error)
    return noStore({ error: 'Webhook verwerking mislukt' }, 500)
  }
}
