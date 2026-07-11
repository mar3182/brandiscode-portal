import { computeFactuurBedragen } from '@/lib/types'
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
  if (!user) return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })

  const { id } = params
  if (!id) return NextResponse.json({ error: 'Factuur-ID ontbreekt' }, { status: 400 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Ongeldig verzoek' }, { status: 400 })
  }

  const allowedFields: Record<string, unknown> = {}

  if (body.status !== undefined) {
    const validStatuses = ['concept', 'verstuurd', 'betaald', 'herinnering']
    if (!validStatuses.includes(String(body.status))) {
      return NextResponse.json({ error: 'Ongeldige status opgegeven' }, { status: 400 })
    }
    allowedFields.status = body.status
    // Automatisch betaaldatum zetten als status naar 'betaald' gaat
    if (body.status === 'betaald') {
      allowedFields.paid_at = new Date().toISOString()
    }
  }

  if ('due_date' in body) {
    allowedFields.due_date = body.due_date || null
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'Geen geldige velden om bij te werken' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('facturen')
    .update(allowedFields)
    .eq('id', id)
    .select('*, sprints(number, title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    ...computeFactuurBedragen(data as Parameters<typeof computeFactuurBedragen>[0]),
  })
}
