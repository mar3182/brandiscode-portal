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

/** GET /api/admin/ai-tools/evals — evaluatiecases (optioneel gefilterd) + laatste run per case */
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const admin = createAdminClient()
  const { searchParams } = new URL(req.url)
  const toolName = searchParams.get('tool_name')
  const clientId = searchParams.get('client_id')

  let query = admin.from('ai_eval_cases').select('*').order('created_at', { ascending: false })
  if (toolName) query = query.eq('tool_name', toolName)
  if (clientId) query = query.eq('client_id', clientId)

  const { data: cases, error: casesError } = await query
  if (casesError) return noStore({ error: casesError.message }, 500)

  const evalCases = (cases ?? []) as AiEvalCase[]
  const caseIds = evalCases.map((c) => c.id)

  const latestRunByCase = new Map<string, AiEvalRun>()

  if (caseIds.length > 0) {
    const { data: runs, error: runsError } = await admin
      .from('ai_eval_runs')
      .select('*')
      .in('eval_case_id', caseIds)
      .order('created_at', { ascending: false })

    if (runsError) return noStore({ error: runsError.message }, 500)

    for (const run of (runs ?? []) as AiEvalRun[]) {
      if (!latestRunByCase.has(run.eval_case_id)) {
        latestRunByCase.set(run.eval_case_id, run)
      }
    }
  }

  const result: EvalCaseWithLatestRun[] = evalCases.map((evalCase) => ({
    ...evalCase,
    latest_run: latestRunByCase.get(evalCase.id) ?? null,
  }))

  return noStore({ eval_cases: result })
}

/** POST /api/admin/ai-tools/evals — voer een eval-case uit tegen een promptversie en sla het resultaat op */
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return noStore({ error: 'Unauthorized' }, 401)

  const admin = createAdminClient()
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const evalCaseId = typeof body.eval_case_id === 'string' ? body.eval_case_id : null
  const promptVersionId = typeof body.prompt_version_id === 'string' ? body.prompt_version_id : null

  if (!evalCaseId || !promptVersionId) {
    return noStore({ error: 'eval_case_id en prompt_version_id zijn verplicht' }, 400)
  }

  const [evalCaseRes, promptVersionRes] = await Promise.all([
    admin.from('ai_eval_cases').select('*').eq('id', evalCaseId).maybeSingle(),
    admin.from('ai_prompt_versions').select('*').eq('id', promptVersionId).maybeSingle(),
  ])

  if (evalCaseRes.error) return noStore({ error: evalCaseRes.error.message }, 500)
  if (promptVersionRes.error) return noStore({ error: promptVersionRes.error.message }, 500)

  const evalCase = evalCaseRes.data as AiEvalCase | null
  const promptVersion = promptVersionRes.data as AiPromptVersion | null

  if (!evalCase) return noStore({ error: 'Eval-case niet gevonden' }, 404)
  if (!promptVersion) return noStore({ error: 'Promptversie niet gevonden' }, 404)

  const userInput = JSON.stringify(evalCase.input_payload)

  try {
    const result = await runAiPrompt({ systemPrompt: promptVersion.system_prompt, userInput })

    const { data: inserted, error: insertError } = await admin
      .from('ai_eval_runs')
      .insert({
        eval_case_id: evalCaseId,
        prompt_version_id: promptVersionId,
        output_text: result.text,
        scores: {},
        reviewer: null,
        passed: null,
      })
      .select('*')
      .single()

    if (insertError) return noStore({ error: insertError.message }, 500)

    return noStore({ eval_run: inserted as AiEvalRun }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('AI Workbench eval-run mislukt:', message)
    return noStore({ error: `Fout bij genereren: ${message}` }, 500)
  }
}
