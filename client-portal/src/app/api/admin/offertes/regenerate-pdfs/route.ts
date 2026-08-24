/**
 * API: POST /api/admin/offertes/regenerate-pdfs
 * Regenerates PDFs for all offertes that don't have a pdf_path
 * Accessible to: admin only
 * 
 * This endpoint:
 * 1. Finds all offertes without pdf_path
 * 2. Generates PDF for each
 * 3. Uploads to Supabase Storage
 * 4. Updates the database with the pdf_path
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateOffertePdfBuffer, uploadOffertePdfToStorage } from '@/lib/generateOffertePdf'
import type { OfferteWithSprints } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const results = {
    total: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    // 1. Find all offertes without pdf_path
    console.log('[PDF Regenerate] Starting PDF regeneration for offertes without pdf_path...')
    
    const { data: offertes, error: fetchError } = await admin
      .from('offertes')
      .select('*, clients(name, company, email, contact_person), sprints(*, deliverables(*))')
      .is('pdf_path', null)
      .order('created_at', { ascending: false })

    if (fetchError) {
      const errorMsg = `Failed to fetch offertes: ${fetchError.message}`
      console.error(`[PDF Regenerate] ${errorMsg}`)
      return NextResponse.json(
        { error: errorMsg, results },
        { status: 500 }
      )
    }

    results.total = offertes?.length || 0
    console.log(`[PDF Regenerate] Found ${results.total} offertes without PDF`)

    if (!offertes || offertes.length === 0) {
      return NextResponse.json({
        message: 'No offertes without PDF found',
        results,
      })
    }

    // 2. Process each offerte
    for (const offerte of offertes) {
      try {
        console.log(`[PDF Regenerate] Processing offerte ${offerte.id}: ${offerte.title}`)

        // Generate PDF
        const pdfBuffer = await generateOffertePdfBuffer(offerte as OfferteWithSprints)
        console.log(`[PDF Regenerate] Generated PDF: ${pdfBuffer.length} bytes`)

        // Upload to storage
        const storagePath = await uploadOffertePdfToStorage(pdfBuffer, offerte.id, admin)
        console.log(`[PDF Regenerate] Uploaded to storage: ${storagePath}`)

        // Update database
        const { error: updateError } = await admin
          .from('offertes')
          .update({ pdf_path: storagePath })
          .eq('id', offerte.id)

        if (updateError) {
          throw new Error(`Failed to update pdf_path: ${updateError.message}`)
        }

        console.log(`[PDF Regenerate] Updated offerte ${offerte.id} with pdf_path`)
        results.processed++
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[PDF Regenerate] Error processing ${offerte.id}:`, errorMsg)
        results.errors.push(`Offerte ${offerte.id} (${offerte.title}): ${errorMsg}`)
      }
    }

    console.log(`[PDF Regenerate] Completed: ${results.processed} processed, ${results.failed} failed`)

    return NextResponse.json({
      message: 'PDF regeneration completed',
      results,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PDF Regenerate] Fatal error:', errorMsg)
    return NextResponse.json(
      {
        error: `Fatal error: ${errorMsg}`,
        results,
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for monitoring regeneration progress
 * Returns current status of offertes with/without PDFs
 */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Count offertes with and without PDFs
    const { count: withPdf, error: withError } = await admin
      .from('offertes')
      .select('id', { count: 'exact', head: true })
      .not('pdf_path', 'is', null)

    const { count: withoutPdf, error: withoutError } = await admin
      .from('offertes')
      .select('id', { count: 'exact', head: true })
      .is('pdf_path', null)

    if (withError || withoutError) {
      throw new Error('Failed to fetch statistics')
    }

    return NextResponse.json({
      statistics: {
        total: (withPdf || 0) + (withoutPdf || 0),
        with_pdf: withPdf || 0,
        without_pdf: withoutPdf || 0,
      },
      message: withoutPdf ? `${withoutPdf} offertes need PDF regeneration` : 'All offertes have PDFs',
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
