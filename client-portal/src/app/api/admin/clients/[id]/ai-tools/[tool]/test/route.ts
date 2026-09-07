import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { runAiPrompt } from '@/lib/ai-generation'
import type { AiPromptVersion } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

function noStore(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

/**
 * POST .../ai-tools/[tool]/test — FEATURE NOT YET IMPLEMENTED
 * Prompt testing requires ai_prompt_versions table which hasn't been added to schema yet
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; tool: string } }
) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  // Feature not yet implemented
  return noStore({ 
    error: 'Prompt testen is nog niet beschikbaar',
    message: 'Deze feature wordt in de toekomst toegevoegd.' 
  }, 503)
}
