const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portal.brandiscode.com'

function shell({ title, body }) {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          ${body}
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

export function getTeamMemberEmailKind(alreadyRegistered) {
  return alreadyRegistered ? 'existing-user' : 'welcome'
}

export function buildIntakeInvitationEmail({
  name,
  company,
  email,
  intakeUrl,
  isExistingUser,
  temporaryPassword,
}) {
  const subject = isExistingUser
    ? `Je intake-link staat klaar — ${company}`
    : `Welkom bij het Brand is Code portal — ${company}`

  const body = isExistingUser
    ? `
          <p style="margin:0 0 16px;color:#cbd5e1">Hallo ${name},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            Je bent toegevoegd aan het Brand is Code klanten portal van
            <strong style="color:#e2e8f0">${company}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Inloggen en intake</p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>Portaal:</strong> <a href="${BASE_URL}/login" style="color:#f97316;text-decoration:none">${BASE_URL}/login</a></p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>E-mail:</strong> ${email}</p>
              <p style="margin:0;color:#94a3b8;font-size:14px">Wachtwoord vergeten? Stel het opnieuw in via onderstaande knop.</p>
            </td></tr>
          </table>
          <a href="${intakeUrl}" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">
            Open de intake
          </a>
          <a href="${BASE_URL}/login/wachtwoord-vergeten" style="display:inline-block;margin-left:12px;color:#f97316;text-decoration:none;font-weight:600;padding:12px 0;font-size:15px">
            Wachtwoord opnieuw instellen
          </a>
        `
    : `
          <p style="margin:0 0 16px;color:#cbd5e1">Hallo ${name},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            Je nieuwe portal-account voor
            <strong style="color:#e2e8f0">${company}</strong> staat klaar.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Gegevens</p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>Portaal:</strong> <a href="${BASE_URL}/login" style="color:#f97316;text-decoration:none">${BASE_URL}/login</a></p>
              <p style="margin:0 0 4px;color:#e2e8f0"><strong>E-mail:</strong> ${email}</p>
              ${temporaryPassword ? `<p style="margin:0;color:#e2e8f0"><strong>Tijdelijk wachtwoord:</strong> <code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:15px;color:#f97316">${temporaryPassword}</code></p>` : ''}
            </td></tr>
          </table>
          <a href="${intakeUrl}" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">
            Start de intake
          </a>
        `

  return {
    subject,
    html: shell({ title: isExistingUser ? 'Je intake-link staat klaar' : 'Welkom bij het portal', body }),
  }
}

export function buildPortalReadyEmail({
  name,
  company,
  email,
}) {
  return {
    subject: `Je portal-account staat klaar — ${company}`,
    html: shell({
      title: 'Je portal-account staat klaar',
      body: `
        <p style="margin:0 0 16px;color:#cbd5e1">Hallo ${name},</p>
        <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
          Bedankt voor het invullen van de intake. Je kunt nu verder in het Brand is Code klanten portal van
          <strong style="color:#e2e8f0">${company}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:20px 24px">
            <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Inloggen</p>
            <p style="margin:0 0 4px;color:#e2e8f0"><strong>Portaal:</strong> <a href="${BASE_URL}/login" style="color:#f97316;text-decoration:none">${BASE_URL}/login</a></p>
            <p style="margin:0 0 4px;color:#e2e8f0"><strong>E-mail:</strong> ${email}</p>
            <p style="margin:0;color:#94a3b8;font-size:14px">Heb je nog geen wachtwoord ingesteld? Gebruik de knop hieronder om dit te doen.</p>
          </td></tr>
        </table>
        <a href="${BASE_URL}/login/wachtwoord-vergeten" style="display:inline-block;background:#f97316;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:15px">
          Wachtwoord instellen
        </a>
      `,
    }),
  }
}
