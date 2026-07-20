import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { buildIntakeInvitationEmail } from '@/lib/onboardingEmails.mjs'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SendInvitationBody {
  token?: string
  url?: string
}

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' },
  })
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Niet geautoriseerd' }, 401)

  const clientId = params.id
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, company, name, email')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return noStore({ error: 'Klant niet gevonden' }, 404)
  }

  const body = (await req.json().catch(() => ({}))) as SendInvitationBody
  const tokenFromBody = body.token?.trim()
  const urlFromBody = body.url?.trim()

  let token = tokenFromBody ?? ''
  let intakeUrl = urlFromBody ?? ''

  if (!token && !intakeUrl) {
    return noStore({ error: 'token of url is verplicht' }, 400)
  }

  if (!token && intakeUrl) {
    const fromUrl = intakeUrl.match(/\/intake\/([^/?#]+)/)
    token = fromUrl?.[1] ?? ''
  }

  if (!intakeUrl && token) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portal.brandiscode.com'
    intakeUrl = `${baseUrl}/intake/${token}`
  }

  if (!token || !intakeUrl) {
    return noStore({ error: 'Token of intake-url ongeldig' }, 400)
  }

  const { data: tokenRow, error: tokenError } = await admin
    .from('intake_tokens')
    .select('token, expires_at, used_at, client_id')
    .eq('token', token)
    .single()

  if (tokenError || !tokenRow || tokenRow.client_id !== clientId) {
    return noStore({ error: 'Token niet gevonden voor deze klant' }, 404)
  }

  if (tokenRow.used_at) {
    return noStore({ error: 'Token is al gebruikt' }, 409)
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return noStore({ error: 'Token is verlopen' }, 410)
  }

  if (!process.env.RESEND_API_KEY) {
    return noStore({ error: 'E-mailprovider is niet geconfigureerd (RESEND_API_KEY ontbreekt)' }, 500)
  }

  const mainEmail = client.email?.trim()
  if (!mainEmail) {
    return noStore({ error: 'Klant heeft geen e-mailadres voor intake-uitnodiging' }, 400)
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const temporaryPassword = generateTemporaryPassword()
    const authUser = await admin.auth.admin.createUser({
      email: mainEmail,
      email_confirm: true,
      password: temporaryPassword,
      user_metadata: { name: client.name, company: client.company },
    })

    const alreadyRegistered = Boolean(authUser.error?.message.includes('already been registered'))

    if (authUser.error && !alreadyRegistered) {
      return noStore({ error: `Gebruiker aanmaken is mislukt: ${authUser.error.message}` }, 500)
    }

    const { subject, html } = buildIntakeInvitationEmail({
      name: client.name ?? client.company ?? 'Klant',
      company: client.company ?? client.name,
      email: mainEmail,
      intakeUrl,
      isExistingUser: alreadyRegistered,
      temporaryPassword: alreadyRegistered ? undefined : temporaryPassword,
    })

    const { error: resendError } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Brand is Code <noreply@brandiscode.com>',
      to: mainEmail,
      subject,
      html,
    })

    if (resendError) {
      return noStore({ error: `Intake-uitnodiging versturen is mislukt: ${resendError.message}` }, 502)
    }

    return noStore({
      invitation_sent: true,
      token,
      url: intakeUrl,
      expires_at: tokenRow.expires_at,
      recipient: mainEmail,
    })
  } catch (error) {
    return noStore(
      { error: `Intake-uitnodiging versturen is mislukt: ${String(error)}` },
      500
    )
  }
}
