import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getCallerClientUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('*')
    .eq('email', user.email)
    .single()

  return data
}

// GET team members for current user's company
export async function GET() {
  const caller = await getCallerClientUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('client_users')
    .select('*')
    .eq('client_id', caller.client_id)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data, callerRole: caller.role })
}

// POST add new team member (owner only)
export async function POST(req: NextRequest) {
  const caller = await getCallerClientUser()
  if (!caller || caller.role !== 'owner') {
    return NextResponse.json({ error: 'Alleen de eigenaar kan teamleden toevoegen' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Naam en e-mail zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create Supabase Auth user so they can log in
  const tempPassword = crypto.randomUUID().slice(0, 12)
  const { error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, password_changed: false },
  })

  if (authError && !authError.message.includes('already been registered')) {
    return NextResponse.json({ error: `Auth: ${authError.message}` }, { status: 500 })
  }

  // Insert into client_users
  const { data, error } = await admin
    .from('client_users')
    .insert({
      client_id: caller.client_id,
      email,
      name,
      role: 'member',
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return NextResponse.json({ error: 'Dit e-mailadres is al toegevoegd aan het team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ member: data, tempPassword }, { status: 201 })
}

// DELETE remove team member (owner only)
export async function DELETE(req: NextRequest) {
  const caller = await getCallerClientUser()
  if (!caller || caller.role !== 'owner') {
    return NextResponse.json({ error: 'Alleen de eigenaar kan teamleden verwijderen' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  if (!memberId) return NextResponse.json({ error: 'ID is verplicht' }, { status: 400 })

  const admin = createAdminClient()

  // Prevent deleting the owner
  const { data: member } = await admin
    .from('client_users')
    .select('role, client_id')
    .eq('id', memberId)
    .single()

  if (!member || member.client_id !== caller.client_id) {
    return NextResponse.json({ error: 'Teamlid niet gevonden' }, { status: 404 })
  }
  if (member.role === 'owner') {
    return NextResponse.json({ error: 'De eigenaar kan niet verwijderd worden' }, { status: 403 })
  }

  const { error } = await admin
    .from('client_users')
    .delete()
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
