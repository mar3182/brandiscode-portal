// /api/client/ai-tools
// GET: List all AI tools the client has access to

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
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

    // Get tools client has active access to
    const { data: accessRecords, error } = await admin
      .from('ai_tool_access')
      .select(
        `
        id,
        tool_id,
        access_type,
        monthly_token_limit,
        token_reset_day,
        token_reset_date,
        ai_tools:tool_id (id, slug, name, description, version, status, readiness_percentage)
      `
      )
      .eq('client_id', clientUser.client_id)
      .is('access_revoked_at', null)

    if (error) {
      console.error('Error fetching access:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tools' },
        { status: 500 }
      )
    }

    // Get token usage for this month
    const tools = await Promise.all(
      (accessRecords || []).map(async (access: any) => {
        const { data: usageResult } = await admin.rpc(
          'get_tokens_used_this_month',
          {
            p_client_id: clientUser.client_id,
            p_tool_id: access.tool_id,
          }
        )

        const tokens_used = usageResult || 0
        const tokens_remaining = Math.max(0, access.monthly_token_limit - tokens_used)

        return {
          id: access.ai_tools.id,
          slug: access.ai_tools.slug,
          name: access.ai_tools.name,
          description: access.ai_tools.description,
          version: access.ai_tools.version,
          status: access.ai_tools.status,
          readiness_percentage: access.ai_tools.readiness_percentage,
          access_type: access.access_type,
          monthly_token_limit: access.monthly_token_limit,
          tokens_used_this_month: tokens_used,
          tokens_remaining,
        }
      })
    )

    return NextResponse.json({ tools })
  } catch (error: any) {
    console.error('GET /api/client/ai-tools error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
