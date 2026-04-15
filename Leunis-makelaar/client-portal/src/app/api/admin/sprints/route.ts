import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// PATCH — update sprint status
export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, start_date, end_date } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'ID en status zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()
  const update: Record<string, string> = { status }
  if (start_date) update.start_date = start_date
  if (end_date) update.end_date = end_date

  const { data, error } = await admin.from('sprints').update(update).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
