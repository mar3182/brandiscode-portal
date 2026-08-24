import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const body = await req.json() as { sprint_id?: string; rating?: number; message?: string }
  const { sprint_id, rating, message } = body

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Geef een beoordeling van 1 tot 5 sterren' }, { status: 400 })
  }
  if (!message || message.trim().length < 10) {
    return NextResponse.json({ error: 'Schrijf minimaal 10 tekens als feedback' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Zoek client_id via email
  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('email', user.email!)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
  }

  const { error } = await admin.from('feedback').insert({
    client_id: client.id,
    sprint_id: sprint_id ?? null,
    rating,
    message: message.trim(),
    is_read: false,
    is_published: false,
  })

  if (error) {
    return NextResponse.json({ error: 'Kon feedback niet opslaan' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
