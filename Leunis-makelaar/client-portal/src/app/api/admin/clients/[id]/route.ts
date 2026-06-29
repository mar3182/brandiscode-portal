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
