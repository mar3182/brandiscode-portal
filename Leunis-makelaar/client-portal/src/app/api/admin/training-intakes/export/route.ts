import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function csvEscape(value: unknown) {
  const input = value == null ? '' : String(value)
  const escaped = input.replaceAll('"', '""')
  return `"${escaped}"`
}

async function checkAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = req.nextUrl.searchParams.get('client_id')
  if (!clientId) return NextResponse.json({ error: 'client_id is verplicht' }, { status: 400 })

  const admin = createAdminClient()

  const { data: intake, error: intakeError } = await admin
    .from('training_intakes')
    .select('*, clients(id, name, company, email)')
    .eq('client_id', clientId)
    .maybeSingle()

  if (intakeError) return NextResponse.json({ error: intakeError.message }, { status: 500 })
  if (!intake) return NextResponse.json({ error: 'Geen intake gevonden voor deze klant' }, { status: 404 })

  const { data: members, error: memberError } = await admin
    .from('training_intake_members')
    .select('*')
    .eq('intake_id', intake.id)
    .order('sort_order', { ascending: true })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  const headers = [
    'client_id',
    'bedrijf',
    'klant_email',
    'intake_status',
    'trainingsduur',
    'voorkeursdatum_tijd',
    'contactpersoon',
    'contact_email',
    'focusgebied',
    'privacy_randvoorwaarden',
    'akkoord_datagebruik',
    'communicatie_kanaal',
    'communicatie_email',
    'communicatie_whatsapp',
    'communicatie_toestemming',
    'trainer_notitie',
    'teamlid_naam',
    'teamlid_rol',
    'top_taak_1',
    'top_taak_2',
    'top_taak_3',
    'knelpunt',
    'kpi_doel',
    'digitale_vaardigheid',
    'ai_ervaring',
    'datagrens',
    'beschikbaarheid_trainingsdag',
  ]

  const rows = (members || []).map((member) => {
    const topTasks = Array.isArray(member.top_tasks) ? member.top_tasks : []
    return [
      intake.client_id,
      intake.clients?.company || intake.clients?.name || '',
      intake.clients?.email || '',
      intake.status,
      intake.training_duration || '',
      intake.preferred_datetime || '',
      intake.contact_person || '',
      intake.contact_email || '',
      intake.focus_area || '',
      intake.privacy_constraints || '',
      intake.data_usage_consent ? 'ja' : 'nee',
      intake.communication_channel || '',
      intake.communication_channel === 'email' ? intake.communication_email || '' : '',
      intake.communication_channel === 'whatsapp' ? intake.communication_whatsapp || '' : '',
      intake.communication_consent ? 'Ja' : 'Nee',
      intake.trainer_notes || '',
      member.full_name || '',
      member.role || '',
      topTasks[0] || '',
      topTasks[1] || '',
      topTasks[2] || '',
      member.bottleneck || '',
      member.kpi_goal || '',
      member.digital_skill || '',
      member.ai_experience || '',
      member.prompt_data_boundary || '',
      member.training_day_availability || '',
    ]
  })

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=training-intake-${clientId}.csv`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
