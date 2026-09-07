import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { runAiPrompt } from '@/lib/ai-generation'
import type { AiEvalCase, AiEvalRun, AiPromptVersion } from '@/lib/types'
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

type EvalCaseWithLatestRun = AiEvalCase & { latest_run: AiEvalRun | null }

/** GET /api/admin/ai-tools/evals — FEATURE NOT YET IMPLEMENTED */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  // Feature not yet implemented - ai_prompt_versions table required
  return noStore({ 
    eval_cases: [],
    message: 'Evaluaties zijn nog niet beschikbaar. Deze feature wordt in de toekomst toegevoegd.' 
  }, 200)
}

/** POST /api/admin/ai-tools/evals — FEATURE NOT YET IMPLEMENTED */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  // Feature not yet implemented
  return noStore({ 
    error: 'Evaluaties uitvoeren is nog niet beschikbaar',
    message: 'Deze feature wordt in de toekomst toegevoegd.' 
  }, 503)
}
