import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { computeFactuurBedragen } from '@/lib/types'
import { computeTrainingCompleteness } from '@/lib/trainingIntake'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const admin = createAdminClient()

  const [clientRes, offertesRes, trainingRes, facturenRes] = await Promise.all([
    admin.from('clients').select('*').eq('id', id).single(),
    admin
      .from('offertes')
      .select('*, sprints(*, deliverables(*), sprint_messages(*))')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('training_intakes')
      .select('*, training_intake_members(*), training_sessions(*)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('facturen')
      .select('*, sprints(number, title)')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (clientRes.error) {
    if (clientRes.error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Klant niet gevonden' }, { status: 404 })
    }
    return NextResponse.json({ error: clientRes.error.message }, { status: 500 })
  }

  const facturen = (facturenRes.data || []).map((f: Record<string, unknown>) => ({
    ...f,
    ...computeFactuurBedragen(f as Parameters<typeof computeFactuurBedragen>[0]),
  }))

  const trainingen = (trainingRes.data || []).map((t: Record<string, unknown>) => {
    const members = Array.isArray(t.training_intake_members) ? t.training_intake_members : []
    const sessions = Array.isArray(t.training_sessions) ? t.training_sessions : []
    const comp = computeTrainingCompleteness({ ...t, members } as import('@/lib/trainingIntake').TrainingIntakeInput)
    const completenessPercent = (comp.intakeFieldsComplete ? 50 : 0) + (comp.membersComplete ? 50 : 0)
    return {
      ...t,
      completeness: completenessPercent,
      readyForTraining: comp.readyForTraining,
      memberCount: members.length,
      sessionCount: sessions.length,
    }
  })

  return NextResponse.json({
    client: clientRes.data,
    offertes: offertesRes.data || [],
    trainingen,
    facturen,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clientId } = params
  const body = (await req.json()) as {
    intake_id?: string
    communication_consent?: boolean
    communication_notes?: string
  }

  if (typeof body.communication_consent !== 'boolean' && typeof body.communication_notes !== 'string') {
    return NextResponse.json({ error: 'Geen geldige velden om bij te werken' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: existing, error: existingError } = await admin
    .from('training_intakes')
    .select('id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    updated_at: now,
    updated_by: user.id,
  }

  if (typeof body.communication_consent === 'boolean') {
    payload.communication_consent = body.communication_consent
  }

  if (typeof body.communication_notes === 'string') {
    payload.communication_notes = body.communication_notes.trim() || null
  }

  const { data: intake, error: upsertError } = existing
    ? await admin
      .from('training_intakes')
      .update(payload)
      .eq('id', existing.id)
      .select('id, client_id, communication_consent, communication_notes, updated_at')
      .single()
    : await admin
      .from('training_intakes')
      .insert({
        client_id: clientId,
        status: 'draft',
        created_by: user.id,
        ...payload,
      })
      .select('id, client_id, communication_consent, communication_notes, updated_at')
      .single()

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ intake })
}
