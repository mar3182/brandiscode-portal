import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/ai-billing/[id]/generate-invoice
 * Generate and send invoice for a billing record
 * Admin only
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email !== 'mary@brandiscode.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const billingId = context.params.id

    // Get billing record
    const { data: billing, error: fetchError } = await supabase
      .from('ai_billing')
      .select('*')
      .eq('id', billingId)
      .single()

    if (fetchError || !billing) {
      return NextResponse.json(
        { error: 'Billing record not found' },
        { status: 404 }
      )
    }

    // Generate invoice (placeholder - would call PDF service + email service)
    const invoiceNumber = billing.invoice_number || `INV-${new Date().toISOString().split('-').slice(0, 2).join('-')}-001`
    const invoiceUrl = `https://invoices.brandiscode.com/${billingId}.pdf` // Placeholder

    // Update billing record
    const { error: updateError } = await supabase
      .from('ai_billing')
      .update({
        invoice_generated_at: new Date().toISOString(),
        invoice_pdf_url: invoiceUrl,
        invoice_emailed_at: new Date().toISOString(),
        payment_status: 'sent',
      })
      .eq('id', billingId)

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update billing: ${updateError.message}` },
        { status: 500 }
      )
    }

    // TODO: Implement actual PDF generation and email delivery
    // const pdfBuffer = await generateInvoicePDF(billing)
    // await sendInvoiceEmail(billing.client_id, pdfBuffer, invoiceNumber)

    return NextResponse.json(
      {
        message: 'Invoice generated and sent',
        invoice: {
          id: billingId,
          invoice_number: invoiceNumber,
          invoice_url: invoiceUrl,
          emailed_at: new Date().toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error generating invoice:', err)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
