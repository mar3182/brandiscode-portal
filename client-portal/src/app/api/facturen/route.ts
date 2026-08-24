import { computeFactuurBedragen, Factuur } from '@/lib/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getCallerClientId() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .order('created_at', { ascending: true })
    .limit(1)

  return data?.[0]?.client_id || null
}

export async function GET() {
  const clientId = await getCallerClientId()
  if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('facturen')
    .select('*, sprints(number, title)')
    .eq('client_id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withComputed: Factuur[] = (data || []).map((factuur: any) => ({
    ...factuur,
    ...computeFactuurBedragen(factuur),
    sprint: factuur.sprints
      ? {
          id: '',
          offerte_id: '',
          number: factuur.sprints.number,
          title: factuur.sprints.title,
          description: null,
          amount: 0,
          status: 'gepland',
          start_date: null,
          end_date: null,
          created_at: '',
          client_approved: null,
          client_approved_at: null,
          client_feedback: null,
        }
      : null,
  }))

  const priority: Record<string, number> = {
    verstuurd: 0,
    herinnering: 0,
    concept: 1,
    betaald: 2,
  }

  withComputed.sort((a, b) => {
    const pa = priority[a.status] ?? 1
    const pb = priority[b.status] ?? 1
    if (pa !== pb) return pa - pb
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return NextResponse.json(withComputed)
}
