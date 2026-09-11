// /api/client/funda-descriptions
// POST: Save a generated Funda description
// GET: List client's saved descriptions

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveClientId } from '@/lib/ai-usage'

export const dynamic = 'force-dynamic'

interface ApiResponse {
  error?: string
  descriptions?: Array<Record<string, unknown>>
  total?: number
  page?: number
  limit?: number
  totalPages?: number
  id?: string
  message?: string
}

function response(payload: ApiResponse, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.email) {
    return response({ error: 'Niet ingelogd' }, 401)
  }

  const clientId = await resolveClientId(user.email)
  if (!clientId) {
    return response({ error: 'Je klanttoegang kon niet worden vastgesteld.' }, 403)
  }

  try {
    const body = await req.json()
    const {
      toolId,
      accessId,
      formData,
      generatedText,
      mediaFormat = 'funda',
      sourceType = 'manual',
      syntheticLabel,
      images = [],
      generationKey,
      tokenCount = 0,
      costEur = 0,
    } = body

    if (!toolId || !formData || !generatedText) {
      return response({ error: 'Ontbrekende verplichte velden: toolId, formData, generatedText' }, 400)
    }

    const admin = createClient()
    
    // Check if client has access to this tool
    const { data: access } = await admin
      .from('ai_tool_access')
      .select('id')
      .eq('tool_id', toolId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!access) {
      return response({ error: 'Je hebt geen toegang tot deze AI-tool.' }, 403)
    }

    // Save the description
    const { data, error } = await admin
      .from('funda_descriptions')
      .insert({
        client_id: clientId,
        tool_id: toolId,
        access_id: accessId || access.id,
        form_data: formData,
        generated_text: generatedText,
        media_format: mediaFormat,
        source_type: sourceType,
        synthetic_label: syntheticLabel || (sourceType === 'synthetic' ? '[FICTIEVE WONING - TESTDATA]' : null),
        images,
        generation_key: generationKey,
        token_count: tokenCount,
        cost_eur: costEur,
        is_synthetic: sourceType === 'synthetic',
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving funda_description:', error)
      return response({ error: 'Het opslaan van de beschrijving is mislukt.' }, 500)
    }

    return response({ id: data.id, message: 'Beschrijving opgeslagen.' })
  } catch (error) {
    console.error('POST /api/client/funda-descriptions error:', error)
    return response({ error: 'Er is een fout opgetreden.' }, 500)
  }
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

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sourceType = searchParams.get('sourceType') // 'manual', 'synthetic', or null for all
    const mediaFormat = searchParams.get('mediaFormat') // 'funda', 'instagram', etc.

    const admin = createClient()
    
    let query = admin
      .from('funda_descriptions')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    if (mediaFormat) {
      query = query.eq('media_format', mediaFormat)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching funda_descriptions:', error)
      return response({ error: 'Het ophalen van beschrijvingen is mislukt.' }, 500)
    }

    return response({
      descriptions: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('GET /api/client/funda-descriptions error:', error)
    return response({ error: 'Er is een fout opgetreden.' }, 500)
  }
}
