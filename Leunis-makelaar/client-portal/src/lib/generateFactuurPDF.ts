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

// Brand colors (RGB)
const NAVY    = [15,  23,  42]   as const  // #0f172a
const NAVY2   = [27,  42,  74]   as const  // #1B2A4A
const GOLD    = [212, 168, 67]   as const  // #D4A843
const GOLD2   = [240, 215, 140]  as const  // #f0d78c (lighter gold)
const WHITE   = [255, 255, 255]  as const
const LGRAY   = [245, 246, 250]  as const  // light background row
const DGRAY   = [80,  90, 110]   as const  // dark label text
const BODY    = [20,  30,  50]   as const  // body text

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateFactuurPDF(
  factuur: Factuur,
  client?: FactuurClientInfo | null,
): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const margin = 14

  // ── Header: dark navy gradient (two rects) ────────────────────
  doc.setFillColor(...NAVY2)
  doc.rect(0, 0, W, 44, 'F')
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 22, 'F')

  // Gold accent line at bottom of header
  doc.setFillColor(...GOLD)
  doc.rect(0, 44, W, 1.5, 'F')

  // Logo (if loaded)
  if (logoDataUrl) {
    // Logo aspect ratio: 1252/888 ≈ 1.41 → 50mm wide = 35.5mm tall
    doc.addImage(logoDataUrl, 'PNG', margin, 4, 50, 35.5)
  } else {
    // Fallback text logo
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GOLD)
    doc.text('Brand is Code', margin, 18)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 190, 210)
    doc.text('portal.brandiscode.com', margin, 26)
  }

  // "FACTUUR" label — right side header
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD)
  doc.text('FACTUUR', W - margin, 22, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD2)
  doc.text(factuur.factuur_nummer, W - margin, 32, { align: 'right' })

  // ── Invoice meta block ────────────────────────────────────────
  let y = 56
  const col1x = margin
  const col1vx = 58
  const col2x = 115
  const col2vx = 155

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DGRAY)
  doc.text('Factuurnummer', col1x, y)
  doc.text('Factuurdatum',  col1x, y + 7)
  doc.text('Vervaldatum',   col1x, y + 14)
  doc.text('Status',        col1x, y + 21)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BODY)
  doc.text(factuur.factuur_nummer,                                  col1vx, y)
  doc.text(fmtDate(factuur.issue_date),                             col1vx, y + 7)
  doc.text(fmtDate(factuur.due_date),                               col1vx, y + 14)
  doc.text(factuur.status.charAt(0).toUpperCase() + factuur.status.slice(1), col1vx, y + 21)

  // Client address (right column)
  if (client) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DGRAY)
    doc.text('Aan', col2x, y)

    doc.setTextColor(...BODY)
    let cy = y + 7

    if (client.company) {
      doc.setFont('helvetica', 'bold')
      doc.text(client.company, col2x, cy); cy += 6
    }
    doc.setFont('helvetica', 'normal')
    doc.text(client.name, col2x, cy); cy += 6
    if (client.billing_address_line1)  { doc.text(client.billing_address_line1, col2x, cy); cy += 6 }
    if (client.billing_address_line2)  { doc.text(client.billing_address_line2, col2x, cy); cy += 6 }
    const cityLine = [client.billing_postal_code, client.billing_city].filter(Boolean).join('  ')
    if (cityLine) { doc.text(cityLine, col2x, cy); cy += 6 }
    if (client.billing_email) {
      doc.setTextColor(...DGRAY)
      doc.text(client.billing_email, col2x, cy); cy += 6
    }
    if (client.btw_number) {
      doc.setTextColor(130, 140, 160)
      doc.text(`BTW: ${client.btw_number}`, col2x, cy)
    }
  }

  y += 33

  // ── Van (Brand is Code) block ─────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.roundedRect(col2x - 2, y - 12, W - col2x + 2 - margin + 2, 28, 2, 2, 'F')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DGRAY)
  doc.text('Van', col2x, y - 5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BODY)
  doc.text('Brand is Code', col2x, y + 2)
  doc.setTextColor(130, 140, 160)
  doc.text('KvK: 93163697  •  BTW: NL866222786B01', col2x, y + 8)
  doc.text('info@brandiscode.com  •  portal.brandiscode.com', col2x, y + 14)

  y += 20

  // ── Gold divider ──────────────────────────────────────────────
  doc.setFillColor(...GOLD)
  doc.rect(margin, y, W - margin * 2, 0.6, 'F')
  y += 8

  // ── Sprint & title ────────────────────────────────────────────
  if (factuur.sprint?.title) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GOLD)
    doc.text(`Sprint ${factuur.sprint.number}: ${factuur.sprint.title}`, margin, y)
    y += 7
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BODY)
  doc.text(factuur.title, margin, y)
  y += 8

  if (factuur.description) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DGRAY)
    const lines = doc.splitTextToSize(factuur.description, W - margin * 2) as string[]
    doc.text(lines, margin, y)
    y += lines.length * 5 + 5
  }

  y += 4

  // ── Amounts table ─────────────────────────────────────────────
  // Table header (navy)
  doc.setFillColor(...NAVY2)
  doc.rect(margin, y, W - margin * 2, 10, 'F')
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD)
  doc.text('Omschrijving', margin + 4, y + 7)
  doc.text('Bedrag', W - margin, y + 7, { align: 'right' })
  y += 10

  // Row: excl BTW
  doc.setFillColor(...LGRAY)
  doc.rect(margin, y, W - margin * 2, 9, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BODY)
  doc.text('Subtotaal excl. BTW', margin + 4, y + 6.5)
  doc.text(fmt(factuur.amount), W - margin, y + 6.5, { align: 'right' })
  y += 9

  // Row: BTW
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BODY)
  doc.text(`BTW ${factuur.btw_percentage}%`, margin + 4, y + 6.5)
  doc.text(fmt(factuur.btw_amount), W - margin, y + 6.5, { align: 'right' })
  doc.setDrawColor(220, 225, 235)
  doc.setLineWidth(0.3)
  doc.line(margin, y + 9, W - margin, y + 9)
  y += 9

  // Total row (navy + gold text)
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, W - margin * 2, 13, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text('Totaal incl. BTW', margin + 4, y + 9)
  doc.text(fmt(factuur.total_amount), W - margin, y + 9, { align: 'right' })
  y += 20

  // ── Payment info box ──────────────────────────────────────────
  if (factuur.status !== 'betaald') {
    // Gold left border bar
    doc.setFillColor(...GOLD)
    doc.rect(margin, y, 2, 26, 'F')

    // Light background
    doc.setFillColor(252, 248, 235)
    doc.rect(margin + 2, y, W - margin * 2 - 2, 26, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 75, 15)
    doc.text('Betaalinformatie', margin + 6, y + 8)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 65, 20)
    doc.text(
      `Gelieve te betalen vóór ${fmtDate(factuur.due_date)} o.v.v. ${factuur.factuur_nummer}`,
      margin + 6,
      y + 16,
    )
    doc.text(
      'IBAN: NL91 ABNA 0417 1643 00  •  t.n.v. Brand is Code',
      margin + 6,
      y + 22,
    )
    y += 32
  }

  // ── Footer ─────────────────────────────────────────────────────
  // Dark footer bar
  doc.setFillColor(...NAVY2)
  doc.rect(0, 282, W, 15, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 282, W, 0.8, 'F')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 175, 200)
  doc.text(
    'Brand is Code  •  KvK: 93163697  •  BTW: NL866222786B01  •  IBAN: NL91 ABNA 0417 1643 00',
    W / 2,
    289,
    { align: 'center' },
  )
  doc.setTextColor(...GOLD2)
  doc.text('portal.brandiscode.com', W / 2, 294, { align: 'center' })

  doc.save(`${factuur.factuur_nummer}.pdf`)
}

