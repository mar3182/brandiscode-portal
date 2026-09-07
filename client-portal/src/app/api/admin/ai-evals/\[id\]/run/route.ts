// /api/admin/ai-evals/[id]/run
// POST: Execute evaluation and score results

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

    const eval_id = params.id
    const supabase = createClient()

    // Get evaluation with results
    const { data: evaluation, error: evalError } = await supabase
      .from('ai_evals')
      .select(
        `
        id,
        tool_id,
        eval_name,
        status,
        total_samples,
        ai_eval_results (id, input_json, expected_output)
      `
      )
      .eq('id', eval_id)
      .single()

    if (evalError || !evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    // TODO: Replace placeholder logic with actual AI endpoint calls
    // For now, simulate 50% pass rate
    const results = evaluation.ai_eval_results || []
    let passedCount = 0
    let totalScore = 0

    for (let i = 0; i < results.length; i++) {
      const passed = Math.random() > 0.5
      const score = passed ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 50)

      if (passed) passedCount++
      totalScore += score

      // Update result
      await supabase
        .from('ai_eval_results')
        .update({
          actual_output: `Placeholder output for test case ${i + 1}`,
          score,
          passed,
        })
        .eq('id', results[i].id)
    }

    const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0
    const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0

    // Update eval record
    const { data: updated, error: updateError } = await supabase
      .from('ai_evals')
      .update({
        status: 'completed',
        passed_samples: passedCount,
        avg_score: avgScore,
        pass_rate: passRate,
        feedback_summary: `Passed ${passedCount}/${results.length} tests (${passRate}% pass rate)`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', eval_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating eval:', updateError)
      return NextResponse.json(
        { error: 'Failed to run evaluation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ eval: updated })
  } catch (error: any) {
    console.error('POST /api/admin/ai-evals/[id]/run error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
