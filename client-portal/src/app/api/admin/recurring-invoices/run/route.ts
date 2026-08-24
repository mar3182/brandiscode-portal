import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { runRecurringInvoiceGeneration } from '@/lib/recurringInvoices'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export async function POST(req: NextRequest) {
  const user = await checkAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { client_id?: string }
  const clientId = typeof body.client_id === 'string' && body.client_id.trim() ? body.client_id.trim() : undefined

  const result = await runRecurringInvoiceGeneration({
    force: true,
    clientId,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
