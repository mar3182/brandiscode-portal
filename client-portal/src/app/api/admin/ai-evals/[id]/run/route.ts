import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/ai-evals/[id]/run
 * Execute evaluation and score results
 * Admin only
 * Placeholder: scores ~50% randomly; TODO: Call actual AI endpoints for real scoring
 */
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user?.email !== 'mary@brandiscode.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const evalId = context.params.id

    // Get evaluation + results
    const { data: evalRecord, error: evalError } = await supabase
      .from('ai_evals')
      .select(
        `
        id,
        tool_id,
        eval_name,
        eval_type,
        description,
        status,
        created_by,
        created_at,
        ai_eval_results (
          id,
          input_json,
          expected_output,
          actual_output,
          score,
          passed
        )
      `
      )
      .eq('id', evalId)
      .single()

    if (evalError || !evalRecord) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      )
    }

    const results = evalRecord.ai_eval_results || []
    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No test cases in this evaluation' },
        { status: 400 }
      )
    }

    // Score results (PLACEHOLDER: ~50% random pass rate)
    // TODO: Replace with actual AI endpoint calls:
    // - POST /api/ai-tools/{tool_slug} with input_json
    // - Compare actual_output vs expected_output
    // - Use similarity scoring (e.g., cosine similarity, BLEU score)
    let passedCount = 0
    const scoredResults = results.map((result: any) => {
      const passed = Math.random() > 0.5
      const score = passed ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 20
      if (passed) passedCount++
      return {
        id: result.id,
        score,
        passed,
      }
    })

    // Update eval results
    for (const result of scoredResults) {
      const { error: updateError } = await supabase
        .from('ai_eval_results')
        .update({
          score: result.score,
          passed: result.passed,
        })
        .eq('id', result.id)

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to score result: ${updateError.message}` },
          { status: 500 }
        )
      }
    }

    // Calculate metrics
    const avgScore = Math.round(
      scoredResults.reduce((sum: number, r: any) => sum + r.score, 0) /
        scoredResults.length
    )
    const passRate = Math.round((passedCount / scoredResults.length) * 100)

    // Update eval status
    const { error: evalUpdateError } = await supabase
      .from('ai_evals')
      .update({
        status: 'completed',
        total_samples: scoredResults.length,
        passed_samples: passedCount,
        avg_score: avgScore,
        pass_rate: passRate,
        completed_at: new Date().toISOString(),
      })
      .eq('id', evalId)

    if (evalUpdateError) {
      return NextResponse.json(
        { error: `Failed to update eval: ${evalUpdateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Evaluation completed',
        evaluation: {
          id: evalId,
          status: 'completed',
          total_samples: scoredResults.length,
          passed_samples: passedCount,
          avg_score: avgScore,
          pass_rate: passRate,
          results: scoredResults,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error running evaluation:', err)
    return NextResponse.json(
      { error: 'Failed to run evaluation' },
      { status: 500 }
    )
  }
}
