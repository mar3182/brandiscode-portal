import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = (await req.json()) as { is_read?: boolean }

  if (typeof body.is_read !== 'boolean') {
    return NextResponse.json({ error: 'Geen geldige velden om bij te werken' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('feedback')
    .update({ is_read: body.is_read })
    .eq('id', id)
    .select('id, is_read')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Feedback niet gevonden' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feedback: data })
}
