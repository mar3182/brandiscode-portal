// /api/admin/ai-tools
// GET: List all AI tools with feedback summaries
// POST: Create a new AI tool
// PATCH: Update tool status and readiness

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

    const supabase = createClient()

    // Get all tools with feedback summary
    const { data: tools, error: toolsError } = await supabase
      .from('ai_tools')
      .select(
        `
        id,
        slug,
        name,
        description,
        version,
        status,
        readiness_percentage,
        created_at,
        published_at,
        updated_at,
        ai_tool_access (count),
        ai_tool_feedback (rating, status)
      `
      )
      .order('created_at', { ascending: false })

    if (toolsError) {
      console.error('Error fetching tools:', toolsError)
      return NextResponse.json(
        { error: 'Failed to fetch tools' },
        { status: 500 }
      )
    }

    // Process tools with feedback summary
    const processedTools = tools.map((tool: any) => {
      const feedbacks = tool.ai_tool_feedback || []
      const avgRating =
        feedbacks.length > 0
          ? (
              feedbacks.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) /
              feedbacks.length
            ).toFixed(1)
          : '0'

      return {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        version: tool.version,
        status: tool.status,
        readiness_percentage: tool.readiness_percentage,
        feedback_summary: {
          total_feedback: feedbacks.length,
          avg_rating: avgRating as unknown as number,
          new_feedback: feedbacks.filter((f: any) => f.status === 'new').length,
          bug_count: feedbacks.filter((f: any) => f.status === 'bug').length,
        },
        access_count: tool.ai_tool_access[0]?.count || 0,
        created_at: tool.created_at,
      }
    })

    return NextResponse.json({ tools: processedTools })
  } catch (error: any) {
    console.error('GET /api/admin/ai-tools error:', error.message)
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
    const { slug, name, description, version } = body

    if (!slug || !name) {
      return NextResponse.json(
        { error: 'slug and name are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('ai_tools')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Tool with this slug already exists' },
        { status: 409 }
      )
    }

    // Create new tool
    const { data: tool, error } = await supabase
      .from('ai_tools')
      .insert({
        slug,
        name,
        description: description || null,
        version: version || '1.0.0',
        status: 'development',
        readiness_percentage: 0,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tool:', error)
      return NextResponse.json(
        { error: 'Failed to create tool' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tool }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/admin/ai-tools error:', error.message)
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
    const { tool_id, status, readiness_percentage, readiness_notes } = body

    if (!tool_id) {
      return NextResponse.json(
        { error: 'tool_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (readiness_percentage !== undefined)
      updateData.readiness_percentage = readiness_percentage
    if (readiness_notes !== undefined) updateData.readiness_notes = readiness_notes
    updateData.updated_at = new Date().toISOString()

    const { data: tool, error } = await supabase
      .from('ai_tools')
      .update(updateData)
      .eq('id', tool_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tool:', error)
      return NextResponse.json(
        { error: 'Failed to update tool' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tool })
  } catch (error: any) {
    console.error('PATCH /api/admin/ai-tools error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
