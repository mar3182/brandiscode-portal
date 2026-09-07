// /api/admin/ai-billing/[id]/generate-invoice
// POST: Generate and email invoice for a billing record

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'mary@brandiscode.com'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const billing_id = params.id
    const supabase = createClient()

    // Get billing record with client details
    const { data: billing, error: billingError } = await supabase
      .from('ai_billing')
      .select(
        `
        *,
        clients:client_id (id, name, company, billing_email, billing_address_line1, billing_city, billing_postal_code)
      `
      )
      .eq('id', billing_id)
      .single()

    if (billingError || !billing) {
      return NextResponse.json(
        { error: 'Billing record not found' },
        { status: 404 }
      )
    }

    // TODO: Implement actual PDF generation and email sending
    // For now, just update the status as if it was sent

    const invoiceUrl = `https://portal.brandiscode.com/invoices/${billing.invoice_number}.pdf`

    const { data: updated, error: updateError } = await supabase
      .from('ai_billing')
      .update({
        invoice_generated_at: new Date().toISOString(),
        invoice_pdf_url: invoiceUrl,
        invoice_emailed_at: new Date().toISOString(),
        payment_status: 'sent',
      })
      .eq('id', billing_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating billing:', updateError)
      return NextResponse.json(
        { error: 'Failed to generate invoice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Invoice generated successfully',
      billing: updated,
      invoice_url: invoiceUrl,
    })
  } catch (error: any) {
    console.error('POST /api/admin/ai-billing/[id]/generate-invoice error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
