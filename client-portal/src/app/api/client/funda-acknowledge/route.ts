// /api/client/funda-acknowledge
// POST: Client acknowledges cost agreement before first use
// Idempotent: if already acknowledged, return success without duplicate

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveClientId } from '@/lib/ai-usage'
import { getToolAccessOrThrow } from '@/lib/ai-tool-access'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mary@brandiscode.com'
const ACKNOWLEDGEMENT_TEXT =
  'Ik begrijp dat het genereren van woningbeschrijvingen via de AI-tools kosten veroorzaakt bij Brand is Code. ' +
  'De basisprijs is €49,00 per maand per tool, met een extra kosten van €0,01 per 1.000 tokens boven de 500.000 tokens per maand. ' +
  'Ik ga akkoord met deze voorwaarden.'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  if (user.email === ADMIN_EMAIL) {
    return NextResponse.json({ acknowledged: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  const access = await getToolAccessOrThrow(clientId, 'funda-tekst')
  if (!access.allowed || !access.toolId) {
    return NextResponse.json({ acknowledged: false, error: access.error }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  const admin = createAdminClient()
  const { data: consent, error } = await admin
    .from('ai_billing_consent')
    .select('id')
    .eq('client_id', clientId)
    .eq('tool_id', access.toolId)
    .maybeSingle()

  if (error) {
    console.error('GET /api/client/funda-acknowledge error:', error.message)
    return NextResponse.json({ error: 'Het kostenakkoord kon niet worden gecontroleerd' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({ acknowledged: Boolean(consent?.id) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json(
      { error: 'Niet ingelogd' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Admin check
  if (user.email === ADMIN_EMAIL) {
    return NextResponse.json(
      { acknowledged: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return NextResponse.json(
      { error: 'Klant niet gevonden' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const body = await req.json().catch(() => ({})) as { tool_slug?: string }
    const toolSlug = body.tool_slug || 'funda-tekst'

    // Validate tool access
    const access = await getToolAccessOrThrow(clientId, toolSlug)
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Je hebt nog geen toegang tot deze AI-tool.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (!access.toolId) {
      return NextResponse.json(
        { error: 'Tool niet gevonden' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const admin = createAdminClient()

    // Idempotent check: already acknowledged?
    const { data: existing } = await admin
      .from('ai_billing_consent')
      .select('id')
      .eq('client_id', clientId)
      .eq('tool_id', access.toolId)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json(
        { acknowledged: true, message: 'Je hebt dit akkoord al eerder afgegeven.' },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Store acknowledgement
    const { error } = await admin.from('ai_billing_consent').insert({
      client_id: clientId,
      tool_id: access.toolId,
      user_id: user.id,
      acknowledgement_text: ACKNOWLEDGEMENT_TEXT,
    })

    if (error) {
      console.error('Error storing billing consent:', error.message)
      return NextResponse.json(
        { error: 'Het opslaan van het akkoord is mislukt' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { acknowledged: true, message: 'Je hebt het kostenakkoord succesvol afgegeven.' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('POST /api/client/funda-acknowledge error:', message)
    return NextResponse.json(
      { error: 'Interne serverfout' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
