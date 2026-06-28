import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
  })
}

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET /api/admin/onboarding/trigger?client_id=...
// Geeft onboarding voortgang terug voor een klant
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = req.nextUrl.searchParams.get('client_id')
  if (!clientId) return noStore({ error: 'client_id is verplicht' }, 400)

  const admin = createAdminClient()

  const { data: client, error } = await admin
    .from('clients')
    .select(
      'id, company, name, email, contact_person, kvk_number, btw_number, iban, ' +
      'billing_email, billing_address_line1, billing_postal_code, billing_city, ' +
      'onboarding_completed_at'
    )
    .eq('id', clientId)
    .single()

  if (error) return noStore({ error: error.message }, 500)

  // Bepaal voltooiing per stap op basis van ingevulde velden
  const billingComplete = !!(
    client?.contact_person &&
    client?.billing_email &&
    client?.billing_address_line1 &&
    client?.billing_postal_code &&
    client?.billing_city
  )

  return noStore({
    client_id: clientId,
    company: client?.company,
    onboarding_completed_at: client?.onboarding_completed_at,
    billing_complete: billingComplete,
    steps: {
      billing: billingComplete,
      tour: billingComplete, // tour is altijd ok na billing
      complete: !!client?.onboarding_completed_at,
    },
  })
}

// POST /api/admin/onboarding/trigger
// Body: { client_id: string, action: 'trigger' | 'reset' }
// trigger = start onboarding opnieuw (reset completed_at + user metadata)
// reset = zelfde als trigger
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const body = await req.json() as { client_id?: string; action?: string }
  const { client_id: clientId, action = 'trigger' } = body

  if (!clientId) return noStore({ error: 'client_id is verplicht' }, 400)
  if (action !== 'trigger' && action !== 'reset') {
    return noStore({ error: 'action moet "trigger" of "reset" zijn' }, 400)
  }

  const admin = createAdminClient()

  // Reset onboarding_completed_at in clients tabel
  const { error: dbError } = await admin
    .from('clients')
    .update({ onboarding_completed_at: null })
    .eq('id', clientId)

  if (dbError) return noStore({ error: dbError.message }, 500)

  // Reset ook user metadata voor alle gebruikers van deze klant
  const { data: clientUsers } = await admin
    .from('client_users')
    .select('email')
    .eq('client_id', clientId)

  if (clientUsers && clientUsers.length > 0) {
    // Haal auth users op per email en reset metadata
    for (const cu of clientUsers) {
      const { data: authUsers } = await admin.auth.admin.listUsers()
      const authUser = authUsers?.users?.find((u) => u.email === cu.email)
      if (authUser) {
        await admin.auth.admin.updateUserById(authUser.id, {
          user_metadata: {
            ...authUser.user_metadata,
            onboarding_completed: false,
          },
        })
      }
    }
  }

  return noStore({ success: true, message: `Onboarding getriggerd voor klant ${clientId}` })
}
