// /api/admin/ai-billing
// GET: List billing records
// POST: Create billing record
// PATCH: Update billing record

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'mary@brandiscode.com'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const client_id = searchParams.get('client_id')
    const status = searchParams.get('status')

    const supabase = createClient()

    let query = supabase
      .from('ai_billing')
      .select(
        `
        id,
        client_id,
        tool_id,
        access_id,
        billing_period_start,
        billing_period_end,
        monthly_token_limit,
        tokens_used,
        overage_tokens,
        base_price_eur,
        overage_price_per_1k_tokens,
        overage_cost_eur,
        total_cost_eur,
        invoice_number,
        invoice_generated_at,
        invoice_pdf_url,
        invoice_emailed_at,
        payment_status,
        payment_date,
        triggered_by,
        triggered_at,
        created_at
      `
      )

    if (client_id) query = query.eq('client_id', client_id)
    if (status) query = query.eq('payment_status', status)

    const { data: records, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching billing records:', error)
      return NextResponse.json(
        { error: 'Failed to fetch billing records' },
        { status: 500 }
      )
    }

    return NextResponse.json({ records })
  } catch (error: any) {
    console.error('GET /api/admin/ai-billing error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const {
      client_id,
      tool_id,
      access_id,
      billing_period_start,
      billing_period_end,
    } = body

    if (!client_id || !tool_id || !billing_period_start || !billing_period_end) {
      return NextResponse.json(
        {
          error:
            'client_id, tool_id, billing_period_start, billing_period_end are required',
        },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get tokens used for this period using RPC
    const { data: usageResult, error: usageError } = await supabase.rpc(
      'get_tokens_used_this_month',
      {
        p_client_id: client_id,
        p_tool_id: tool_id,
      }
    )

    if (usageError) {
      console.error('Error getting token usage:', usageError)
      return NextResponse.json(
        { error: 'Failed to calculate token usage' },
        { status: 500 }
      )
    }

    const tokens_used = usageResult || 0
    const monthly_token_limit = 500000
    const overage_tokens = Math.max(0, tokens_used - monthly_token_limit)
    const base_price_eur = 49.0
    const overage_price_per_1k_tokens = 0.01
    const overage_cost_eur = (overage_tokens / 1000) * overage_price_per_1k_tokens
    const total_cost_eur = base_price_eur + overage_cost_eur

    // Generate invoice number INV-YYYY-MM-###
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const invoicePrefix = `INV-${year}-${month}-`

    const { data: lastInvoice } = await supabase
      .from('ai_billing')
      .select('invoice_number')
      .like('invoice_number', `${invoicePrefix}%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    let invoiceNumber = `${invoicePrefix}001`
    if (lastInvoice?.invoice_number) {
      const lastNum = parseInt(
        lastInvoice.invoice_number.split('-')[3] || '0',
        10
      )
      invoiceNumber = `${invoicePrefix}${String(lastNum + 1).padStart(3, '0')}`
    }

    // Create billing record
    const { data: billing, error } = await supabase
      .from('ai_billing')
      .insert({
        client_id,
        tool_id,
        access_id: access_id || null,
        billing_period_start,
        billing_period_end,
        monthly_token_limit,
        tokens_used,
        overage_tokens,
        base_price_eur,
        overage_price_per_1k_tokens,
        overage_cost_eur,
        total_cost_eur,
        invoice_number: invoiceNumber,
        payment_status: 'pending',
        triggered_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating billing record:', error)
      return NextResponse.json(
        { error: 'Failed to create billing record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ billing }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/admin/ai-billing error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { billing_id, payment_status, payment_date, admin_notes } = body

    if (!billing_id) {
      return NextResponse.json(
        { error: 'billing_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const updateData: any = {}
    if (payment_status) updateData.payment_status = payment_status
    if (payment_date) updateData.payment_date = payment_date
    if (admin_notes) updateData.admin_notes = admin_notes

    const { data: billing, error } = await supabase
      .from('ai_billing')
      .update(updateData)
      .eq('id', billing_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating billing:', error)
      return NextResponse.json(
        { error: 'Failed to update billing' },
        { status: 500 }
      )
    }

    return NextResponse.json({ billing })
  } catch (error: any) {
    console.error('PATCH /api/admin/ai-billing error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
