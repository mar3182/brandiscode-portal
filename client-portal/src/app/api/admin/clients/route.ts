import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { validateCompanyProfileFields } from '@/lib/companyProfileValidation'
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_SECTORS = ['generic', 'real_estate', 'professional_services'] as const
type SupportedSector = (typeof VALID_SECTORS)[number]

const SECTOR_PROFILES: Record<SupportedSector, { software_options: string[]; daily_tasks_options: string[] }> = {
  generic: {
    software_options: ['Outlook', 'Word', 'Excel', 'WhatsApp Business', 'Google Workspace', 'Andere'],
    daily_tasks_options: ['E-mails beantwoorden', 'Klantcontact', 'Documenten opstellen', 'Data invoeren', 'Afspraken plannen', 'Rapporten maken', 'Anders'],
  },
  real_estate: {
    software_options: ['Realworks', 'Outlook', 'Word', 'Excel', 'WhatsApp Business', 'Google Workspace', 'Andere'],
    daily_tasks_options: ['E-mails beantwoorden', 'Klantcontact', 'Documenten opstellen', 'Data invoeren', 'Afspraken plannen', 'Rapporten maken', 'Woningbeschrijvingen schrijven', 'Anders'],
  },
  professional_services: {
    software_options: ['Microsoft Teams', 'SharePoint', 'Notion', 'Outlook', 'Word', 'Excel', 'WhatsApp Business', 'Google Workspace', 'Andere'],
    daily_tasks_options: ['E-mails beantwoorden', 'Klantcontact', 'Documenten opstellen', 'Data invoeren', 'Afspraken plannen', 'Rapporten maken', 'Adviesvoorstellen maken', 'Klantdossiers bijwerken', 'Anders'],
  },
}

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

function normalizeSector(value: unknown): SupportedSector {
  if (typeof value !== 'string') return 'generic'
  const normalized = value.trim().toLowerCase()
  return (VALID_SECTORS as readonly string[]).includes(normalized) ? (normalized as SupportedSector) : 'generic'
}

function classifySectorByHeuristic(raw: string): { sector: SupportedSector; confidence: number } {
  const text = raw.toLowerCase()

  const realEstateKeywords = ['makelaar', 'makelaardij', 'woning', 'huizen', 'funda', 'vastgoed', 'verhuur', 'koopwoning']
  if (realEstateKeywords.some((k) => text.includes(k))) {
    return { sector: 'real_estate', confidence: 0.86 }
  }

  const servicesKeywords = ['advies', 'consult', 'account', 'jurid', 'administratie', 'dienstverlening', 'kantoor', 'mkb']
  if (servicesKeywords.some((k) => text.includes(k))) {
    return { sector: 'professional_services', confidence: 0.8 }
  }

  return { sector: 'generic', confidence: 0.62 }
}

function getOpenAI(): OpenAI | null {
  if (process.env.GITHUB_TOKEN) {
    return new OpenAI({
      apiKey: process.env.GITHUB_TOKEN,
      baseURL: 'https://models.inference.ai.azure.com',
    })
  }
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return null
}

async function classifySector(raw: string | null): Promise<{ sector: SupportedSector; confidence: number; intakeProfile: Record<string, string[]> }> {
  if (!raw) {
    return { sector: 'generic', confidence: 0.5, intakeProfile: SECTOR_PROFILES.generic }
  }

  const heuristic = classifySectorByHeuristic(raw)
  const openai = getOpenAI()
  if (!openai) {
    return { sector: heuristic.sector, confidence: heuristic.confidence, intakeProfile: SECTOR_PROFILES[heuristic.sector] }
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: 'Classificeer een bedrijfssector naar exact een van: generic, real_estate, professional_services. Antwoord alleen JSON met keys: sector en confidence (0-1).',
        },
        {
          role: 'user',
          content: `Branche/sector omschrijving: ${raw}`,
        },
      ],
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as { sector?: string; confidence?: number }
    const sector = normalizeSector(parsed.sector)
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : heuristic.confidence

    return { sector, confidence, intakeProfile: SECTOR_PROFILES[sector] }
  } catch {
    return { sector: heuristic.sector, confidence: heuristic.confidence, intakeProfile: SECTOR_PROFILES[heuristic.sector] }
  }
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
  const sectorRaw = normalizeOptionalString(body.sector_raw)
  const sectorClassification = await classifySector(sectorRaw)

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
    sector_raw: sectorRaw,
    sector: sectorClassification.sector,
    sector_confidence: sectorClassification.confidence,
    intake_profile: sectorClassification.intakeProfile,
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
  const sectorRaw = normalizeOptionalString(body.sector_raw)
  const sectorClassification = await classifySector(sectorRaw)

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
    sector_raw: sectorRaw,
    sector: sectorClassification.sector,
    sector_confidence: sectorClassification.confidence,
    intake_profile: sectorClassification.intakeProfile,
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
