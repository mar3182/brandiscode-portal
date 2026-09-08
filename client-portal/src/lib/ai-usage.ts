/**
 * AI usage tracking & fair-use enforcement
 *
 * De portal is een bèta-ontwikkeltool. Elke client heeft een maandlimiet
 * (fair_use_limit) ingesteld via het admin panel. Bij het bereiken van de
 * limiet wordt de klant doorverwezen naar hun eigen Microsoft-omgeving.
 *
 * Gerelateerde tabellen: client_ai_settings, ai_usage_events
 */
import { createAdminClient } from '@/lib/supabase/admin'

export async function ensureAiBillingDraft(params: {
  clientId: string
  toolId: string
  accessId: string | null
  monthlyTokenLimit: number | null
  userId: string
}): Promise<void> {
  const admin = createAdminClient()
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const billingPeriodStart = periodStart.toISOString().slice(0, 10)
  const billingPeriodEnd = periodEnd.toISOString().slice(0, 10)

  const { data: existing } = await admin
    .from('ai_billing')
    .select('id')
    .eq('client_id', params.clientId)
    .eq('tool_id', params.toolId)
    .eq('billing_period_start', billingPeriodStart)
    .maybeSingle()

  if (existing?.id) return

  const { error } = await admin.from('ai_billing').insert({
    client_id: params.clientId,
    tool_id: params.toolId,
    access_id: params.accessId,
    billing_period_start: billingPeriodStart,
    billing_period_end: billingPeriodEnd,
    monthly_token_limit: params.monthlyTokenLimit ?? 500000,
    tokens_used: 0,
    overage_tokens: 0,
    base_price_eur: 49,
    overage_price_per_1k_tokens: 0.01,
    overage_cost_eur: 0,
    total_cost_eur: 49,
    payment_status: 'pending',
    triggered_by: params.userId,
    triggered_at: now.toISOString(),
  })

  if (error && error.code !== '23505') {
    console.warn('ai_billing draft aanmaken mislukt:', error.message)
  }
}

export interface UsageStatus {
  allowed: boolean
  clientId: string
  usedThisMonth: number
  limit: number | null
  /** 0-100, null als er geen limiet is */
  percentUsed: number | null
}

export async function checkAiToolLimit(
  clientId: string,
  toolId: string,
  monthlyTokenLimit: number | null
): Promise<UsageStatus> {
  const admin = createAdminClient()
  const limit = monthlyTokenLimit && monthlyTokenLimit > 0 ? monthlyTokenLimit : null
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const usageDate = startOfMonth.toISOString().slice(0, 10)

  const { data: usageRows, error } = await admin
    .from('ai_usage_daily')
    .select('tokens_used')
    .eq('client_id', clientId)
    .eq('tool_id', toolId)
    .gte('usage_date', usageDate)

  if (error) {
    console.error('ai_usage_daily lookup failed:', error.message)
    return { allowed: false, clientId, usedThisMonth: 0, limit, percentUsed: null }
  }

  const usedThisMonth = (usageRows ?? []).reduce((total, row) => total + (row.tokens_used ?? 0), 0)
  const percentUsed = limit ? Math.round((usedThisMonth / limit) * 100) : null

  return {
    allowed: !limit || usedThisMonth < limit,
    clientId,
    usedThisMonth,
    limit,
    percentUsed,
  }
}

/** Zoek de client_id op voor een ingelogd emailadres */
export async function resolveClientId(email: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', email)
    .maybeSingle()
  return data?.client_id ?? null
}

/**
 * Controleer of de client nog AI-generaties over heeft deze maand.
 * Valt terug op "toegestaan" als de tabel nog niet bestaat (graceful degradation).
 */
export async function checkAiLimit(clientId: string): Promise<UsageStatus> {
  const admin = createAdminClient()

  const { data: settings, error: settingsError } = await admin
    .from('client_ai_settings')
    .select('fair_use_limit')
    .eq('client_id', clientId)
    .maybeSingle()

  // Tabel bestaat nog niet (migratie niet uitgevoerd) → sta toe, geen blokkade
  if (settingsError) {
    console.warn('client_ai_settings niet beschikbaar:', settingsError.message)
    return { allowed: true, clientId, usedThisMonth: 0, limit: null, percentUsed: null }
  }

  const limit: number | null = settings?.fair_use_limit ?? null

  // Geen limiet ingesteld → onbeperkt
  if (!limit) {
    return { allowed: true, clientId, usedThisMonth: 0, limit: null, percentUsed: null }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count } = await admin
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('request_status', 'success')
    .eq('is_admin_test', false)
    .gte('created_at', startOfMonth.toISOString())

  const usedThisMonth = count ?? 0
  const percentUsed = Math.round((usedThisMonth / limit) * 100)

  return {
    allowed: usedThisMonth < limit,
    clientId,
    usedThisMonth,
    limit,
    percentUsed,
  }
}

/** Log een AI-aanvraag na afloop (success of error) */
export async function logAiUsage(params: {
  clientId: string
  toolName: string
  provider: string
  model: string
  inputTokens?: number
  outputTokens?: number
  estimatedCost?: number
  status: 'success' | 'error'
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('ai_usage_events').insert({
    client_id: params.clientId,
    tool_name: params.toolName,
    provider: params.provider,
    model: params.model,
    mode: 'managed',
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    estimated_cost: params.estimatedCost ?? null,
    request_status: params.status,
  })
  if (error) {
    // Niet-kritisch: log maar blokkeer de response niet
    console.warn('ai_usage_events insert mislukt:', error.message)
  }

  const { data: tool } = await admin
    .from('ai_tools')
    .select('id')
    .eq('slug', params.toolName)
    .maybeSingle()

  const tokensUsed = (params.inputTokens ?? 0) + (params.outputTokens ?? 0)
  if (!tool?.id || params.status !== 'success' || tokensUsed <= 0) return

  const usageDate = new Date().toISOString().slice(0, 10)
  const { data: existing } = await admin
    .from('ai_usage_daily')
    .select('id, tokens_used, request_count')
    .eq('client_id', params.clientId)
    .eq('tool_id', tool.id)
    .eq('usage_date', usageDate)
    .maybeSingle()

  const dailyPayload = {
    client_id: params.clientId,
    tool_id: tool.id,
    usage_date: usageDate,
    tokens_used: (existing?.tokens_used ?? 0) + tokensUsed,
    request_count: (existing?.request_count ?? 0) + 1,
  }

  const { error: dailyError } = existing?.id
    ? await admin.from('ai_usage_daily').update(dailyPayload).eq('id', existing.id)
    : await admin.from('ai_usage_daily').insert(dailyPayload)

  if (dailyError) console.warn('ai_usage_daily insert mislukt:', dailyError.message)
}

/** Nederlandse foutmelding bij het bereiken van de maandlimiet */
export function limitReachedMessage(used: number, limit: number): string {
  return (
    `Je hebt je limiet van ${limit} generaties voor deze maand bereikt (${used}/${limit}). ` +
    `De portal is een ontwikkeltool — zodra de Microsoft Copilot-inrichting klaar is, ` +
    `genereer je woningbeschrijvingen rechtstreeks vanuit jouw eigen Microsoft-omgeving. ` +
    `Neem contact op met Brand is Code om je limiet te verhogen of eerder te starten.`
  )
}
