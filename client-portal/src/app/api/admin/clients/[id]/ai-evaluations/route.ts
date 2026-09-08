import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ai_tool_evaluations')
    .select('id, tool_id, result_session_id, channel, score_factual_accuracy, score_completeness, score_leunis_style, score_channel_fit, score_activation, score_readability, free_comment, generated_text_sample, created_at, ai_tools(name, slug)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('GET /api/admin/clients/[id]/ai-evaluations error:', error.message)
    return NextResponse.json({ error: 'Evaluaties konden niet worden geladen' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({ evaluations: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
