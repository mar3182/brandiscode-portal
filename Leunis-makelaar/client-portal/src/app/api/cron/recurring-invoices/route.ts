import { NextRequest, NextResponse } from 'next/server'
import { runRecurringInvoiceGeneration } from '@/lib/recurringInvoices'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return unauthorized()
  }

  const force = req.nextUrl.searchParams.get('force') === '1'
  const clientId = req.nextUrl.searchParams.get('client_id') || undefined

  const result = await runRecurringInvoiceGeneration({
    force,
    clientId,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
