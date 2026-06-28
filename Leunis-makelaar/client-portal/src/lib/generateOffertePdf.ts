import jsPDF from 'jspdf'
import type { OfferteWithSprints } from './types'

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

export async function generateOffertePdf(offerte: OfferteWithSprints, signatureDataUrl?: string) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Colors
  const gold: [number, number, number] = [212, 168, 67] // #D4A843
  const dark: [number, number, number] = [15, 15, 20] // brand-dark
  const gray: [number, number, number] = [120, 120, 130]
  const white: [number, number, number] = [255, 255, 255]

  // Background
  doc.setFillColor(...dark)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')

  // === HEADER ===
  // Load and add logo
  try {
    const logoDataUrl = await loadImage('/logo.png')
    // Logo aspect ratio is ~1252:888 ≈ 1.41:1
    const logoW = 45
    const logoH = logoW / 1.41
    doc.addImage(logoDataUrl, 'PNG', margin, y - 4, logoW, logoH)
  } catch {
    // Fallback: text if logo fails to load
    doc.setFontSize(24)
    doc.setTextColor(...gold)
    doc.setFont('helvetica', 'bold')
    doc.text('Brand is Code', margin, y + 8)
  }

  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.text('info@brandiscode.com', pageWidth - margin, y + 4, { align: 'right' })
  doc.text('brandiscode.com', pageWidth - margin, y + 9, { align: 'right' })

  y += 18

  // Gold line
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 12

  // === OFFERTE TITLE ===
  doc.setFontSize(18)
  doc.setTextColor(...white)
  doc.setFont('helvetica', 'bold')
  doc.text('Offerte', margin, y)
  y += 10

  doc.setFontSize(14)
  doc.text(offerte.title, margin, y)
  y += 8

  if (offerte.description) {
    doc.setFontSize(10)
    doc.setTextColor(...gray)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(offerte.description, contentWidth)
    doc.text(descLines, margin, y)
    y += descLines.length * 5 + 4
  }

  // === META INFO ===
  y += 4
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  const createdDate = new Date(offerte.created_at).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  doc.text(`Datum: ${createdDate}`, margin, y)
  
  doc.setTextColor(...gold)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(`€${offerte.total_amount.toLocaleString('nl-NL')}`, pageWidth - margin, y, { align: 'right' })
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.text('excl. BTW', pageWidth - margin, y + 5, { align: 'right' })

  y += 14

  // === SPRINTS ===
  if (offerte.sprints.length > 0) {
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(12)
    doc.setTextColor(...white)
    doc.setFont('helvetica', 'bold')
    doc.text('Sprint overzicht', margin, y)
    y += 8

    for (const sprint of offerte.sprints) {
      // Check page break
      if (y > 250) {
        doc.addPage()
        doc.setFillColor(...dark)
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')
        y = margin
      }

      // Sprint header
      doc.setFillColor(255, 255, 255)
      doc.setGState(doc.GState({ opacity: 0.05 }))
      const sprintHeight = 10 + (sprint.deliverables?.length || 0) * 6 + 4
      doc.roundedRect(margin, y - 4, contentWidth, sprintHeight, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))

      // Sprint number badge
      doc.setFontSize(9)
      doc.setTextColor(...gold)
      doc.setFont('helvetica', 'bold')
      doc.text(`Sprint ${sprint.number}`, margin + 4, y + 2)

      // Sprint title
      doc.setTextColor(...white)
      doc.setFontSize(10)
      doc.text(sprint.title, margin + 30, y + 2)

      // Sprint amount
      doc.setTextColor(...gray)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`€${sprint.amount.toLocaleString('nl-NL')}`, pageWidth - margin - 4, y + 2, { align: 'right' })

      y += 8

      // Deliverables
      if (sprint.deliverables && sprint.deliverables.length > 0) {
        for (const d of sprint.deliverables) {
          doc.setFontSize(8)
          doc.setTextColor(...gray)
          doc.text(`•  ${d.title}`, margin + 30, y + 2)
          y += 5
        }
      }

      y += 6
    }

    // Total
    y += 2
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 7

    doc.setFontSize(11)
    doc.setTextColor(...white)
    doc.setFont('helvetica', 'bold')
    doc.text('Totaal', margin, y)
    doc.setTextColor(...gold)
    doc.text(`€${offerte.total_amount.toLocaleString('nl-NL')}`, pageWidth - margin - 4, y, { align: 'right' })
    doc.setFontSize(8)
    doc.setTextColor(...gray)
    doc.setFont('helvetica', 'normal')
    doc.text('excl. BTW', pageWidth - margin - 4, y + 5, { align: 'right' })

    y += 16
  }

  // === SIGNATURE SECTION ===
  const sigData = signatureDataUrl || offerte.signature_data
  const signedAt = offerte.signed_at

  if (sigData && signedAt) {
    // Check page break
    if (y > 220) {
      doc.addPage()
      doc.setFillColor(...dark)
      doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')
      y = margin
    }

    doc.setDrawColor(...gold)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    doc.setFontSize(12)
    doc.setTextColor(...white)
    doc.setFont('helvetica', 'bold')
    doc.text('Akkoord & Handtekening', margin, y)
    y += 8

    doc.setFontSize(9)
    doc.setTextColor(...gray)
    doc.setFont('helvetica', 'normal')
    const signedDate = new Date(signedAt).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
    doc.text(`Akkoord op: ${signedDate}`, margin, y)
    y += 8

    // Signature image
    try {
      doc.addImage(sigData, 'PNG', margin, y, 60, 25)
      y += 30
    } catch {
      // If image fails, just note it
      doc.text('(handtekening opgenomen)', margin, y)
      y += 6
    }

    // Signature line
    doc.setDrawColor(...gray)
    doc.setLineWidth(0.2)
    doc.line(margin, y, margin + 60, y)
    y += 5
    doc.setFontSize(8)
    doc.text('Handtekening opdrachtgever', margin, y)
  }

  // === FOOTER ===
  const footerY = doc.internal.pageSize.getHeight() - 12
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text('Brand is Code  •  Hofstede 11, 4691DH Tholen  •  info@brandiscode.com', pageWidth / 2, footerY, { align: 'center' })
  doc.text('Dit document is digitaal ondertekend en heeft dezelfde juridische waarde als een handgeschreven handtekening.', pageWidth / 2, footerY + 4, { align: 'center' })

  return doc
}

export async function downloadOffertePdf(offerte: OfferteWithSprints, signatureDataUrl?: string) {
  const doc = await generateOffertePdf(offerte, signatureDataUrl)
  const filename = `offerte-${offerte.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
  doc.save(filename)
}
