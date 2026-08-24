import { createClient } from '@/lib/supabase/server'
import { suggestTrainingSlots } from '@/lib/googleCalendar'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

/**
 * GET /api/admin/training-calendar/availability
 * Query:
 *   time_min (ISO required)
 *   time_max (ISO required)
 *   slot_minutes (default 120)
 *   max_results (default 8)
 */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const timeMin = req.nextUrl.searchParams.get('time_min')
  const timeMax = req.nextUrl.searchParams.get('time_max')
  const slotMinutes = Number(req.nextUrl.searchParams.get('slot_minutes') ?? 120)
  const maxResults = Number(req.nextUrl.searchParams.get('max_results') ?? 8)

  if (!timeMin || Number.isNaN(Date.parse(timeMin))) {
    return noStore({ error: 'time_min is verplicht en moet geldig ISO formaat zijn' }, 400)
  }
  if (!timeMax || Number.isNaN(Date.parse(timeMax))) {
    return noStore({ error: 'time_max is verplicht en moet geldig ISO formaat zijn' }, 400)
  }
  if (!Number.isFinite(slotMinutes) || slotMinutes < 30 || slotMinutes > 240) {
    return noStore({ error: 'slot_minutes moet tussen 30 en 240 liggen' }, 400)
  }

  try {
    const result = await suggestTrainingSlots({
      timeMinIso: new Date(timeMin).toISOString(),
      timeMaxIso: new Date(timeMax).toISOString(),
      slotMinutes: Math.floor(slotMinutes),
      maxResults: Math.max(1, Math.min(20, Math.floor(maxResults))),
    })

    return noStore(result)
  } catch (err) {
    return noStore(
      { error: err instanceof Error ? err.message : 'Beschikbaarheid ophalen mislukt' },
      500
    )
  }
}
