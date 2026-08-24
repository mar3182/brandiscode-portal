import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { AiMode, AiProvider, ClientAiSettings, ClientAiSettingsUpsert } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const
const AI_MODES: readonly AiMode[] = ['byok', 'managed', 'hybrid']
const AI_PROVIDERS: readonly AiProvider[] = ['openai', 'azure-openai', 'anthropic', 'github-models']

type SanitizedClientAiSettings = {
  id: string | null
  client_id: string
  ai_mode: ClientAiSettings['ai_mode']
  provider: ClientAiSettings['provider']
  listing_generation_model: string | null
  listing_refinement_model: string | null
  social_generation_model: string | null
  brochure_generation_model: string | null
  managed_bundle: string | null
  fair_use_limit: number | null
  warning_threshold: number
  api_key_last4: string | null
  key_status: ClientAiSettings['key_status']
  updated_by: string | null
  created_at: string | null
  updated_at: string | null
}

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isAiMode(value: unknown): value is AiMode {
  return typeof value === 'string' && AI_MODES.includes(value as AiMode)
}

function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && AI_PROVIDERS.includes(value as AiProvider)
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function sanitizeSettings(row: ClientAiSettings): SanitizedClientAiSettings {
  return {
    id: row.id,
    client_id: row.client_id,
    ai_mode: row.ai_mode,
    provider: row.provider,
    listing_generation_model: row.listing_generation_model,
    listing_refinement_model: row.listing_refinement_model,
    social_generation_model: row.social_generation_model,
    brochure_generation_model: row.brochure_generation_model,
    managed_bundle: row.managed_bundle,
    fair_use_limit: row.fair_use_limit,
    warning_threshold: row.warning_threshold,
    api_key_last4: row.api_key_last4,
    key_status: row.key_status,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function defaultSettings(clientId: string): SanitizedClientAiSettings {
  return {
    id: null,
    client_id: clientId,
    ai_mode: 'managed',
    provider: 'openai',
    listing_generation_model: null,
    listing_refinement_model: null,
    social_generation_model: null,
    brochure_generation_model: null,
    managed_bundle: null,
    fair_use_limit: null,
    warning_threshold: 80,
    api_key_last4: null,
    key_status: 'unknown',
    updated_by: null,
    created_at: null,
    updated_at: null,
  }
}

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const { data, error } = await admin
    .from('client_ai_settings')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) return noStore({ error: error.message }, 500)

  if (!data) {
    return noStore({ settings: defaultSettings(clientId) })
  }

  return noStore({ settings: sanitizeSettings(data as ClientAiSettings) })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const clientId = params.id
  const admin = createAdminClient()

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return noStore({ error: clientError.message }, 500)
  if (!client) return noStore({ error: 'Klant niet gevonden' }, 404)

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const { data: existingData, error: existingError } = await admin
    .from('client_ai_settings')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (existingError) return noStore({ error: existingError.message }, 500)

  const existing = (existingData as ClientAiSettings | null) ?? null

  let aiMode: AiMode = existing?.ai_mode ?? 'managed'
  if (hasOwn(body, 'ai_mode')) {
    if (!isAiMode(body.ai_mode)) {
      return noStore({ error: 'ai_mode moet byok, managed of hybrid zijn' }, 400)
    }
    aiMode = body.ai_mode
  }

  let provider: AiProvider = existing?.provider ?? 'openai'
  if (hasOwn(body, 'provider')) {
    if (!isAiProvider(body.provider)) {
      return noStore({ error: 'provider moet openai, azure-openai, anthropic of github-models zijn' }, 400)
    }
    provider = body.provider
  }

  let warningThreshold = existing?.warning_threshold ?? 80
  if (hasOwn(body, 'warning_threshold')) {
    if (typeof body.warning_threshold !== 'number' || !Number.isInteger(body.warning_threshold)) {
      return noStore({ error: 'warning_threshold moet een geheel getal zijn' }, 400)
    }
    if (body.warning_threshold < 50 || body.warning_threshold > 99) {
      return noStore({ error: 'warning_threshold moet tussen 50 en 99 liggen' }, 400)
    }
    warningThreshold = body.warning_threshold
  }

  let fairUseLimit: number | null = existing?.fair_use_limit ?? null
  if (hasOwn(body, 'fair_use_limit')) {
    if (body.fair_use_limit === null) {
      fairUseLimit = null
    } else if (typeof body.fair_use_limit !== 'number' || !Number.isInteger(body.fair_use_limit)) {
      return noStore({ error: 'fair_use_limit moet een geheel getal zijn of null' }, 400)
    } else if (body.fair_use_limit <= 0) {
      return noStore({ error: 'fair_use_limit moet groter dan 0 zijn' }, 400)
    } else {
      fairUseLimit = body.fair_use_limit
    }
  }

  const listingGenerationModel = hasOwn(body, 'listing_generation_model')
    ? normalizeOptionalString(body.listing_generation_model)
    : existing?.listing_generation_model ?? null

  const listingRefinementModel = hasOwn(body, 'listing_refinement_model')
    ? normalizeOptionalString(body.listing_refinement_model)
    : existing?.listing_refinement_model ?? null

  const socialGenerationModel = hasOwn(body, 'social_generation_model')
    ? normalizeOptionalString(body.social_generation_model)
    : existing?.social_generation_model ?? null

  const brochureGenerationModel = hasOwn(body, 'brochure_generation_model')
    ? normalizeOptionalString(body.brochure_generation_model)
    : existing?.brochure_generation_model ?? null

  const managedBundle = hasOwn(body, 'managed_bundle')
    ? normalizeOptionalString(body.managed_bundle)
    : existing?.managed_bundle ?? null

  const plainApiKey = hasOwn(body, 'api_key') ? normalizeOptionalString(body.api_key) : null

  if (aiMode === 'byok' && !plainApiKey && !existing?.api_key_encrypted) {
    return noStore({ error: 'BYOK vereist een API key of een bestaande opgeslagen key' }, 400)
  }

  const upsertInput: ClientAiSettingsUpsert = {
    client_id: clientId,
    ai_mode: aiMode,
    provider,
    listing_generation_model: listingGenerationModel,
    listing_refinement_model: listingRefinementModel,
    social_generation_model: socialGenerationModel,
    brochure_generation_model: brochureGenerationModel,
    managed_bundle: managedBundle,
    fair_use_limit: fairUseLimit,
    warning_threshold: warningThreshold,
    api_key: plainApiKey ?? undefined,
    key_status: existing?.key_status ?? 'unknown',
    updated_by: user.id,
  }

  const now = new Date().toISOString()
  const nextEncryptedKey = plainApiKey ?? existing?.api_key_encrypted ?? null
  const nextLast4 = plainApiKey ? plainApiKey.slice(-4) : (existing?.api_key_last4 ?? null)

  const { data, error } = await admin
    .from('client_ai_settings')
    .upsert(
      {
        client_id: upsertInput.client_id,
        ai_mode: upsertInput.ai_mode,
        provider: upsertInput.provider,
        listing_generation_model: upsertInput.listing_generation_model ?? null,
        listing_refinement_model: upsertInput.listing_refinement_model ?? null,
        social_generation_model: upsertInput.social_generation_model ?? null,
        brochure_generation_model: upsertInput.brochure_generation_model ?? null,
        managed_bundle: upsertInput.managed_bundle ?? null,
        fair_use_limit: upsertInput.fair_use_limit ?? null,
        warning_threshold: upsertInput.warning_threshold,
        // TODO: vervang plain opslag met echte encryptie util zodra beschikbaar.
        api_key_encrypted: nextEncryptedKey,
        api_key_last4: nextLast4,
        key_status: plainApiKey ? 'unknown' : upsertInput.key_status,
        updated_by: upsertInput.updated_by,
        updated_at: now,
      },
      { onConflict: 'client_id' }
    )
    .select('*')
    .single()

  if (error) return noStore({ error: error.message }, 500)

  return noStore({ settings: sanitizeSettings(data as ClientAiSettings) })
}
