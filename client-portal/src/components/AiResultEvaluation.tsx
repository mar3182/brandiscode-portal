'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Send } from 'lucide-react'
import type { MediaFormat } from '@/lib/types'

type ScoreField = 'factual_accuracy' | 'completeness' | 'leunis_style' | 'channel_fit' | 'activation' | 'readability'

type Props = {
  format: MediaFormat
  generationKey: string
  text: string
  inputSample: string
}

const CRITERIA: Array<{ key: ScoreField; label: string }> = [
  { key: 'factual_accuracy', label: 'Feitelijke juistheid' },
  { key: 'completeness', label: 'Volledigheid' },
  { key: 'leunis_style', label: 'Aansluiting op Leunis-stijl' },
  { key: 'channel_fit', label: 'Geschikt voor dit kanaal' },
  { key: 'activation', label: 'Activerend vermogen' },
  { key: 'readability', label: 'Leesbaarheid' },
]

export default function AiResultEvaluation({ format, generationKey, text, inputSample }: Props) {
  const [toolId, setToolId] = useState('')
  const [scores, setScores] = useState<Partial<Record<ScoreField, number>>>({})
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/client/ai-tools')
      .then((response) => response.ok ? response.json() : null)
      .then((data: { tools?: Array<{ id: string; slug: string }> } | null) => {
        const tool = data?.tools?.find((item) => item.slug === 'funda-tekst')
        if (tool) setToolId(tool.id)
      })
      .catch(() => setError('De evaluatie kan momenteel niet worden geladen.'))
  }, [])

  async function submit() {
    if (!toolId || CRITERIA.some(({ key }) => !scores[key])) {
      setError('Geef voor elk criterium een cijfer van 1 tot 5.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/client/ai-tool-evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_id: toolId,
          generation_key: generationKey,
          result_format: format,
          ...scores,
          comment: comment.trim() || null,
          generated_text_sample: text.slice(0, 1000),
          input_sample: inputSample.slice(0, 2000),
        }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Evaluatie opslaan is niet gelukt.')
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Evaluatie opslaan is niet gelukt.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300 flex items-center gap-2">
        <Check className="h-4 w-4" /> Bedankt voor je evaluatie.
      </div>
    )
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-white">Beoordeel deze tekst</h4>
        <p className="mt-1 text-xs text-white/45">Geef per onderdeel een cijfer. 1 = onvoldoende, 3 = acceptabel, 5 = uitstekend.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CRITERIA.map(({ key, label }) => (
          <label key={key} className="text-xs text-white/65">
            <span className="mb-1 block">{label}</span>
            <select
              value={scores[key] ?? ''}
              onChange={(event) => setScores((current) => ({ ...current, [key]: Number(event.target.value) }))}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-brand-blue/50 focus:outline-none"
            >
              <option value="" className="bg-slate-900">Kies cijfer</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value} className="bg-slate-900">{value}</option>)}
            </select>
          </label>
        ))}
      </div>
      {showComment && (
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Wat moeten we weten over deze tekst?"
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-blue/50 focus:outline-none"
        />
      )}
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setShowComment((current) => !current)} className="text-xs text-white/55 hover:text-white">
          {showComment ? 'Toelichting verbergen' : 'Toelichting toevoegen'}
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !toolId}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-blue/20 px-4 py-2 text-xs font-medium text-brand-blue border border-brand-blue/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Evaluatie opslaan
        </button>
      </div>
    </div>
  )
}
