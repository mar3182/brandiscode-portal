/**
 * AI Tool Access Helper
 *
 * Resolves tool access for a client by looking up ai_tools by slug,
 * then checking ai_tool_access for active (non-revoked) access.
 * Used by AI routes to gate access before any OpenAI call.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export interface ToolAccessResult {
  allowed: boolean
  toolId: string | null
  accessId: string | null
  toolSlug: string | null
  accessType: string | null
  monthlyTokenLimit: number | null
  error?: string
}

/**
 * Check if a client has active access to a tool by slug.
 * Returns 403-worthy error if access is missing or revoked.
 */
export async function getToolAccessOrThrow(
  clientId: string,
  slug: string
): Promise<ToolAccessResult> {
  const admin = createAdminClient()

  // 1. Resolve tool_id from ai_tools by slug
  const { data: tool, error: toolError } = await admin
    .from('ai_tools')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle()

  if (toolError) {
    console.warn(`ai_tools lookup failed for slug "${slug}":`, toolError.message)
    return {
      allowed: false,
      toolId: null,
      accessId: null,
      toolSlug: slug,
      accessType: null,
      monthlyTokenLimit: null,
      error: 'De toegang tot deze AI-tool kan momenteel niet worden gecontroleerd.',
    }
  }

  if (!tool) {
    return {
      allowed: false,
      toolId: null,
      accessId: null,
      toolSlug: slug,
      accessType: null,
      monthlyTokenLimit: null,
      error: `Tool "${slug}" niet gevonden.`,
    }
  }

  // 2. Check ai_tool_access for this client + tool
  const { data: access, error: accessError } = await admin
    .from('ai_tool_access')
    .select('id, access_type, monthly_token_limit, access_revoked_at')
    .eq('tool_id', tool.id)
    .eq('client_id', clientId)
    .maybeSingle()

  if (accessError) {
    console.warn(`ai_tool_access lookup failed:`, accessError.message)
    return {
      allowed: false,
      toolId: tool.id,
      accessId: null,
      toolSlug: slug,
      accessType: null,
      monthlyTokenLimit: null,
      error: 'De toegang tot deze AI-tool kan momenteel niet worden gecontroleerd.',
    }
  }

  // No access row at all
  if (!access) {
    return {
      allowed: false,
      toolId: tool.id,
      accessId: null,
      toolSlug: slug,
      accessType: null,
      monthlyTokenLimit: null,
      error: 'Je hebt nog geen toegang tot deze AI-tool. Neem contact op met Brand is Code.',
    }
  }

  // Access revoked
  if (access.access_revoked_at) {
    return {
      allowed: false,
      toolId: tool.id,
      accessId: access.id,
      toolSlug: slug,
      accessType: access.access_type,
      monthlyTokenLimit: access.monthly_token_limit,
      error: 'Je toegang tot deze AI-tool is ingetrokken. Neem contact op met Brand is Code.',
    }
  }

  return {
    allowed: true,
    toolId: tool.id,
    accessId: access.id,
    toolSlug: slug,
    accessType: access.access_type,
    monthlyTokenLimit: access.monthly_token_limit,
  }
}
