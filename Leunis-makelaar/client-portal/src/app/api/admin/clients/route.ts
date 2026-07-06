import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCompanyProfileFields } from '@/lib/companyProfileValidation'
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

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return null
  }
  return user
}

// GET all clients
export async function GET() {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('clients').select('*').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: mapSchemaCacheError(error.message) }, { status: 500 })
  return NextResponse.json(data)
}

// POST new client
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email } = body

  const payload = {
    name: normalizeOptionalString(name),
    email: normalizeOptionalString(email),
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
  }

  if (!payload.name || !payload.email) {
    return NextResponse.json({ error: 'Naam en e-mail zijn verplicht' }, { status: 400 })
  }

  const postValidation = validateCompanyProfileFields({
    email: payload.email,
    billing_email: payload.billing_email,
    kvk_number: payload.kvk_number,
    btw_number: payload.btw_number,
    iban: payload.iban,
  })

  if (Object.keys(postValidation.errors).length > 0) {
    return NextResponse.json(
      { error: 'Controleer de ingevulde bedrijfsgegevens', field_errors: postValidation.errors },
      { status: 400 }
    )
  }

  payload.email = postValidation.normalized.email
  payload.billing_email = postValidation.normalized.billing_email ?? null
  payload.kvk_number = postValidation.normalized.kvk_number ?? null
  payload.btw_number = postValidation.normalized.btw_number ?? null
  payload.iban = postValidation.normalized.iban ?? null

  const requiredEmail = payload.email
  if (!requiredEmail) {
    return NextResponse.json({ error: 'E-mail is verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Create Supabase Auth user so they can log in with magic link
  const { error: authError } = await admin.auth.admin.createUser({
    email: requiredEmail,
    email_confirm: true, // Skip email confirmation — admin verified the email
    user_metadata: { name: payload.name, company: payload.company },
  })

  // Ignore "User already registered" — they may already have an auth account
  if (authError && !authError.message.includes('already been registered')) {
    return NextResponse.json({ error: `Auth: ${authError.message}` }, { status: 500 })
  }

  // 2. Insert into clients table
  const { data, error } = await admin
    .from('clients')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: mapSchemaCacheError(error.message) }, { status: 500 })

  // 3. Insert owner record into client_users
  await admin.from('client_users').insert({
    client_id: data.id,
    email: payload.email,
    name: payload.name,
    role: 'owner',
  })

  return NextResponse.json(data, { status: 201 })
}

// PATCH update client profile fields
export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const id = normalizeOptionalString(body.id)

  if (!id) {
    return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })
  }

  const update = {
    name: normalizeOptionalString(body.name),
    email: normalizeOptionalString(body.email),
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
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  if (!update.email) {
    return NextResponse.json({ error: 'E-mail is verplicht' }, { status: 400 })
  }

  const patchValidation = validateCompanyProfileFields({
    email: update.email,
    billing_email: update.billing_email,
    kvk_number: update.kvk_number,
    btw_number: update.btw_number,
    iban: update.iban,
  })

  if (Object.keys(patchValidation.errors).length > 0) {
    return NextResponse.json(
      { error: 'Controleer de ingevulde bedrijfsgegevens', field_errors: patchValidation.errors },
      { status: 400 }
    )
  }

  update.email = patchValidation.normalized.email
  update.billing_email = patchValidation.normalized.billing_email ?? null
  update.kvk_number = patchValidation.normalized.kvk_number ?? null
  update.btw_number = patchValidation.normalized.btw_number ?? null
  update.iban = patchValidation.normalized.iban ?? null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clients')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })

  const ownerName = normalizeOptionalString(body.owner_name)
  if (ownerName) {
    await admin
      .from('client_users')
      .update({ name: ownerName })
      .eq('client_id', id)
      .eq('role', 'owner')
      .eq('email', data.email)
  }

  return NextResponse.json(data)
}
