import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.EMAIL_FROM ?? 'Brand is Code <noreply@brandiscode.com>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://portal.brandiscode.com'

// Als TEST_EMAIL_OVERRIDE is ingesteld gaan ALLE emails naar dat adres (voor testen)
function resolveRecipient(to: string): string {
  const override = process.env.TEST_EMAIL_OVERRIDE
  if (override) {
    console.warn(`[TEST MODE] Email omgeleid van ${to} naar ${override}`)
    return override
  }
  return to
}

// ── types ─────────────────────────────────────────────────────────────────────

export interface TrainingProposalEmailData {
  to: string
  contactName: string
  companyName: string
  sessionStart: string | null       // ISO datetime
  durationHours: number | null
  locationOrLink: string | null
  agenda: string | null
  confirmToken: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Nader te bepalen'
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}

function buildConfirmUrl(token: string) {
  return `${BASE_URL}/training-bevestiging/${token}`
}

// ── email templates ───────────────────────────────────────────────────────────

function trainingProposalHtml(data: TrainingProposalEmailData): string {
  const confirmUrl = buildConfirmUrl(data.confirmToken)
  const rescheduleUrl = `${confirmUrl}?actie=tegenvoorstel`
  const dateStr = fmtDateTime(data.sessionStart)
  const durationStr = data.durationHours ? `${data.durationHours} uur` : ''
  const locationStr = data.locationOrLink ?? 'Wordt nader bepaald'
  const agendaHtml = data.agenda
    ? data.agenda.split('\n').map(l => `<li style="margin-bottom:4px">${l}</li>`).join('')
    : '<li>Wordt nader bepaald</li>'

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">

        <!-- header -->
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Trainingsvoorstel ontvangen</h1>
        </td></tr>

        <!-- body -->
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;color:#cbd5e1">Hoi ${data.contactName},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            We hebben een trainingsvoorstel voor <strong style="color:#e2e8f0">${data.companyName}</strong> klaarstaan.
            Bekijk de details hieronder en laat ons weten of de datum schikt.
          </p>

          <!-- session card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding:8px 0;vertical-align:top">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Datum & Tijd</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#f97316">${dateStr}</p>
                  </td>
                  ${durationStr ? `<td width="50%" style="padding:8px 0;vertical-align:top">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Duur</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#e2e8f0">${durationStr}</p>
                  </td>` : ''}
                </tr>
                <tr><td colspan="2" style="padding:8px 0">
                  <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.8px;color:#64748b">Locatie / Link</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#e2e8f0">${locationStr}</p>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- agenda -->
          <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:.5px">Agenda</h3>
          <ul style="margin:0 0 28px;padding-left:20px;color:#94a3b8;line-height:1.6;font-size:14px">
            ${agendaHtml}
          </ul>

          <!-- CTA buttons -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:8px">
            <tr>
              <td style="padding-right:12px">
                <a href="${confirmUrl}" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none">
                  ✓ Datum bevestigen
                </a>
              </td>
              <td>
                <a href="${rescheduleUrl}" style="display:inline-block;background:#1e293b;color:#94a3b8;font-weight:600;font-size:14px;padding:14px 24px;border-radius:10px;text-decoration:none;border:1px solid #334155">
                  Tegenvoorstel doen
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:20px 0 0;font-size:12px;color:#475569">
            Je kunt ook inloggen via <a href="${BASE_URL}" style="color:#f97316">${BASE_URL}</a> om de status van je training te bekijken.
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td style="border-top:1px solid #334155;padding:20px 40px">
          <p style="margin:0;font-size:12px;color:#475569">
            Brand is Code · KvK 95423020 · <a href="https://brandiscode.com" style="color:#64748b">brandiscode.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── exported send functions ───────────────────────────────────────────────────

export async function sendTrainingProposalEmail(data: TrainingProposalEmailData) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: [resolveRecipient(data.to)],
    subject: `Trainingsvoorstel ${fmtDateTime(data.sessionStart)} — Brand is Code`,
    html: trainingProposalHtml(data),
  })

  if (error) throw new Error(`Resend fout: ${error.message}`)
}

export async function sendTrainingConfirmedEmail(to: string, contactName: string, sessionStart: string | null) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: [to],
    subject: 'Training bevestigd — Brand is Code',
    html: `<p>Hoi ${contactName},</p>
<p>Bedankt voor je bevestiging! De training op <strong>${fmtDateTime(sessionStart)}</strong> is definitief ingepland.</p>
<p>Tot dan,<br>Brand is Code</p>`,
  })

  if (error) throw new Error(`Resend fout: ${error.message}`)
}

