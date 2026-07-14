import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const admin = createAdminClient()
  const { id: clientId } = params

  const [{ data: client, error: clientError }, { data: plan, error: planError }] = await Promise.all([
    admin
      .from('clients')
      .select('id, name, company, email, billing_email')
      .eq('id', clientId)
      .maybeSingle(),
    admin
      .from('recurring_invoice_plans')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),
  ])

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)
  if (planError) return noStore({ error: planError.message }, 500)

  if (!plan) {
    return noStore({
      plan: {
        enabled: false,
        title: 'Website onderhoud - maandfactuur',
        description: 'Onderhoud website',
        amount: null,
        btw_percentage: 21,
        due_days: 14,
        send_to: client.billing_email || client.email || '',
        last_generated_month: null,
        last_generated_at: null,
      },
      client,
    })
  }

  return noStore({ plan, client })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const { id: clientId } = params
  const body = await req.json().catch(() => ({})) as {
    enabled?: boolean
    title?: string
    description?: string
    amount?: number
    btw_percentage?: number
    due_days?: number
    send_to?: string
  }

  const enabled = body.enabled === true
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const amount = Number(body.amount)
  const btw = Number(body.btw_percentage)
  const dueDays = Number(body.due_days)
  const sendTo = typeof body.send_to === 'string' ? body.send_to.trim().toLowerCase() : ''

  if (!title) return noStore({ error: 'Titel is verplicht.' }, 422)
  if (!Number.isFinite(amount) || amount <= 0) return noStore({ error: 'Bedrag moet groter zijn dan 0.' }, 422)
  if (!Number.isFinite(btw) || btw < 0) return noStore({ error: 'BTW % is ongeldig.' }, 422)
  if (!Number.isInteger(dueDays) || dueDays < 0 || dueDays > 90) return noStore({ error: 'Betaaltermijn (dagen) is ongeldig.' }, 422)
  if (!sendTo || !sendTo.includes('@')) return noStore({ error: 'Verzend e-mail is ongeldig.' }, 422)

  const admin = createAdminClient()

  const { data: existing, error: existingError } = await admin
    .from('recurring_invoice_plans')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingError) return noStore({ error: existingError.message }, 500)

  const payload = {
    client_id: clientId,
    enabled,
    title,
    description: description || null,
    amount,
    btw_percentage: btw,
    due_days: dueDays,
    send_to: sendTo,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    created_by: user.id,
  }

  const { data: plan, error } = existing
    ? await admin
      .from('recurring_invoice_plans')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    : await admin
      .from('recurring_invoice_plans')
      .insert(payload)
      .select('*')
      .single()

  if (error) return noStore({ error: error.message }, 500)

  return noStore({ success: true, plan })
}
