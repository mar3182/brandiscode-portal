import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCompanyProfileFields } from '@/lib/companyProfileValidation'
import { NextRequest, NextResponse } from 'next/server'

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
  })
}

async function getCallerInfo() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !user?.id) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .order('created_at', { ascending: true })
    .limit(1)

  const clientId = data?.[0]?.client_id
  if (!clientId) return null

  return { userId: user.id, clientId }
}

// GET — haal huidige billing data + voltooiingsstatus op
export async function GET() {
  const caller = await getCallerInfo()
  if (!caller) return noStore({ error: 'Niet ingelogd' }, 401)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select(
      'company, contact_person, kvk_number, btw_number, iban, billing_email, ' +
      'billing_address_line1, billing_address_line2, billing_postal_code, ' +
      'billing_city, billing_country, onboarding_completed_at'
    )
    .eq('id', caller.clientId)
    .single()

  if (error) return noStore({ error: (error as { message: string }).message }, 500)

  const client = data as unknown as {
    company: string | null
    contact_person: string | null
    kvk_number: string | null
    btw_number: string | null
    iban: string | null
    billing_email: string | null
    billing_address_line1: string | null
    billing_address_line2: string | null
    billing_postal_code: string | null
    billing_city: string | null
    billing_country: string | null
    onboarding_completed_at: string | null
  } | null

  return noStore({
    client,
    completed: !!client?.onboarding_completed_at,
  })
}

// POST — sla stap op of markeer onboarding als voltooid
export async function POST(req: NextRequest) {
  const caller = await getCallerInfo()
  if (!caller) return noStore({ error: 'Niet ingelogd' }, 401)

  const body = await req.json()
  const { step } = body as { step: string }

  const admin = createAdminClient()

  // Stap 1: bedrijfsgegevens opslaan
  if (step === 'billing') {
    const {
      contact_person,
      kvk_number,
      btw_number,
      iban,
      billing_email,
      billing_address_line1,
      billing_address_line2,
      billing_postal_code,
      billing_city,
      billing_country,
    } = body as Record<string, string | null>

    const { errors, normalized } = validateCompanyProfileFields({
      billing_email: billing_email ?? null,
      kvk_number: kvk_number ?? null,
      btw_number: btw_number ?? null,
      iban: iban ?? null,
    })

    if (Object.keys(errors).length > 0) {
      return noStore({ errors }, 422)
    }

    const { error } = await admin
      .from('clients')
      .update({
        contact_person: contact_person?.trim() || null,
        kvk_number: normalized.kvk_number,
        btw_number: normalized.btw_number,
        iban: normalized.iban,
        billing_email: normalized.billing_email,
        billing_address_line1: billing_address_line1?.trim() || null,
        billing_address_line2: billing_address_line2?.trim() || null,
        billing_postal_code: billing_postal_code?.trim() || null,
        billing_city: billing_city?.trim() || null,
        billing_country: billing_country?.trim() || 'Nederland',
      })
      .eq('id', caller.clientId)

    if (error) return noStore({ error: error.message }, 500)

    return noStore({ success: true })
  }

  // Stap 3: onboarding voltooien
  if (step === 'complete') {
    const { error: dbError } = await admin
      .from('clients')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', caller.clientId)

    if (dbError) return noStore({ error: dbError.message }, 500)

    // Sla voltooiing op in user metadata zodat middleware het kan lezen
    const supabase = createClient()
    await supabase.auth.updateUser({
      data: { onboarding_completed: true },
    })

    return noStore({ success: true })
  }

  return noStore({ error: 'Onbekende stap' }, 400)
}
