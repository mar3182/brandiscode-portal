'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Loader2, ShieldCheck } from 'lucide-react'
import type { MediaFormat } from '@/lib/types'

type CheckItem = { item?: string; status?: 'ok' | 'attention' | 'unknown'; note?: string }
type CheckResult = {
  overall_score: number
  verdict: string
  factual_checks: CheckItem[]
  strengths: string[]
  risks: string[]
  recommendations: string[]
}

type Props = {
  format: MediaFormat
  text: string
  inputSample: string
}

export default function AiTextCheck({ format, text, inputSample }: Props) {
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkText() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/ai/controleer-tekst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, format, input_sample: inputSample }),
      })
      const body = await response.json().catch(() => ({})) as { result?: CheckResult; error?: string }
      if (!response.ok || !body.result) throw new Error(body.error || 'De AI-controle kon niet worden uitgevoerd.')
      setResult(body.result)
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : 'De AI-controle kon niet worden uitgevoerd.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="h-4 w-4 text-brand-gold" /> Laat AI deze tekst controleren</h4>
          <p className="mt-1 text-xs text-white/45">Controle op feiten uit de invoer, verzonnen claims, volledigheid en makelaarskwaliteit in regio Tholen.</p>
        </div>
        <button type="button" onClick={() => void checkText()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-brand-gold/30 bg-brand-gold/15 px-3 py-2 text-xs font-medium text-brand-gold disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {result ? 'Opnieuw controleren' : 'Controleer tekst'}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-brand-gold/15 px-3 py-2 text-center"><div className="text-lg font-semibold text-brand-gold">{result.overall_score}/5</div><div className="text-[10px] text-white/45">indicatie</div></div>
            <p className="flex-1 text-sm leading-relaxed text-white/75">{result.verdict}</p>
          </div>
          {result.factual_checks.length > 0 && <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-white/45">Controlepunten</p>{result.factual_checks.map((item, index) => <div key={`${item.item}-${index}`} className="flex gap-2 text-xs"><span className={item.status === 'ok' ? 'text-green-300' : item.status === 'attention' ? 'text-red-300' : 'text-amber-300'}>{item.status === 'ok' ? <Check className="mt-0.5 h-3.5 w-3.5" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />}</span><span className="text-white/70"><strong>{item.item || 'Controlepunt'}:</strong> {item.note || 'Geen toelichting.'}</span></div>)}</div>}
          {result.risks.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wide text-red-300/80">Aandachtspunten</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-white/65">{result.risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul></div>}
          {result.recommendations.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Aanbevelingen</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-white/65">{result.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul></div>}
        </div>
      )}
    </div>
  )
}
