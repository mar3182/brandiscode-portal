import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import OpenAI from 'openai'
import { buildPortalReadyEmail, getTeamMemberEmailKind } from '@/lib/onboardingEmails.mjs'
import type { IntakeSubmitBody, IntakeTeamMember } from '@/lib/types'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' } as const
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portal.brandiscode.com'
const FROM = process.env.EMAIL_FROM ?? 'Brand is Code <noreply@brandiscode.com>'
const DIGITAL_SKILL_VALUES = ['basis', 'gemiddeld', 'gevorderd', 'expert'] as const
const AI_EXPERIENCE_VALUES = ['nooit', 'geprobeerd', 'soms', 'regelmatig', 'dagelijks'] as const
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

// ── helpers ───────────────────────────────────────────────────────────────────

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function normalizeOptionalString(value: unknown): string | null {
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
  if (realEstateKeywords.some((keyword) => text.includes(keyword))) {
    return { sector: 'real_estate', confidence: 0.86 }
  }

  const servicesKeywords = ['advies', 'consult', 'account', 'jurid', 'administratie', 'dienstverlening', 'kantoor', 'mkb']
  if (servicesKeywords.some((keyword) => text.includes(keyword))) {
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

function welcomeEmailHtml(params: {
  name: string
  company: string
  email: string
  password: string
}): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Welkom bij het portal</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;color:#cbd5e1">Hallo ${params.name},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            Je bent uitgenodigd voor het Brand is Code klanten portal van
            <strong style="color:#e2e8f0">${params.company}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Inloggegevens</p>
              <p style="margin:0 0 4px;color:#e2e8f0">
                <strong>Portaal:</strong>
                <a href="${BASE_URL}/login" style="color:#f97316;text-decoration:none">${BASE_URL}/login</a>
              </p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>E-mail:</strong> ${params.email}</p>
              <p style="margin:0;color:#e2e8f0"><strong>Tijdelijk wachtwoord:</strong> <code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:15px;color:#f97316">${params.password}</code></p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6;font-size:14px">
            Na het inloggen word je gevraagd je wachtwoord te wijzigen.
          </p>
          <a href="${BASE_URL}/login" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">
            Inloggen op het portal
          </a>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #334155">
          <p style="margin:0;font-size:12px;color:#475569;text-align:center">
            Met vriendelijke groet, Brand is Code &mdash;
            <a href="https://brandiscode.com" style="color:#f97316;text-decoration:none">brandiscode.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function existingUserEmailHtml(params: {
  name: string
  company: string
  email: string
}): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Je portal-account staat klaar</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;color:#cbd5e1">Hallo ${params.name},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            Je bent toegevoegd aan het Brand is Code klanten portal van
            <strong style="color:#e2e8f0">${params.company}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Inloggen</p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>Portaal:</strong> <a href="${BASE_URL}/login" style="color:#f97316;text-decoration:none">${BASE_URL}/login</a></p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>E-mail:</strong> ${params.email}</p>
              <p style="margin:0;color:#94a3b8;font-size:14px">Wachtwoord vergeten? Vraag een nieuwe aan via onderstaande knop.</p>
            </td></tr>
          </table>
          <a href="${BASE_URL}/login/wachtwoord-vergeten" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">
            Wachtwoord opnieuw instellen
          </a>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #334155">
          <p style="margin:0;font-size:12px;color:#475569;text-align:center">
            Met vriendelijke groet, Brand is Code &mdash;
            <a href="https://brandiscode.com" style="color:#f97316;text-decoration:none">brandiscode.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── shared token validation ────────────────────────────────────────────────────

async function validateToken(token: string) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('intake_tokens')
    .select('id, client_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error) return { ok: false as const, status: 500, message: 'Serverfout bij token validatie' }
  if (!data) return { ok: false as const, status: 404, message: 'Token niet gevonden of ongeldig' }
  if (data.used_at) return { ok: false as const, status: 410, message: 'Deze intake link is al gebruikt' }
  if (new Date(data.expires_at) < new Date()) return { ok: false as const, status: 410, message: 'Deze intake link is verlopen' }

  return { ok: true as const, tokenRow: data, admin }
}

// ── GET /api/intake/[token] ───────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const result = await validateToken(params.token)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status, headers: NO_STORE })
  }

  const { tokenRow, admin } = result

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, company, name, sector, sector_confidence, intake_profile')
    .eq('id', tokenRow.client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404, headers: NO_STORE })
  }

  // Haal openstaande offerte op (verstuurd of bekeken)
  const { data: offerte } = await admin
    .from('offertes')
    .select('id, title, description, total_amount, status')
    .eq('client_id', tokenRow.client_id)
    .in('status', ['verstuurd', 'bekeken'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let offerteData: {
    id: string
    title: string
    description: string | null
    total_amount: number
    sprint1: {
      id: string
      number: number
      title: string
      description: string | null
      amount: number
      deliverables: { id: string; title: string }[]
    } | null
  } | null = null

  if (offerte) {
    const { data: sprint1 } = await admin
      .from('sprints')
      .select('id, number, title, description, amount')
      .eq('offerte_id', offerte.id)
      .order('number', { ascending: true })
      .limit(1)
      .maybeSingle()

    let deliverables: { id: string; title: string }[] = []
    if (sprint1) {
      const { data: dels } = await admin
        .from('deliverables')
        .select('id, title')
        .eq('sprint_id', sprint1.id)
        .order('created_at', { ascending: true })
      deliverables = dels ?? []
    }

    offerteData = {
      id: offerte.id,
      title: offerte.title,
      description: offerte.description ?? null,
      total_amount: offerte.total_amount,
      sprint1: sprint1
        ? {
            id: sprint1.id,
            number: sprint1.number,
            title: sprint1.title,
            description: sprint1.description ?? null,
            amount: sprint1.amount,
            deliverables,
          }
        : null,
    }
  }

  return NextResponse.json(
    {
      valid: true,
      client: {
        id: client.id,
        company: client.company ?? client.name,
        sector:
          client.sector === 'real_estate'
            ? 'real_estate'
            : client.sector === 'professional_services'
              ? 'professional_services'
              : 'generic',
        sector_confidence: typeof client.sector_confidence === 'number' ? client.sector_confidence : null,
        intake_profile: client.intake_profile ?? null,
      },
      offerte: offerteData,
    },
    { headers: NO_STORE }
  )
}

// ── POST /api/intake/[token] ──────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const result = await validateToken(params.token)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status, headers: NO_STORE })
  }

  const { tokenRow, admin } = result

  // Fetch client info
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, company, name, email')
    .eq('id', tokenRow.client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404, headers: NO_STORE })
  }

  let body: IntakeSubmitBody
  try {
    body = (await req.json()) as IntakeSubmitBody
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400, headers: NO_STORE })
  }

  // Validate team_members
  if (!Array.isArray(body.team_members) || body.team_members.length === 0) {
    return NextResponse.json({ error: 'Minimaal één teamlid is verplicht' }, { status: 400, headers: NO_STORE })
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  for (const member of body.team_members) {
    if (!member.name?.trim()) {
      return NextResponse.json({ error: 'Naam van een teamlid ontbreekt' }, { status: 400, headers: NO_STORE })
    }
    if (!member.email?.trim() || !EMAIL_REGEX.test(member.email.trim())) {
      return NextResponse.json({ error: `Ongeldig e-mailadres: ${member.email}` }, { status: 400, headers: NO_STORE })
    }
    if (member.role !== 'owner' && member.role !== 'member') {
      return NextResponse.json({ error: `Ongeldig rol: ${member.role}` }, { status: 400, headers: NO_STORE })
    }

    if (!member.profile || typeof member.profile !== 'object') {
      return NextResponse.json(
        { error: `Profielinformatie ontbreekt voor teamlid: ${member.name}` },
        { status: 400, headers: NO_STORE }
      )
    }

    if (!member.profile.digital_skill || !DIGITAL_SKILL_VALUES.includes(member.profile.digital_skill)) {
      return NextResponse.json(
        { error: `Computer/tech vaardigheid ontbreekt of is ongeldig voor teamlid: ${member.name}` },
        { status: 400, headers: NO_STORE }
      )
    }

    if (!member.profile.ai_experience || !AI_EXPERIENCE_VALUES.includes(member.profile.ai_experience)) {
      return NextResponse.json(
        { error: `AI-ervaring ontbreekt of is ongeldig voor teamlid: ${member.name}` },
        { status: 400, headers: NO_STORE }
      )
    }
  }

  // ── 0. Verwerk offerte-goedkeuring (optioneel) ───────────────────────────
  if (body.sprint1_id && body.offerte_signature) {
    const sprintId = body.sprint1_id.trim()
    const signatureData = body.offerte_signature.trim()

    // Valideer dat de sprint bij de klant hoort
    const { data: sprintRow, error: sprintFetchError } = await admin
      .from('sprints')
      .select('id, offerte_id, client_approved')
      .eq('id', sprintId)
      .maybeSingle()

    if (!sprintFetchError && sprintRow) {
      // Controleer dat de offerte bij deze klant hoort
      const { data: offerteRow } = await admin
        .from('offertes')
        .select('id, client_id, status')
        .eq('id', sprintRow.offerte_id)
        .eq('client_id', tokenRow.client_id)
        .maybeSingle()

      if (offerteRow) {
        const now = new Date().toISOString()

        // Idempotent: alleen updaten als sprint nog niet goedgekeurd is
        if (!sprintRow.client_approved) {
          await admin
            .from('sprints')
            .update({ client_approved: true, client_approved_at: now })
            .eq('id', sprintId)
        }

        // Idempotent: alleen tekenen als offerte nog niet getekend is
        if (offerteRow.status !== 'getekend') {
          await admin
            .from('offertes')
            .update({
              status: 'getekend',
              signed_at: now,
              signature_data: signatureData,
            })
            .eq('id', offerteRow.id)
        }
      }
    }
  }

  // ── 1. Update client with company info ────────────────────────────────────
  const companyPatch: Record<string, unknown> = {}
  if (body.contact_person !== undefined) companyPatch.contact_person = body.contact_person.trim() || null
  if (body.kvk_number !== undefined) companyPatch.kvk_number = body.kvk_number.trim() || null
  if (body.btw_number !== undefined) companyPatch.btw_number = body.btw_number.trim() || null
  if (body.iban !== undefined) companyPatch.iban = body.iban.trim() || null
  if (body.billing_email !== undefined) companyPatch.billing_email = body.billing_email.trim() || null
  if (body.billing_address_line1 !== undefined) companyPatch.billing_address_line1 = body.billing_address_line1.trim() || null
  if (body.billing_postal_code !== undefined) companyPatch.billing_postal_code = body.billing_postal_code.trim() || null
  if (body.billing_city !== undefined) companyPatch.billing_city = body.billing_city.trim() || null
  if (body.microsoft_subscription !== undefined) companyPatch.microsoft_subscription = body.microsoft_subscription
  if (Array.isArray(body.software_inventory)) companyPatch.software_inventory = body.software_inventory
  if (body.ai_goals !== undefined) companyPatch.ai_goals = body.ai_goals.trim() || null

  if (body.sector_raw !== undefined) {
    const sectorRaw = normalizeOptionalString(body.sector_raw)
    const sectorClassification = await classifySector(sectorRaw)
    companyPatch.sector_raw = sectorRaw
    companyPatch.sector = sectorClassification.sector
    companyPatch.sector_confidence = sectorClassification.confidence
    companyPatch.intake_profile = sectorClassification.intakeProfile
  }

  if (Object.keys(companyPatch).length > 0) {
    const { error: patchError } = await admin
      .from('clients')
      .update(companyPatch)
      .eq('id', tokenRow.client_id)

    if (patchError) {
      return NextResponse.json(
        { error: 'Bedrijfsgegevens opslaan is mislukt: ' + patchError.message },
        { status: 500, headers: NO_STORE }
      )
    }
  }

  // ── 2. Create auth users + client_users records ───────────────────────────
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const companyName = client.company ?? client.name
  const errors: string[] = []

  if (!resend) {
    errors.push('E-mailprovider is niet geconfigureerd (RESEND_API_KEY ontbreekt). Inlogmails zijn niet verstuurd.')
  }

  for (const member of body.team_members as IntakeTeamMember[]) {
    const email = member.email.trim().toLowerCase()
    const temporaryPassword = generateTemporaryPassword()

    // Create Supabase Auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    })

    const alreadyRegistered = Boolean(authError?.message.includes('already been registered'))

    if (authError && !alreadyRegistered) {
      errors.push(`Auth aanmaken mislukt voor ${email}: ${authError.message}`)
      continue
    }

    const authUserId = authData?.user?.id

    // Upsert client_users — altijd user_id updaten als authUserId bestaat
    const upsertPayload: Record<string, unknown> = {
      client_id: tokenRow.client_id,
      email,
      name: member.name.trim(),
      role: member.role,
      function_title: member.function_title?.trim() ?? null,
      intake_profile: member.profile ?? {},
    }

    // Altijd user_id updaten als authUserId bestaat (lost bestaande entries zonder user_id op)
    if (authUserId) {
      upsertPayload.user_id = authUserId
    }

    const { error: cuError } = await admin
      .from('client_users')
      .upsert(upsertPayload, { onConflict: 'client_id,email' })

    if (cuError) {
      errors.push(`Gebruikersrecord opslaan mislukt voor ${email}: ${cuError.message}`)
    }

    if (resend) {
      try {
        const emailKind = getTeamMemberEmailKind(alreadyRegistered)
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: emailKind === 'existing-user'
            ? `Je portal-account staat klaar — ${companyName}`
            : `Welkom bij het Brand is Code portal — ${companyName}`,
          html: emailKind === 'existing-user'
            ? existingUserEmailHtml({
              name: member.name.trim(),
              company: companyName,
              email,
            })
            : welcomeEmailHtml({
              name: member.name.trim(),
              company: companyName,
              email,
              password: temporaryPassword,
            }),
        })
      } catch (emailErr) {
        // Non-fatal: log but don't block the response
        errors.push(`E-mail versturen mislukt voor ${email}: ${String(emailErr)}`)
      }
    }
  }

  if (resend && client.email) {
    try {
      const { subject, html } = buildPortalReadyEmail({
        name: client.name,
        company: companyName,
        email: client.email,
      })

      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject,
        html,
      })
    } catch (emailErr) {
      errors.push(`Portal-welkomstmail versturen mislukt voor hoofdaccount: ${String(emailErr)}`)
    }
  }

  // ── 3. Mark token as used ─────────────────────────────────────────────────
  await admin
    .from('intake_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', params.token)

  return NextResponse.json(
    {
      success: true,
      team_count: body.team_members.length,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    },
    { headers: NO_STORE }
  )
}
