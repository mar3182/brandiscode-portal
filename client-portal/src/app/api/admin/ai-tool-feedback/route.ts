// /api/admin/ai-tool-feedback
// GET: List feedback for tools
// PATCH: Respond to feedback

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
      .from('ai_tool_feedback')
      .select(
        `
        id,
        tool_id,
        client_id,
        feedback_type,
        rating,
        comment,
        screenshot_url,
        status,
        admin_response,
        admin_response_at,
        created_by,
        created_at,
        clients:client_id (id, name, company),
        ai_tools:tool_id (id, name, slug)
      `
      )

    if (tool_id) query = query.eq('tool_id', tool_id)
    if (status) query = query.eq('status', status)

    const { data: feedback, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      )
    }

    // Calculate summary
    const summary = {
      total_feedback: feedback.length,
      avg_rating:
        feedback.length > 0
          ? (
              feedback.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) /
              feedback.length
            ).toFixed(1)
          : 0,
      new_feedback: feedback.filter((f: any) => f.status === 'new').length,
      bug_count: feedback.filter((f: any) => f.feedback_type === 'bug').length,
      feature_requests: feedback.filter((f: any) => f.feedback_type === 'feature-request')
        .length,
    }

    return NextResponse.json({ feedback, summary })
  } catch (error: any) {
    console.error('GET /api/admin/ai-tool-feedback error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const { feedback_id, status, admin_response } = body

    if (!feedback_id) {
      return NextResponse.json(
        { error: 'feedback_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const updateData: any = {}
    if (status) updateData.status = status
    if (admin_response) {
      updateData.admin_response = admin_response
      updateData.admin_response_at = new Date().toISOString()
    }

    const { data: feedback, error } = await supabase
      .from('ai_tool_feedback')
      .update(updateData)
      .eq('id', feedback_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating feedback:', error)
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({ feedback })
  } catch (error: any) {
    console.error('PATCH /api/admin/ai-tool-feedback error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
