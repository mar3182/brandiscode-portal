import { createAdminClient } from '@/lib/supabase/admin'
import { AiProvider } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { tool_id, provider } = await req.json()

    if (!tool_id || !provider) {
      return NextResponse.json({ error: 'tool_id and provider are required' }, { status: 400 })
    }

    // Validate provider
    const validProviders: AiProvider[] = ['openai', 'azure-openai', 'anthropic', 'github-models']
    if (!validProviders.includes(provider as AiProvider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    const admin = createAdminClient()
    const clientId = params.id

    // Get or create ClientAiSettings record
    const { data: existing, error: fetchError } = await admin
      .from('client_ai_settings')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existing) {
      // Update existing record
      const { error: updateError } = await admin
        .from('client_ai_settings')
        .update({ provider })
        .eq('client_id', clientId)

      if (updateError) throw updateError
    } else {
      // Create new record with defaults
      const { error: insertError } = await admin
        .from('client_ai_settings')
        .insert({
          client_id: clientId,
          provider,
          ai_mode: 'managed',
          warning_threshold: 80,
        })

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, provider })
  } catch (err: any) {
    console.error('[ai-provider POST]', err)
    return NextResponse.json({ error: err.message || 'Failed to update provider' }, { status: 500 })
  }
}
