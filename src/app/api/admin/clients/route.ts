import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return null
  }
  return user
}

// GET all clients
export async function GET() {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('clients').select('*').order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST new client
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, email, company, phone } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Naam en e-mail zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Create Supabase Auth user so they can log in with magic link
  const { error: authError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // Skip email confirmation — admin verified the email
    user_metadata: { name, company },
  })

  // Ignore "User already registered" — they may already have an auth account
  if (authError && !authError.message.includes('already been registered')) {
    return NextResponse.json({ error: `Auth: ${authError.message}` }, { status: 500 })
  }

  // 2. Insert into clients table
  const { data, error } = await admin.from('clients').insert({ name, email, company, phone }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
