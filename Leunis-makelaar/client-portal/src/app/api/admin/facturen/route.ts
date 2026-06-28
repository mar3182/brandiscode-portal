import { computeFactuurBedragen } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('client_id')
  const admin = createAdminClient()

  let query = admin
    .from('facturen')
    .select('*, clients(name, company), sprints(number, title)')
    .order('created_at', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withComputed = (data || []).map((factuur: any) => ({
    ...factuur,
    ...computeFactuurBedragen(factuur),
  }))

  return NextResponse.json(withComputed)
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { client_id, sprint_id, title, description, amount, btw_percentage, due_date } = body

  const parsedAmount = Number(amount)
  const parsedBtw = btw_percentage === undefined ? 21 : Number(btw_percentage)

  if (!client_id || !title || amount === undefined || amount === null) {
    return NextResponse.json({ error: 'client_id, title en amount zijn verplicht' }, { status: 400 })
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: 'amount moet een geldig getal zijn' }, { status: 400 })
  }

  if (!Number.isFinite(parsedBtw) || parsedBtw < 0) {
    return NextResponse.json({ error: 'btw_percentage moet een geldig getal zijn' }, { status: 400 })
  }

  const admin = createAdminClient()
  const year = new Date().getFullYear()

  const { data: existing } = await admin
    .from('facturen')
    .select('factuur_nummer')
    .like('factuur_nummer', `FAC-${year}-%`)
    .order('factuur_nummer', { ascending: false })
    .limit(1)

  let nextNumber = 1
  const latest = existing?.[0]?.factuur_nummer
  if (latest) {
    const parts = latest.split('-')
    const parsed = Number(parts[2])
    if (!Number.isNaN(parsed)) nextNumber = parsed + 1
  }

  const factuurNummer = `FAC-${year}-${String(nextNumber).padStart(3, '0')}`

  const { data, error } = await admin
    .from('facturen')
    .insert({
      client_id,
      sprint_id: sprint_id || null,
      factuur_nummer: factuurNummer,
      title,
      description: description || null,
      amount: parsedAmount,
      btw_percentage: parsedBtw,
      due_date: due_date || null,
      status: 'concept',
    })
    .select('*, clients(name, company), sprints(number, title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...data, ...computeFactuurBedragen(data) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, title, description, amount, btw_percentage, due_date, sprint_id } = body

  if (!id) {
    return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })
  }

  if (status !== undefined && !['concept', 'verstuurd', 'betaald', 'herinnering'].includes(status)) {
    return NextResponse.json({ error: 'Ongeldige status' }, { status: 400 })
  }

  const admin = createAdminClient()

  const update: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (status !== undefined) {
    update.status = status
    if (status === 'betaald') {
      update.paid_at = new Date().toISOString()
    } else {
      update.paid_at = null
    }
  }

  if (title !== undefined) update.title = title
  if (description !== undefined) update.description = description || null
  if (amount !== undefined) {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json({ error: 'amount moet een geldig getal zijn' }, { status: 400 })
    }
    update.amount = parsedAmount
  }

  if (btw_percentage !== undefined) {
    const parsedBtw = Number(btw_percentage)
    if (!Number.isFinite(parsedBtw) || parsedBtw < 0) {
      return NextResponse.json({ error: 'btw_percentage moet een geldig getal zijn' }, { status: 400 })
    }
    update.btw_percentage = parsedBtw
  }
  if (due_date !== undefined) update.due_date = due_date || null
  if (sprint_id !== undefined) update.sprint_id = sprint_id || null

  const { data, error } = await admin
    .from('facturen')
    .update(update)
    .eq('id', id)
    .select('*, clients(name, company), sprints(number, title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Factuur niet gevonden' }, { status: 404 })

  return NextResponse.json({ ...data, ...computeFactuurBedragen(data) })
}

export async function DELETE(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is verplicht' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('facturen').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
