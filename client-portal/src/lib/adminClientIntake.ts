export type IntakeActionTone = 'success' | 'warning' | 'error'

export type IntakeLinkResult = {
  url?: string
  warnings?: string[]
  error?: string
}

export type IntakeInviteResult = {
  invitationSent?: boolean
  warnings?: string[]
  error?: string
}

export async function createIntakeToken(clientId: string): Promise<IntakeLinkResult> {
  const res = await fetch(`/api/admin/clients/${clientId}/intake-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    return { error: err.error || 'Intake link aanmaken is mislukt' }
  }

  const data = await res.json().catch(() => ({})) as { url?: string; warnings?: string[] }
  return {
    url: typeof data.url === 'string' ? data.url : '',
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  }
}

export async function sendIntakeInvitation(clientId: string): Promise<IntakeInviteResult> {
  const tokenRes = await fetch(`/api/admin/clients/${clientId}/intake-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({})) as { error?: string }
    return { error: err.error || 'Intake versturen is mislukt' }
  }

  const tokenData = await tokenRes.json().catch(() => ({})) as {
    token?: string
    url?: string
    warnings?: string[]
  }

  if (!tokenData.token || !tokenData.url) {
    return {
      error: 'Intake-token aanmaken is mislukt: onvolledige response.',
      warnings: Array.isArray(tokenData.warnings) ? tokenData.warnings : [],
    }
  }

  const inviteRes = await fetch(`/api/admin/clients/${clientId}/intake-token/send-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenData.token, url: tokenData.url }),
  })

  const inviteData = await inviteRes.json().catch(() => ({})) as {
    invitation_sent?: boolean
    warnings?: string[]
    error?: string
  }

  return {
    invitationSent: inviteRes.ok && Boolean(inviteData.invitation_sent),
    warnings: [
      ...(Array.isArray(tokenData.warnings) ? tokenData.warnings : []),
      ...(Array.isArray(inviteData.warnings) ? inviteData.warnings : []),
      ...(inviteData.error ? [inviteData.error] : []),
    ],
    error: inviteRes.ok ? undefined : (inviteData.error || 'Intake-uitnodiging kon niet worden verstuurd.'),
  }
}
