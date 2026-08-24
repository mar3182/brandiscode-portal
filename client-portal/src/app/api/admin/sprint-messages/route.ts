import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET messages for a sprint
export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sprintId = req.nextUrl.searchParams.get('sprint_id')
  if (!sprintId) return NextResponse.json({ error: 'sprint_id is verplicht' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sprint_messages')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST a new message as admin
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sprint_id, message } = body

  if (!sprint_id || !message?.trim()) {
    return NextResponse.json({ error: 'sprint_id en message zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sprint_messages')
    .insert({
      sprint_id,
      sender_email: user.email!,
      sender_role: 'admin',
      message: message.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reset client_approved to null so client can re-evaluate
  await admin
    .from('sprints')
    .update({ client_approved: null, client_feedback: null })
    .eq('id', sprint_id)

  return NextResponse.json(data)
}
