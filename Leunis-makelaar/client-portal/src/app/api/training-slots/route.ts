import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * GET /api/training-slots
 * Haalt openstaande tijdsloten op voor de ingelogde klant
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return noStore({ error: 'Niet ingelogd' }, 401)

  const admin = createAdminClient()

  // Zoek client op via email
  const { data: clientUser } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .single()

  if (!clientUser) return noStore({ slots: [] })

  const { data: slots, error } = await admin
    .from('training_slots')
    .select('*')
    .eq('client_id', clientUser.client_id)
    .order('slot_start', { ascending: true })

  if (error) return noStore({ error: error.message }, 500)
  return noStore({ slots: slots ?? [] })
}
