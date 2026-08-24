import { jsPDF } from 'jspdf'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OfferteWithSprints } from './types'

/**
 * Generates PDF buffer for an offerte (server-side)
 * Used by API routes and server operations
 */
export async function generateOffertePdfBuffer(
  offerte: OfferteWithSprints
): Promise<Buffer> {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Set colors and styling
  const darkBg = '#0f0f0f'
  const brandGold = '#D4AF37'
  const textWhite = '#ffffff'

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  let yPosition = margin

  // Header section with brand color
  doc.setFillColor(212, 175, 55) // Gold
  doc.rect(0, 0, pageWidth, 30, 'F')

  // Title
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(15, 15, 15) // Dark text on gold background
  doc.text('OFFERTE', margin, 20)

  yPosition = 40

  // Client section
  doc.setFontSize(12)
  doc.setTextColor(212, 175, 55) // Gold
  doc.text('OPDRACHTGEVER', margin, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255) // White
  if (offerte.clients?.name) {
    doc.text(`${offerte.clients.name}`, margin, yPosition)
    yPosition += 6
  }
  if (offerte.clients?.company) {
    doc.text(`${offerte.clients.company}`, margin, yPosition)
    yPosition += 6
  }
  if (offerte.clients?.contact_person) {
    doc.text(`Contactpersoon: ${offerte.clients.contact_person}`, margin, yPosition)
    yPosition += 6
  }
  if (offerte.clients?.email) {
    doc.text(`Email: ${offerte.clients.email}`, margin, yPosition)
    yPosition += 6
  }

  yPosition += 8

  // Offerte details section
  doc.setFontSize(12)
  doc.setTextColor(212, 175, 55) // Gold
  doc.text('OFFERTEDETAILS', margin, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(`Titel: ${offerte.title}`, margin, yPosition)
  yPosition += 6

  const formattedDate = new Date(offerte.created_at).toLocaleDateString('nl-NL')
  doc.text(`Datum: ${formattedDate}`, margin, yPosition)
  yPosition += 6

  doc.text(
    `Bedrag: €${offerte.total_price.toLocaleString('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    margin,
    yPosition
  )
  yPosition += 10

  // Description
  if (offerte.description) {
    doc.setFontSize(12)
    doc.setTextColor(212, 175, 55)
    doc.text('BESCHRIJVING', margin, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    const splitText = doc.splitTextToSize(offerte.description, pageWidth - 2 * margin)
    doc.text(splitText, margin, yPosition)
    yPosition += splitText.length * 5 + 5
  }

  // Sprints section
  if (offerte.sprints && offerte.sprints.length > 0) {
    yPosition += 5
    doc.setFontSize(12)
    doc.setTextColor(212, 175, 55)
    doc.text('SPRINTS', margin, yPosition)
    yPosition += 8

    for (const sprint of offerte.sprints) {
      // Sprint header
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text(`Sprint ${sprint.sprint_number}: ${sprint.title}`, margin, yPosition)
      yPosition += 5

      doc.setFontSize(10)
      doc.setTextColor(200, 200, 200)
      doc.text(
        `Duur: ${sprint.duration_weeks} weken | Status: ${sprint.status}`,
        margin + 5,
        yPosition
      )
      yPosition += 5

      // Deliverables
      if (sprint.deliverables && sprint.deliverables.length > 0) {
        doc.setFontSize(9)
        for (const deliverable of sprint.deliverables) {
          doc.text(`• ${deliverable.title}`, margin + 10, yPosition)
          yPosition += 4
        }
      }

      yPosition += 3
    }
  }

  // Footer
  yPosition = pageHeight - 20
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('Brand is Code © 2026 — Confidentieel', margin, yPosition)
  doc.text(
    `Pagina 1 van 1`,
    pageWidth - margin - 20,
    yPosition
  )

  // Convert to buffer
  const pdfBytes = doc.output('arraybuffer')
  return Buffer.from(pdfBytes)
}

/**
 * Uploads PDF buffer to Supabase Storage
 * Returns the storage path
 */
export async function uploadOffertePdfToStorage(
  pdfBuffer: Buffer,
  offerteId: string,
  adminClient: SupabaseClient
): Promise<string> {
  const bucket = 'signed-offertes'
  const fileName = `offertes/${offerteId}/offerte-${offerteId}.pdf`

  const { data, error } = await adminClient.storage
    .from(bucket)
    .upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload PDF to storage: ${error.message}`)
  }

  return data.path
}

/**
 * Downloads PDF from Supabase Storage
 */
export async function downloadOffertePdfFromStorage(
  offerteId: string,
  adminClient: SupabaseClient
): Promise<Buffer> {
  const bucket = 'signed-offertes'
  const fileName = `offertes/${offerteId}/offerte-${offerteId}.pdf`

  const { data, error } = await adminClient.storage
    .from(bucket)
    .download(fileName)

  if (error) {
    throw new Error(`Failed to download PDF: ${error.message}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Client-side PDF generation (for browser download)
 */
export function generateOffertePdf(
  offerte: OfferteWithSprints,
  downloadFilename?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const brandGold = '#D4AF37'
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  let yPosition = margin

  // Header
  doc.setFillColor(212, 175, 55)
  doc.rect(0, 0, pageWidth, 30, 'F')

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(15, 15, 15)
  doc.text('OFFERTE', margin, 20)

  yPosition = 40

  // Client info
  doc.setFontSize(12)
  doc.setTextColor(212, 175, 55)
  doc.text('OPDRACHTGEVER', margin, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  if (offerte.clients?.name) {
    doc.text(`${offerte.clients.name}`, margin, yPosition)
    yPosition += 6
  }
  if (offerte.clients?.company) {
    doc.text(`${offerte.clients.company}`, margin, yPosition)
    yPosition += 6
  }

  yPosition += 8

  // Offerte details
  doc.setFontSize(12)
  doc.setTextColor(212, 175, 55)
  doc.text('OFFERTEDETAILS', margin, yPosition)
  yPosition += 8

  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  doc.text(`Titel: ${offerte.title}`, margin, yPosition)
  yPosition += 6

  const formattedDate = new Date(offerte.created_at).toLocaleDateString('nl-NL')
  doc.text(`Datum: ${formattedDate}`, margin, yPosition)
  yPosition += 6

  doc.text(
    `Bedrag: €${offerte.total_price.toLocaleString('nl-NL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    margin,
    yPosition
  )

  // Download
  const filename = downloadFilename || `offerte-${offerte.title.slice(0, 20)}.pdf`
  doc.save(filename)
}
