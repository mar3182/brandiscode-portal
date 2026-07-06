import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    // Simpele ping query om Supabase free tier wakker te houden
    await supabase.from('clients').select('id').limit(1)
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
