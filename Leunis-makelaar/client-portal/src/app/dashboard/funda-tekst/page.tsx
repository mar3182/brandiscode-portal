'use client'

import { useState, useRef } from 'react'
import { Sparkles, Loader2, Copy, Check, RotateCcw } from 'lucide-react'
import type { FundaTekstRequest, FundaTekstResponse } from '@/lib/types'

const INPUT_CLASS =
  'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 transition-all'
const SELECT_CLASS =
  'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all appearance-none'
const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-1.5'

const WONINGTYPES = [
  'Vrijstaande woning',
  'Tussenwoning',
  'Hoekwoning',
  '2-onder-1-kapwoning',
  'Appartement',
  'Boerderij',
  'Bungalow',
  'Anders',
]

const STAAT_OPTIONS = ['Instapklaar', 'Goed onderhouden', 'Gerenoveerd', 'Opknapper']

const PRESET_KENMERKEN = [
  'Monument',
  'Balkenplafond',
  'Tuin op het zuiden',
  'Garage',
  'Inpandige berging',
  'Dakkapel',
  'Zonnepanelen',
  'Vloerverwarming',
  'Open keuken',
  'Badkamer vernieuwd',
  'Vrijstaande schuur',
  'Dubbele beglazing',
  'Airco',
  'Laadpaal',
]

type Lengte = 'kort' | 'normaal' | 'uitgebreid'

const LENGTE_OPTIONS: { value: Lengte; label: string; desc: string }[] = [
  { value: 'kort', label: 'Kort', desc: '~200 woorden' },
  { value: 'normaal', label: 'Normaal', desc: '~400 woorden' },
  { value: 'uitgebreid', label: 'Uitgebreid', desc: '~600 woorden' },
]

interface FormState {
  woningtype: string
  adres: string
  bouwjaar: string
  woonoppervlakte: string
  perceeloppervlakte: string
  kamers: string
  slaapkamers: string
  ligging: string
  staat: string
  bijzonderheden: string
  lengte: Lengte
}

const initialForm: FormState = {
  woningtype: 'Vrijstaande woning',
  adres: '',
  bouwjaar: '',
  woonoppervlakte: '',
  perceeloppervlakte: '',
  kamers: '',
  slaapkamers: '',
  ligging: '',
  staat: 'Instapklaar',
  bijzonderheden: '',
  lengte: 'normaal',
}

