import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { IntakeSubmitBody, IntakeTeamMember } from '@/lib/types'

const NO_STORE = { 'Cache-Control': 'no-store' } as const
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portal.brandiscode.com'
const FROM = process.env.EMAIL_FROM ?? 'Brand is Code <noreply@brandiscode.com>'

// ── helpers ───────────────────────────────────────────────────────────────────

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
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
    .select('id, company, name')
    .eq('id', tokenRow.client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404, headers: NO_STORE })
  }

  return NextResponse.json(
    { valid: true, client: { id: client.id, company: client.company ?? client.name } },
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
    .select('id, company, name')
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
  }

  // ── 1. Update client with company info ────────────────────────────────────
  const companyPatch: Record<string, string | string[] | null> = {}
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
  const resend = new Resend(process.env.RESEND_API_KEY)
  const companyName = client.company ?? client.name
  const errors: string[] = []

  for (const member of body.team_members as IntakeTeamMember[]) {
    const email = member.email.trim().toLowerCase()
    const temporaryPassword = generateTemporaryPassword()

    // Create Supabase Auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
    })

    if (authError && !authError.message.includes('already been registered')) {
      errors.push(`Auth aanmaken mislukt voor ${email}: ${authError.message}`)
      continue
    }

    const authUserId = authData?.user?.id

    // Upsert client_users
    const { error: cuError } = await admin
      .from('client_users')
      .upsert(
        {
          client_id: tokenRow.client_id,
          email,
          name: member.name.trim(),
          role: member.role,
          function_title: member.function_title?.trim() ?? null,
          intake_profile: member.profile ?? {},
          ...(authUserId ? { user_id: authUserId } : {}),
        },
        { onConflict: 'client_id,email' }
      )

    if (cuError) {
      errors.push(`Gebruikersrecord opslaan mislukt voor ${email}: ${cuError.message}`)
    }

    // Only send welcome email for newly created users (not existing ones)
    if (!authError) {
      try {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `Welkom bij het Brand is Code portal — ${companyName}`,
          html: welcomeEmailHtml({
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
