// /api/admin/ai-evals
// GET: List evaluations
// POST: Create evaluation

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'mary@brandiscode.com'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const tool_id = searchParams.get('tool_id')
    const status = searchParams.get('status')

    const supabase = createClient()

    let query = supabase
      .from('ai_evals')
      .select(
        `
        id,
        tool_id,
        eval_name,
        eval_type,
        description,
        status,
        total_samples,
        passed_samples,
        avg_score,
        pass_rate,
        feedback_summary,
        created_by,
        created_at,
        completed_at,
        ai_eval_results (count)
      `
      )

    if (tool_id) query = query.eq('tool_id', tool_id)
    if (status) query = query.eq('status', status)

    const { data: evals, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching evals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch evaluations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ evals })
  } catch (error: any) {
    console.error('GET /api/admin/ai-evals error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { tool_id, eval_name, eval_type = 'quality', description, test_cases = [] } = body

    if (!tool_id || !eval_name) {
      return NextResponse.json(
        { error: 'tool_id and eval_name are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Create eval record
    const { data: eval_record, error: evalError } = await supabase
      .from('ai_evals')
      .insert({
        tool_id,
        eval_name,
        eval_type,
        description: description || null,
        status: 'draft',
        total_samples: test_cases.length,
        passed_samples: 0,
        avg_score: 0,
        pass_rate: 0,
        created_by: user?.id,
      })
      .select()
      .single()

    if (evalError) {
      console.error('Error creating eval:', evalError)
      return NextResponse.json(
        { error: 'Failed to create evaluation' },
        { status: 500 }
      )
    }

    // Create test results
    if (test_cases.length > 0) {
      const results = test_cases.map((tc: any) => ({
        eval_id: eval_record.id,
        input_json: tc.input_json,
        expected_output: tc.expected_output,
        actual_output: null,
        score: null,
        passed: false,
      }))

      const { error: resultsError } = await supabase
        .from('ai_eval_results')
        .insert(results)

      if (resultsError) {
        console.error('Error creating eval results:', resultsError)
      }
    }

    return NextResponse.json({ eval: eval_record }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/admin/ai-evals error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
