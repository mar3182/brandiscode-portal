'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { AiTool, AiToolAccess } from '@/lib/types'

interface AiToolWithAccess extends AiTool {
  access_info?: AiToolAccess
  usage_this_month?: number
}

export default function AiToolsPage() {
  const params = useParams()
  const clientId = params?.clientId as string | undefined
  const basePath = clientId ? `/${clientId}/dashboard` : '/dashboard'
  const [tools, setTools] = useState<AiToolWithAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadTools() {
      try {
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Niet ingelogd')
          setLoading(false)
          return
        }

        const response = await fetch('/api/client/ai-tools', { cache: 'no-store' })
        const body = await response.json().catch(() => ({})) as { tools?: AiToolWithAccess[]; error?: string }
        if (!response.ok) throw new Error(body.error || 'Kon AI tools niet laden')
        setTools(body.tools ?? [])
      } catch (err: any) {
        console.error('Failed to load AI tools:', err)
        setError(err.message || 'Kon AI tools niet laden')
      } finally {
        setLoading(false)
      }
    }

    loadTools()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
          <p className="text-white/70">AI Tools laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Tools</h1>
        <p className="text-white/60">Genereer professionele content met AI</p>
      </div>

      {error && (
        <div className="glass-card border border-red-500/40 bg-red-500/10 p-4 flex gap-3">
          <AlertCircle className="text-red-400 shrink-0" size={20} />
          <div>
            <p className="text-red-200 text-sm font-medium">Fout</p>
            <p className="text-red-300/80 text-xs">{error}</p>
          </div>
        </div>
      )}

      {tools.length === 0 ? (
        <div className="glass-card border border-white/10 p-12 text-center">
          <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/60 mb-2">Geen AI tools beschikbaar</p>
          <p className="text-white/40 text-sm">Neem contact op met je account manager om toegang te krijgen tot AI tools.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`${basePath}/${tool.slug}`}
              className="group glass-card border border-white/10 hover:border-brand-orange/50 p-6 cursor-pointer transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white group-hover:text-brand-orange transition-colors">{tool.slug === 'funda-tekst' ? 'Woningbeschrijvingen' : tool.name}</h3>
                  <p className="text-xs text-white/40 mt-1">{tool.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    tool.status === 'production' ? 'bg-green-500/20 text-green-300' :
                    tool.status === 'beta' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {tool.status === 'production' ? 'Productie' : 'Beta'}
                  </span>
                </div>
              </div>

              {tool.description && (
                <p className="text-sm text-white/60 mb-4 line-clamp-2">{tool.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-white/40 group-hover:text-brand-orange transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span>Beschikbaar</span>
                </div>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>

              {tool.access_info && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/40">
                  <div className="flex justify-between">
                    <span>Toegangstype</span>
                    <span className="text-white/60">
                      {tool.access_info.access_type === 'testing' ? 'Testing' :
                       tool.access_info.access_type === 'beta' ? 'Beta' :
                       'Productie'}
                    </span>
                  </div>
                  {tool.access_info.monthly_token_limit && (
                    <div className="flex justify-between mt-1">
                      <span>Maandelijkse limiet</span>
                      <span className="text-white/60">{(tool.access_info.monthly_token_limit / 1000).toFixed(0)}k tokens</span>
                    </div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Direct link to Funda-tekst generator if available */}
      {tools.some(t => t.slug === 'funda-tekst') && (
        <div className="mt-8 glass-card border border-brand-orange/30 bg-brand-orange/5 p-6">
          <div className="flex items-start gap-4">
            <Sparkles className="text-brand-orange shrink-0 mt-1" size={24} />
            <div>
              <h4 className="text-white font-semibold mb-1">Woningbeschrijvingen</h4>
              <p className="text-white/60 text-sm mb-3">Genereer professionele woningbeschrijvingen voor Funda, Instagram, Facebook en brochures in slechts enkele seconden.</p>
              <Link
                href={`${basePath}/funda-tekst`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-orange text-white rounded-lg text-sm font-medium hover:bg-brand-orange/90 transition-colors"
              >
                Start Nu
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
