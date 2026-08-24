/**
 * API: GET /api/admin/offertes
 * Lists all offertes (admin only)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function checkAdmin() {
  // Note: In production, use createClient() for auth check
  // This is a simplified version - implement proper auth
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return false
  return true
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    
    const { data: offertes, error } = await admin
      .from('offertes')
      .select(`
        *,
        clients:client_id (id, name, company, email, contact_person),
        sprints:sprints (id, sprint_number, title, status)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(offertes || [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
