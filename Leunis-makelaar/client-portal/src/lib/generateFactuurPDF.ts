import jsPDF from 'jspdf'
import type { Factuur } from './types'

export interface FactuurClientInfo {
  name: string
  company: string | null
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_postal_code: string | null
  billing_city: string | null
  billing_email: string | null
  btw_number: string | null
}

function fmt(value: number) {
  return `EUR ${value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nl-NL')
}

export function generateFactuurPDF(factuur: Factuur, client?: FactuurClientInfo | null): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ── Header bar ────────────────────────────────────────────────
  doc.setFillColor(12, 12, 28)
  doc.rect(0, 0, 210, 38, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(212, 168, 67)
  doc.text('Brand is Code', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 200)
  doc.text('portal.brandiscode.com  •  info@brandiscode.com', 14, 24)
  doc.text('KvK: 93163697  •  BTW: NL866222786B01', 14, 31)

  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FACTUUR', 196, 22, { align: 'right' })

  // ── Invoice meta ──────────────────────────────────────────────
  let y = 52

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 100)
  doc.text('Factuurnummer', 14, y)
  doc.text('Factuurdatum', 14, y + 7)
  doc.text('Vervaldatum', 14, y + 14)
  doc.text('Status', 14, y + 21)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  doc.text(factuur.factuur_nummer, 58, y)
  doc.text(fmtDate(factuur.issue_date), 58, y + 7)
  doc.text(fmtDate(factuur.due_date), 58, y + 14)
  const statusLabel = factuur.status.charAt(0).toUpperCase() + factuur.status.slice(1)
  doc.text(statusLabel, 58, y + 21)

  // ── Client address block ───────────────────────────────────────
  if (client) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 100)
    doc.setFontSize(9)
    doc.text('Aan', 120, y)

    doc.setTextColor(20, 20, 40)
    let cy = y + 7
    if (client.company) {
      doc.setFont('helvetica', 'bold')
      doc.text(client.company, 120, cy)
      cy += 6
      doc.setFont('helvetica', 'normal')
    }
    doc.setFont('helvetica', 'normal')
    doc.text(client.name, 120, cy); cy += 6
    if (client.billing_address_line1) { doc.text(client.billing_address_line1, 120, cy); cy += 6 }
    if (client.billing_address_line2) { doc.text(client.billing_address_line2, 120, cy); cy += 6 }
    const cityLine = [client.billing_postal_code, client.billing_city].filter(Boolean).join('  ')
    if (cityLine) { doc.text(cityLine, 120, cy); cy += 6 }
    if (client.billing_email) { doc.text(client.billing_email, 120, cy); cy += 6 }
    if (client.btw_number) {
      doc.setTextColor(100, 100, 120)
      doc.text(`BTW: ${client.btw_number}`, 120, cy)
    }
  }

  y += 34

  // ── Divider ───────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 235)
  doc.setLineWidth(0.4)
  doc.line(14, y, 196, y)
  y += 10

  // ── Sprint & title ────────────────────────────────────────────
  if (factuur.sprint?.title) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140, 100, 40)
    doc.text(`Sprint ${factuur.sprint.number}: ${factuur.sprint.title}`, 14, y)
    y += 7
  }

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 15, 35)
  doc.text(factuur.title, 14, y)
  y += 8

  if (factuur.description) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 100)
    const lines = doc.splitTextToSize(factuur.description, 172) as string[]
    doc.text(lines, 14, y)
    y += lines.length * 5 + 6
  }

  y += 4

  // ── Amounts table ─────────────────────────────────────────────
  // Table header
  doc.setFillColor(240, 240, 250)
  doc.rect(14, y, 182, 9, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 85)
  doc.text('Omschrijving', 18, y + 6)
  doc.text('Bedrag', 192, y + 6, { align: 'right' })
  y += 9

  // Row: excl BTW
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 40)
  doc.text('Subtotaal excl. BTW', 18, y + 7)
  doc.text(fmt(factuur.amount), 192, y + 7, { align: 'right' })
  doc.setDrawColor(230, 230, 242)
  doc.line(14, y + 9, 196, y + 9)
  y += 9

  // Row: BTW
  doc.text(`BTW ${factuur.btw_percentage}%`, 18, y + 7)
  doc.text(fmt(factuur.btw_amount), 192, y + 7, { align: 'right' })
  y += 9

  // Total row
  doc.setFillColor(12, 12, 28)
  doc.rect(14, y, 182, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(212, 168, 67)
  doc.text('Totaal incl. BTW', 18, y + 8)
  doc.text(fmt(factuur.total_amount), 192, y + 8, { align: 'right' })
  y += 20

  // ── Payment info (only if not paid) ───────────────────────────
  if (factuur.status !== 'betaald') {
    doc.setFillColor(255, 249, 232)
    doc.setDrawColor(212, 168, 67)
    doc.setLineWidth(0.5)
    doc.roundedRect(14, y, 182, 24, 2, 2, 'FD')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 80, 10)
    doc.text('Betaalinformatie', 18, y + 8)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 60, 10)
    doc.text(
      `Gelieve te betalen vóór ${fmtDate(factuur.due_date)} o.v.v. ${factuur.factuur_nummer}`,
      18,
      y + 15,
    )
    doc.text('IBAN: NL91 ABNA 0417 1643 00  •  t.n.v. Brand is Code', 18, y + 21)
    y += 30
  }

  // ── Footer ─────────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 160, 180)
  doc.text(
    'Brand is Code  •  KvK: 93163697  •  BTW: NL866222786B01  •  IBAN: NL91 ABNA 0417 1643 00',
    105,
    287,
    { align: 'center' },
  )

  doc.save(`${factuur.factuur_nummer}.pdf`)
}