export async function sendRescheduledNotificationEmail(
  adminEmail: string,
  clientName: string,
  proposedDatetime: string
) {
  const { error } = await getResend().emails.send({
    from: FROM,
    to: [adminEmail],
    subject: `Tegenvoorstel training — ${clientName}`,
    html: `<p>${clientName} heeft een tegenvoorstel gedaan voor de training.</p>
<p>Voorgestelde datum: <strong>${fmtDateTime(proposedDatetime)}</strong></p>
<p><a href="${BASE_URL}/admin/training-intakes">Bekijk in het admin-portal</a></p>`,
  })

  if (error) throw new Error(`Resend fout: ${error.message}`)
}

export interface FeedbackRequestEmailData {
  to: string
  contactName: string
  sprintNumber: number
  sprintTitle: string
  feedbackLink: string
}

export async function sendFeedbackRequestEmail(data: FeedbackRequestEmailData) {
  const html = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Sprint ${data.sprintNumber} afgerond 🎉</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 16px;color:#cbd5e1">Beste ${data.contactName},</p>
          <p style="margin:0 0 24px;color:#94a3b8;line-height:1.6">
            Sprint ${data.sprintNumber} <strong style="color:#e2e8f0">"${data.sprintTitle}"</strong> is afgerond. We horen graag wat je ervan vond.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td>
              <a href="${data.feedbackLink}" style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none">
                Geef je beoordeling
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#64748b">Het kost minder dan 2 minuten.</p>
        </td></tr>
        <tr><td style="border-top:1px solid #334155;padding:20px 40px">
          <p style="margin:0;font-size:13px;color:#475569">
            Met vriendelijke groet,<br>
            <strong style="color:#e2e8f0">Mary García</strong> — Brand is Code
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await getResend().emails.send({
    from: FROM,
    to: [resolveRecipient(data.to)],
    subject: `Hoe was Sprint ${data.sprintNumber} — ${data.sprintTitle}?`,
    html,
  })

  if (error) throw new Error(`Resend fout: ${error.message}`)
}

export interface RecurringInvoiceEmailData {
  to: string
  contactName: string
  companyName: string
  factuurNummer: string
  title: string
  issueDate: string
  dueDate: string
  totalAmount: number
}

export async function sendRecurringInvoiceEmail(data: RecurringInvoiceEmailData) {
  const amountText = data.totalAmount.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const html = `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
        <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:32px 40px;border-bottom:1px solid #334155">
          <p style="margin:0;font-size:13px;color:#f97316;font-weight:600;letter-spacing:1px;text-transform:uppercase">Brand is Code</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fff">Nieuwe maandfactuur</h1>
        </td></tr>
        <tr><td style="padding:32px 40px">
          <p style="margin:0 0 12px;color:#cbd5e1">Hoi ${data.contactName},</p>
          <p style="margin:0 0 20px;color:#94a3b8;line-height:1.6">
            Voor <strong style="color:#e2e8f0">${data.companyName}</strong> is de maandfactuur aangemaakt.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border:1px solid #334155;border-radius:12px;margin-bottom:20px">
            <tr><td style="padding:18px 20px">
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8">Factuurnummer: <strong style="color:#fff">${data.factuurNummer}</strong></p>
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8">Omschrijving: <strong style="color:#fff">${data.title}</strong></p>
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8">Factuurdatum: <strong style="color:#fff">${data.issueDate}</strong></p>
              <p style="margin:0 0 6px;font-size:13px;color:#94a3b8">Vervaldatum: <strong style="color:#fff">${data.dueDate}</strong></p>
              <p style="margin:10px 0 0;font-size:16px;color:#f97316;font-weight:700">Totaal incl. BTW: EUR ${amountText}</p>
            </td></tr>
          </table>

          <p style="margin:0;color:#64748b;font-size:12px">
            Je kunt de factuur ook bekijken in het portal: <a href="${BASE_URL}/dashboard/facturen" style="color:#f97316">${BASE_URL}/dashboard/facturen</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const { error } = await getResend().emails.send({
    from: FROM,
    to: [resolveRecipient(data.to)],
    subject: `Factuur ${data.factuurNummer} — Brand is Code`,
    html,
  })

  if (error) throw new Error(`Resend fout: ${error.message}`)
}
