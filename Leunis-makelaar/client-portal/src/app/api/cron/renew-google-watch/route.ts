import { renewGoogleCalendarWatch } from '@/lib/googleCalendar'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')
  const providedToken = bearer?.startsWith('Bearer ') ? bearer.slice(7) : ''
  const expectedToken = process.env.CRON_SECRET ?? ''

  if (!expectedToken) return false
  return providedToken === expectedToken
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return noStore({ error: 'Unauthorized' }, 401)
  }

  try {
    const result = await renewGoogleCalendarWatch()
    return noStore({ success: true, ...result })
  } catch (error) {
    console.error('Google Calendar watch renew mislukt:', error)
    return noStore({ error: 'Watch renew mislukt' }, 500)
  }
}
