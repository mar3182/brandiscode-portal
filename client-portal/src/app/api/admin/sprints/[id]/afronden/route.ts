import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendFeedbackRequestEmail } from '@/lib/email'
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

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await checkAdmin()
  if (!user) {
    return NextResponse.json(
      { error: 'Geen toegang' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { id: sprintId } = params

  const admin = createAdminClient()

  // Fetch sprint
  const { data: sprint, error: sprintError } = await admin
    .from('sprints')
    .select('id, number, title, status, offerte_id')
    .eq('id', sprintId)
    .single()

  if (sprintError || !sprint) {
    return NextResponse.json(
      { error: 'Sprint niet gevonden' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (sprint.status === 'afgerond') {
    return NextResponse.json(
      { error: 'Sprint is al afgerond' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Update sprint status
  const { error: updateError } = await admin
    .from('sprints')
    .update({ status: 'afgerond' })
    .eq('id', sprintId)

  if (updateError) {
    return NextResponse.json(
      { error: `Kon sprint niet bijwerken: ${updateError.message}` },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Fetch client via offerte
  const { data: offerte, error: offerteError } = await admin
    .from('offertes')
    .select('client_id')
    .eq('id', sprint.offerte_id)
    .single()

  if (offerteError || !offerte) {
    return NextResponse.json(
      { error: 'Gekoppelde offerte niet gevonden' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('email, company, contact_person, billing_email')
    .eq('id', offerte.client_id)
    .single()

  if (clientError || !client) {
    return NextResponse.json(
      { error: 'Klant niet gevonden' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const toEmail = (client.billing_email ?? client.email) as string
  const contactName = (client.contact_person ?? client.company ?? 'klant') as string
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://portal.brandiscode.com'
  const feedbackLink = `${appUrl}/dashboard/feedback?sprint=${sprintId}`

  try {
    await sendFeedbackRequestEmail({
      to: toEmail,
      contactName,
      sprintNumber: sprint.number as number,
      sprintTitle: sprint.title as string,
      feedbackLink,
    })
  } catch (emailErr) {
    // Log but don't fail — sprint is already marked afgerond
    console.error('Feedback e-mail verzenden mislukt:', emailErr)
    return NextResponse.json(
      {
        success: true,
        clientEmail: toEmail,
        warning: 'Sprint afgerond, maar feedback-e-mail kon niet worden verzonden',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { success: true, clientEmail: toEmail },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
