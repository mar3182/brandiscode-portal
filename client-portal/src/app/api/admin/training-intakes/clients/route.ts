import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const search = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()
  const admin = createAdminClient()

  const { data: clients, error: clientError } = await admin
    .from('clients')
    .select('id, name, company, email, created_at')
    .order('created_at', { ascending: false })

  if (clientError) return noStore({ error: clientError.message }, 500)

  const { data: intakes, error: intakeError } = await admin
    .from('training_intakes')
    .select('client_id')

  if (intakeError) return noStore({ error: intakeError.message }, 500)

  const usedClientIds = new Set((intakes || []).map((item) => item.client_id))

  const available = (clients || [])
    .filter((client) => !usedClientIds.has(client.id))
    .filter((client) => {
      if (!search) return true
      const haystack = `${client.company || ''} ${client.name || ''} ${client.email || ''}`.toLowerCase()
      return haystack.includes(search)
    })

  return noStore({
    clients: available,
    total: available.length,
  })
}