export default function FundaTekstPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [kenmerken, setKenmerken] = useState<string[]>([])
  const [nieuweKenmerk, setNieuweKenmerk] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'adres' | 'ligging', string>>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FundaTekstResponse | null>(null)
  const [apiError, setApiError] = useState('')
  const [copied, setCopied] = useState(false)
  const lastRequestRef = useRef<FundaTekstRequest | null>(null)

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'adres' || field === 'ligging') {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function toggleKenmerk(k: string) {
    setKenmerken((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    )
  }

  function addNieuweKenmerk() {
    const trimmed = nieuweKenmerk.trim()
    if (trimmed && !kenmerken.includes(trimmed)) {
      setKenmerken((prev) => [...prev, trimmed])
    }
    setNieuweKenmerk('')
  }

  function validate(): boolean {
    const newErrors: Partial<Record<'adres' | 'ligging', string>> = {}
    if (!form.adres.trim()) newErrors.adres = 'Adres is verplicht'
    if (!form.ligging.trim()) newErrors.ligging = 'Ligging is verplicht'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleGenerate(request?: FundaTekstRequest) {
    if (!request) {
      if (!validate()) return
      request = {
        woningtype: form.woningtype,
        adres: form.adres.trim(),
        bouwjaar: form.bouwjaar || undefined,
        woonoppervlakte: form.woonoppervlakte || undefined,
        perceeloppervlakte: form.perceeloppervlakte || undefined,
        kamers: form.kamers || undefined,
        slaapkamers: form.slaapkamers || undefined,
        ligging: form.ligging.trim(),
        kenmerken,
        staat: form.staat,
        bijzonderheden: form.bijzonderheden || undefined,
        lengte: form.lengte,
      }
    }

    lastRequestRef.current = request
    setLoading(true)
    setApiError('')
    setResult(null)

    try {
      const res = await fetch('/api/ai/funda-tekst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Er is een fout opgetreden')
      }

      const data: FundaTekstResponse = await res.json()
      setResult(data)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result.tekst)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpnieuw() {
    if (lastRequestRef.current) {
      handleGenerate(lastRequestRef.current)
    }
  }

  return (
    <div className="min-h-screen p-4 pt-16 md:pt-8 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30">
            <Sparkles className="w-5 h-5 text-brand-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white">Funda-tekst Generator</h1>
        </div>
        <p className="text-white/50 text-sm ml-14">
          Genereer professionele woningbeschrijvingen in de stijl van Leunis Makelaars
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Form */}
        <div className="space-y-6">
          {/* Sectie 1: Woning basisinfo */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Woning basisinfo
            </h2>
            <div className="space-y-4">
              {/* Woningtype */}
              <div>
                <label className={LABEL_CLASS}>Woningtype</label>
                <div className="relative">
                  <select
                    className={SELECT_CLASS}
                    value={form.woningtype}
                    onChange={(e) => updateForm('woningtype', e.target.value)}
                  >
                    {WONINGTYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#1B2A4A]">
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Adres */}
              <div>
                <label className={LABEL_CLASS}>
                  Adres <span className="text-brand-gold">*</span>
                </label>
                <input
                  type="text"
                  className={`${INPUT_CLASS} ${errors.adres ? 'border-red-500/60' : ''}`}
                  placeholder="bijv. Hoogstraat 5, Tholen"
                  value={form.adres}
                  onChange={(e) => updateForm('adres', e.target.value)}
                />
                {errors.adres && (
                  <p className="mt-1 text-xs text-red-400">{errors.adres}</p>
                )}
              </div>

              {/* Row: Bouwjaar + Kamers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Bouwjaar</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder="bijv. 1978"
                    value={form.bouwjaar}
                    onChange={(e) => updateForm('bouwjaar', e.target.value)}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Kamers</label>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder="bijv. 5"
                    value={form.kamers}
                    onChange={(e) => updateForm('kamers', e.target.value)}
                  />
                </div>
              </div>

              {/* Row: Woonoppervlakte + Perceeloppervlakte */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Woonoppervlakte</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="bijv. 120"
                      value={form.woonoppervlakte}
                      onChange={(e) => updateForm('woonoppervlakte', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                      m²
                    </span>
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Perceeloppervlakte</label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`${INPUT_CLASS} pr-10`}
                      placeholder="bijv. 250"
                      value={form.perceeloppervlakte}
                      onChange={(e) => updateForm('perceeloppervlakte', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                      m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Slaapkamers */}
              <div>
                <label className={LABEL_CLASS}>Slaapkamers</label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="bijv. 3"
                  value={form.slaapkamers}
                  onChange={(e) => updateForm('slaapkamers', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sectie 2: Ligging & kenmerken */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Ligging &amp; kenmerken
            </h2>
            <div className="space-y-4">
              {/* Ligging */}
              <div>
                <label className={LABEL_CLASS}>
                  Ligging <span className="text-brand-gold">*</span>
                </label>
                <input
                  type="text"
                  className={`${INPUT_CLASS} ${errors.ligging ? 'border-red-500/60' : ''}`}
                  placeholder="bijv. centrum Tholen, aan park, rustige weg"
                  value={form.ligging}
                  onChange={(e) => updateForm('ligging', e.target.value)}
                />
                {errors.ligging && (
                  <p className="mt-1 text-xs text-red-400">{errors.ligging}</p>
                )}
              </div>

              {/* Staat */}
              <div>
                <label className={LABEL_CLASS}>
                  Staat <span className="text-brand-gold">*</span>
                </label>
                <div className="relative">
                  <select
                    className={SELECT_CLASS}
                    value={form.staat}
                    onChange={(e) => updateForm('staat', e.target.value)}
                  >
                    {STAAT_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-[#1B2A4A]">
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Kenmerken pills */}
              <div>
                <label className={LABEL_CLASS}>Kenmerken</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_KENMERKEN.map((k) => {
                    const active = kenmerken.includes(k)
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleKenmerk(k)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          active
                            ? 'bg-brand-blue/30 border-brand-blue/60 text-brand-blue'
                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                        }`}
                      >
                        {k}
                      </button>
                    )
                  })}
                  {/* Custom kenmerken */}
                  {kenmerken
                    .filter((k) => !PRESET_KENMERKEN.includes(k))
                    .map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleKenmerk(k)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-brand-gold/20 border-brand-gold/40 text-brand-gold"
                      >
                        {k} ×
                      </button>
                    ))}
                </div>
                {/* Vrij invulveld */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={`${INPUT_CLASS} text-sm`}
                    placeholder="Voeg kenmerk toe..."
                    value={nieuweKenmerk}
                    onChange={(e) => setNieuweKenmerk(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addNieuweKenmerk()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addNieuweKenmerk}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm whitespace-nowrap"
                  >
                    + Voeg toe
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sectie 3: Extra info */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Extra informatie
            </h2>
            <div>
              <label className={LABEL_CLASS}>Bijzonderheden</label>
              <textarea
                className={`${INPUT_CLASS} min-h-[100px] resize-y`}
                placeholder="Vertel extra details die de tekst bijzonder maken..."
                value={form.bijzonderheden}
                onChange={(e) => updateForm('bijzonderheden', e.target.value)}
              />
            </div>
          </div>

          {/* Sectie 4: Lengte */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">
              Tekstlengte
            </h2>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              {LENGTE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateForm('lengte', opt.value)}
                  className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all text-center ${
                    form.lengte === opt.value
                      ? 'bg-brand-blue/20 border-brand-blue/50 text-brand-blue'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/70'
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs font-normal opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Genereer knop */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-brand-blue text-white font-semibold text-base flex items-center justify-center gap-3 hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-blue/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Bezig met schrijven...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Genereer tekst
              </>
            )}
          </button>
        </div>

        {/* RIGHT — Output */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {/* API Error */}
          {apiError && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {apiError}
            </div>
          )}

          {/* Loading shimmer */}
          {loading && !result && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {[100, 90, 95, 80, 85, 70, 90, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 bg-white/10 rounded animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {[88, 75, 92, 65].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 bg-white/10 rounded animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && !apiError && (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                <Sparkles className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/30 text-sm">
                Jouw gegenereerde tekst verschijnt hier...
              </p>
              <p className="text-white/20 text-xs mt-2">
                Vul het formulier in en klik op &ldquo;Genereer tekst&rdquo;
              </p>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="glass-card p-6 rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70">Gegenereerde tekst</h3>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
                  ~{result.woorden} woorden
                </span>
              </div>

              {/* Tekst */}
              <div className="prose prose-sm prose-invert max-w-none">
                {result.tekst.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-white/85 leading-relaxed text-sm mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-medium hover:bg-brand-blue/30 transition-all flex-1 justify-center"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Gekopieerd! ✓
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Kopieer tekst
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleOpnieuw}
                  disabled={loading}
                  aria-label="Opnieuw genereren"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Opnieuw</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
