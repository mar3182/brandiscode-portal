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

export interface UsageStatus {
  allowed: boolean
  clientId: string
  usedThisMonth: number
  limit: number | null
  /** 0-100, null als er geen limiet is */
  percentUsed: number | null
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
