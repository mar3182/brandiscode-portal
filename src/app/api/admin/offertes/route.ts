import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

// GET all offertes with sprints
export async function GET() {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('offertes')
    .select('*, clients(name, company), sprints(*, deliverables(*))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST new offerte
export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, title, description, total_amount, sprints } = body

  if (!client_id || !title || !total_amount) {
    return NextResponse.json({ error: 'Client, titel en bedrag zijn verplicht' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create offerte
  const { data: offerte, error: offerteError } = await admin
    .from('offertes')
    .insert({ client_id, title, description, total_amount })
    .select()
    .single()

  if (offerteError) return NextResponse.json({ error: offerteError.message }, { status: 500 })

  // Create sprints if provided
  if (sprints && sprints.length > 0) {
    for (const sprint of sprints) {
      const { data: sprintData, error: sprintError } = await admin
        .from('sprints')
        .insert({
          offerte_id: offerte.id,
          number: sprint.number,
          title: sprint.title,
          description: sprint.description,
          amount: sprint.amount,
        })
        .select()
        .single()

      if (sprintError) continue

      // Create deliverables if provided
      if (sprint.deliverables && sprint.deliverables.length > 0) {
        await admin.from('deliverables').insert(
          sprint.deliverables.map((d: { title: string; description?: string }) => ({
            sprint_id: sprintData.id,
            title: d.title,
            description: d.description,
          }))
        )
      }
    }
  }

  return NextResponse.json(offerte, { status: 201 })
}
