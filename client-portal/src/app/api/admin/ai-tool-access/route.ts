// /api/admin/ai-tool-access
// GET: List client access to a tool
// POST: Grant client access to a tool
// PATCH: Update or revoke access

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

    if (!tool_id) {
      return NextResponse.json(
        { error: 'tool_id parameter is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: access_records, error } = await supabase
      .from('ai_tool_access')
      .select(
        `
        id,
        tool_id,
        client_id,
        access_type,
        monthly_token_limit,
        token_reset_day,
        access_granted_at,
        access_revoked_at,
        clients:client_id (id, name, company)
      `
      )
      .eq('tool_id', tool_id)
      .order('access_granted_at', { ascending: false })

    if (error) {
      console.error('Error fetching access records:', error)
      return NextResponse.json(
        { error: 'Failed to fetch access records' },
        { status: 500 }
      )
    }

    return NextResponse.json({ access_records })
  } catch (error: any) {
    console.error('GET /api/admin/ai-tool-access error:', error.message)
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
    const {
      tool_id,
      client_id,
      access_type = 'testing',
      monthly_token_limit = 500000,
      token_reset_day = 1,
      reason_for_access,
    } = body

    if (!tool_id || !client_id) {
      return NextResponse.json(
        { error: 'tool_id and client_id are required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if access already exists
    const { data: existing } = await supabase
      .from('ai_tool_access')
      .select('id')
      .eq('tool_id', tool_id)
      .eq('client_id', client_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Client already has access to this tool' },
        { status: 409 }
      )
    }

    // Calculate token_reset_date (first day of next month or this month if not yet passed reset_day)
    const now = new Date()
    let reset_date = new Date(now.getFullYear(), now.getMonth() + 1, token_reset_day)
    if (now.getDate() < token_reset_day && now.getMonth() === reset_date.getMonth() - 1) {
      reset_date = new Date(now.getFullYear(), now.getMonth(), token_reset_day)
    }

    // Create access record
    const { data: access, error } = await supabase
      .from('ai_tool_access')
      .insert({
        tool_id,
        client_id,
        access_type,
        monthly_token_limit,
        token_reset_day,
        token_reset_date: reset_date.toISOString(),
        access_granted_at: new Date().toISOString(),
        reason_for_access: reason_for_access || null,
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating access record:', error)
      return NextResponse.json(
        { error: 'Failed to create access record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ access }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/admin/ai-tool-access error:', error.message)
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
    const { access_id, access_type, revoke } = body

    if (!access_id) {
      return NextResponse.json(
        { error: 'access_id is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const updateData: any = {}
    if (revoke) {
      updateData.access_revoked_at = new Date().toISOString()
    } else if (access_type) {
      updateData.access_type = access_type
    }

    const { data: access, error } = await supabase
      .from('ai_tool_access')
      .update(updateData)
      .eq('id', access_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating access:', error)
      return NextResponse.json(
        { error: 'Failed to update access' },
        { status: 500 }
      )
    }

    return NextResponse.json({ access })
  } catch (error: any) {
    console.error('PATCH /api/admin/ai-tool-access error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
