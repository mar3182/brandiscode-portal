// /api/client/ai-tool-feedback
// POST: Submit feedback on an AI tool

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    // Get client_id from client_users table
    const admin = createAdminClient()
    const { data: clientUser } = await admin
      .from('client_users')
      .select('client_id')
      .eq('email', user.email)
      .single()

    if (!clientUser?.client_id) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const {
      tool_id,
      feedback_type,
      rating,
      comment,
      screenshot_url,
      generated_text_sample,
      input_sample,
    } = body

    // Validate input
    if (!tool_id || !feedback_type || !rating || !comment) {
      return NextResponse.json(
        { error: 'tool_id, feedback_type, rating, and comment are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (comment.length < 10 || comment.length > 2000) {
      return NextResponse.json(
        {
          error: 'comment must be between 10 and 2000 characters',
        },
        { status: 400 }
      )
    }

    // Check if client has access to this tool
    const { data: accessRecords } = await admin
      .from('ai_tool_access')
      .select('id')
      .eq('tool_id', tool_id)
      .eq('client_id', clientUser.client_id)
      .is('access_revoked_at', null)

    const access = accessRecords && accessRecords.length > 0 ? accessRecords[0] : null

    if (!access) {
      return NextResponse.json(
        { error: 'You do not have access to this tool' },
        { status: 403 }
      )
    }

    // Create feedback
    const { data: feedback, error } = await supabase
      .from('ai_tool_feedback')
      .insert({
        tool_id,
        client_id: clientUser.client_id,
        feedback_type,
        rating,
        comment,
        screenshot_url: screenshot_url || null,
        generated_text_sample: generated_text_sample || null,
        input_sample: input_sample || null,
        status: 'new',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating feedback:', error)
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Dank je voor je feedback!',
        feedback: {
          id: feedback.id,
          status: feedback.status,
          created_at: feedback.created_at,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('POST /api/client/ai-tool-feedback error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
