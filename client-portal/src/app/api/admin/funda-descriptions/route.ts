// /api/admin/funda-descriptions
// GET: List all saved Funda descriptions (admin only)
// Allows filtering by client, source type, media format, date range

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId } from '@/lib/ai-usage'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.email) {
    return response({ error: 'Niet ingelogd' }, 401)
  }

  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return response({ error: 'Je klanttoegang kon niet worden vastgesteld.' }, 403)
  }

  // Check if user is admin
  const { data: clientUser } = await supabase
    .from('client_users')
    .select('client_id')
    .eq('email', user.email)
    .maybeSingle()

  if (!clientUser) {
    return response({ error: 'Geen toegang.' }, 403)
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const clientIdFilter = searchParams.get('clientId')
    const sourceType = searchParams.get('sourceType')
    const mediaFormat = searchParams.get('mediaFormat')
    const isSynthetic = searchParams.get('isSynthetic')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const admin = createClient()
    
    let query = admin
      .from('funda_descriptions')
      .select(`
        *,
        clients (
          id,
          company_name,
          contact_person
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (clientIdFilter) {
      query = query.eq('client_id', clientIdFilter)
    }

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    if (mediaFormat) {
      query = query.eq('media_format', mediaFormat)
    }

    if (isSynthetic !== null) {
      query = query.eq('is_synthetic', isSynthetic === 'true')
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', new Date(new Date(endDate).getTime() + 86400000).toISOString())
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching admin funda_descriptions:', error)
      return response({ error: 'Het ophalen van beschrijvingen is mislukt.' }, 500)
    }

    // Calculate statistics
    const totalTokens = (data || []).reduce((sum, desc) => sum + (desc.token_count || 0), 0)
    const totalCost = (data || []).reduce((sum, desc) => sum + (parseFloat(String(desc.cost_eur)) || 0), 0)
    const syntheticCount = (data || []).filter((desc) => desc.is_synthetic).length
    const manualCount = (data || []).filter((desc) => !desc.is_synthetic).length

    return response({
      descriptions: data,
      statistics: {
        total: count,
        totalTokens,
        totalCost,
        syntheticCount,
        manualCount,
      },
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('GET /api/admin/funda-descriptions error:', error)
    return response({ error: 'Er is een fout opgetreden.' }, 500)
  }
}
