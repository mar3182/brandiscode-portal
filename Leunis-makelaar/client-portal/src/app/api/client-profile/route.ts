import { createAdminClient } from '@/lib/supabase/admin'
import { validateCompanyProfileFields } from '@/lib/companyProfileValidation'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function mapSchemaCacheError(message: string) {
  if (message.includes('schema cache') || message.includes('Could not find the')) {
    return 'Database mist nieuwe klantprofiel-kolommen. Voer eerst supabase/migration-client-profile.sql uit in Supabase SQL Editor en herlaad daarna de app.'
  }
  return message
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

async function getCaller() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id, role, name')
    .eq('email', user.email)
    .order('created_at', { ascending: true })
    .limit(1)

  const caller = data?.[0]
  if (!caller?.client_id) return null

  return {
    client_id: caller.client_id,
    role: caller.role,
    owner_name: caller.name,
    email: user.email,
  }
}

export async function GET() {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .select('*')
    .eq('id', caller.client_id)
    .single()

  if (error) return NextResponse.json({ error: mapSchemaCacheError(error.message) }, { status: 500 })

  return NextResponse.json({
    ...data,
    caller_role: caller.role,
    owner_name: caller.owner_name,
  })
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const update = {
    name: normalizeOptionalString(body.name),
    company: normalizeOptionalString(body.company),
    phone: normalizeOptionalString(body.phone),
    contact_person: normalizeOptionalString(body.contact_person),
    kvk_number: normalizeOptionalString(body.kvk_number),
    btw_number: normalizeOptionalString(body.btw_number),
    iban: normalizeOptionalString(body.iban),
    billing_email: normalizeOptionalString(body.billing_email),
    billing_address_line1: normalizeOptionalString(body.billing_address_line1),
    billing_address_line2: normalizeOptionalString(body.billing_address_line2),
    billing_postal_code: normalizeOptionalString(body.billing_postal_code),
    billing_city: normalizeOptionalString(body.billing_city),
    billing_country: normalizeOptionalString(body.billing_country),
    onboarding_completed_at:
      typeof body.mark_completed === 'boolean'
        ? (body.mark_completed ? new Date().toISOString() : null)
        : undefined,
  }

  if (!update.name) {
    return NextResponse.json({ error: 'Contactnaam is verplicht' }, { status: 400 })
  }

  const validation = validateCompanyProfileFields({
    billing_email: update.billing_email,
    kvk_number: update.kvk_number,
    btw_number: update.btw_number,
    iban: update.iban,
  })

  if (Object.keys(validation.errors).length > 0) {
    return NextResponse.json(
      { error: 'Controleer de ingevulde bedrijfsgegevens', field_errors: validation.errors },
      { status: 400 }
    )
  }

  update.billing_email = validation.normalized.billing_email ?? null
  update.kvk_number = validation.normalized.kvk_number ?? null
  update.btw_number = validation.normalized.btw_number ?? null
  update.iban = validation.normalized.iban ?? null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .update(update)
    .eq('id', caller.client_id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: mapSchemaCacheError(error.message) }, { status: 500 })

  const ownerName = normalizeOptionalString(body.owner_name)
  if (ownerName) {
    await admin
      .from('client_users')
      .update({ name: ownerName })
      .eq('client_id', caller.client_id)
      .eq('role', 'owner')
      .eq('email', caller.email)
  }

  return NextResponse.json(data)
}
