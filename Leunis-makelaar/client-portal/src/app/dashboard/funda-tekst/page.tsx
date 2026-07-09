'use client'

import { useEffect, useState, useRef } from 'react'
import { Sparkles, Loader2, Copy, Check, RotateCcw, Upload, X, Pen } from 'lucide-react'
import type { FundaTekstRequest, FundaTekstResponse, FundaMultiResponse, MediaFormat } from '@/lib/types'

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

const MEDIA_TABS: Array<{ id: MediaFormat; label: string; hint: string }> = [
  { id: 'funda', label: 'Funda', hint: '~400w' },
  { id: 'instagram', label: 'Instagram', hint: '~120w + #' },
  { id: 'facebook', label: 'Facebook', hint: '~180w' },
  { id: 'brochure', label: 'Brochure', hint: 'Print' },
]

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
])

const AUTO_CONVERT_IMAGE_MIME_TYPES = new Set(['image/heic', 'image/heif'])
const PROMPT_ADDITION_STORAGE_KEY = 'funda-agent-prompt-addition'
const PROMPT_ADDITION_MAX_CHARS = 800

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
  const [images, setImages] = useState<string[]>([])
  const [imageNames, setImageNames] = useState<string[]>([])
  const [imageError, setImageError] = useState('')
  const [multiResult, setMultiResult] = useState<FundaMultiResponse | null>(null)
  const [activeTab, setActiveTab] = useState<MediaFormat>('funda')
  const [verfijnInput, setVerfijnInput] = useState('')
  const [verfijnLoading, setVerfijnLoading] = useState(false)
  const [copiedTab, setCopiedTab] = useState<MediaFormat | null>(null)
  const [verfijnSuccess, setVerfijnSuccess] = useState(false)
  const [promptAdditionDraft, setPromptAdditionDraft] = useState('')
  const [savedPromptAddition, setSavedPromptAddition] = useState('')
  const [promptNotice, setPromptNotice] = useState('')
  const [applyVerfijnToFuture, setApplyVerfijnToFuture] = useState(false)
  const lastRequestRef = useRef<FundaTekstRequest | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(PROMPT_ADDITION_STORAGE_KEY) ?? ''
    const normalized = normalizePromptAddition(saved)
    setSavedPromptAddition(normalized)
    setPromptAdditionDraft(normalized)
  }, [])

  function normalizePromptAddition(value: string): string {
    return value.trim().slice(0, PROMPT_ADDITION_MAX_CHARS)
  }

  function setPromptNoticeMessage(message: string) {
    setPromptNotice(message)
    setTimeout(() => setPromptNotice(''), 3000)
  }

  function savePromptAddition(value: string) {
    const normalized = normalizePromptAddition(value)
    setSavedPromptAddition(normalized)
    setPromptAdditionDraft(normalized)
    if (normalized) {
      localStorage.setItem(PROMPT_ADDITION_STORAGE_KEY, normalized)
      setPromptNoticeMessage('Standaard prompt-uitbreiding opgeslagen.')
      return
    }
    localStorage.removeItem(PROMPT_ADDITION_STORAGE_KEY)
    setPromptNoticeMessage('Standaard prompt-uitbreiding verwijderd.')
  }

  function mergePromptAddition(existing: string, addition: string): string {
    const cleanExisting = normalizePromptAddition(existing)
    const cleanAddition = normalizePromptAddition(addition)
    if (!cleanAddition) return cleanExisting
    if (!cleanExisting) return cleanAddition
    if (cleanExisting.includes(cleanAddition)) return cleanExisting
    return normalizePromptAddition(`${cleanExisting}\n${cleanAddition}`)
  }

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
        images: images.length > 0 ? images : undefined,
        prompt_addition: savedPromptAddition || undefined,
      }
    }

    lastRequestRef.current = request
    setLoading(true)
    setApiError('')
    setResult(null)
    setMultiResult(null)

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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(img)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Afbeelding kon niet worden geladen voor conversie'))
      }
      img.src = objectUrl
    })
  }

  async function convertToJpeg(file: File): Promise<File> {
    const image = await loadImageFromFile(file)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context is niet beschikbaar')
    }

    ctx.drawImage(image, 0, 0)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('Conversie naar JPEG is mislukt'))
        },
        'image/jpeg',
        0.9
      )
    })

    const basename = file.name.replace(/\.[^.]+$/, '')
    return new File([blob], `${basename}.jpg`, { type: 'image/jpeg' })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError('')
    const files = Array.from(e.target.files || [])
    const remaining = 4 - images.length
    const toProcess = files.slice(0, remaining)
    let tooLargeCount = 0
    let unsupportedCount = 0
    let convertedCount = 0
    let conversionFailedCount = 0

    const validFiles: File[] = []

    for (const file of toProcess) {
      if (file.size > 4 * 1024 * 1024) {
        tooLargeCount += 1
        continue
      }

      const type = (file.type || '').toLowerCase()

      if (SUPPORTED_IMAGE_MIME_TYPES.has(type)) {
        validFiles.push(file)
        continue
      }

      if (AUTO_CONVERT_IMAGE_MIME_TYPES.has(type)) {
        try {
          const converted = await convertToJpeg(file)
          if (converted.size > 4 * 1024 * 1024) {
            tooLargeCount += 1
            continue
          }
          validFiles.push(converted)
          convertedCount += 1
          continue
        } catch {
          conversionFailedCount += 1
          continue
        }
      }

      unsupportedCount += 1
    }

    const errorParts: string[] = []
    if (tooLargeCount > 0) {
      errorParts.push('Sommige afbeeldingen zijn groter dan 4MB en zijn overgeslagen.')
    }
    if (unsupportedCount > 0) {
      errorParts.push('Alleen JPEG, PNG, GIF, WebP en HEIC/HEIF worden geaccepteerd.')
    }
    if (conversionFailedCount > 0) {
      errorParts.push('HEIC/HEIF kon in deze browser niet automatisch worden omgezet naar JPEG.')
    }
    if (convertedCount > 0) {
      errorParts.push(`${convertedCount} HEIC/HEIF afbeelding(en) automatisch omgezet naar JPEG.`)
    }
    if (errorParts.length > 0) setImageError(errorParts.join(' '))

    if (validFiles.length === 0) {
      e.target.value = ''
      return
    }

    const base64s = await Promise.all(validFiles.map(fileToBase64))
    setImages((prev) => [...prev, ...base64s])
    setImageNames((prev) => [...prev, ...validFiles.map((f) => f.name)])
    e.target.value = ''
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageNames((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleGenerateAll() {
    if (!validate()) return
    const request: FundaTekstRequest = {
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
      images: images.length > 0 ? images : undefined,
      prompt_addition: savedPromptAddition || undefined,
    }
    lastRequestRef.current = request
    setLoading(true)
    setApiError('')
    setResult(null)
    setMultiResult(null)
    setActiveTab('funda')
    setVerfijnInput('')
    try {
      const res = await fetch('/api/ai/funda-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Er is een fout opgetreden')
      }
      const data: FundaMultiResponse = await res.json()
      setMultiResult(data)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerfijn() {
    const currentTekst = multiResult ? multiResult[activeTab] : result?.tekst
    if (!currentTekst || !verfijnInput.trim()) return
    const refinementInstruction = verfijnInput.trim()
    setVerfijnLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/ai/verfijn-tekst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tekst: currentTekst,
          instructie: refinementInstruction,
          format: multiResult ? activeTab : 'funda',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Verfijn mislukt')
      }
      const data = await res.json() as { tekst: string }
      if (multiResult) {
        setMultiResult((prev) => (prev ? { ...prev, [activeTab]: data.tekst } : null))
      } else {
        setResult((prev) =>
          prev ? { ...prev, tekst: data.tekst, woorden: data.tekst.split(/\s+/).filter(Boolean).length } : null
        )
      }
      setVerfijnInput('')

      if (applyVerfijnToFuture) {
        const merged = mergePromptAddition(savedPromptAddition, refinementInstruction)
        savePromptAddition(merged)
      }

      setVerfijnSuccess(true)
      setTimeout(() => setVerfijnSuccess(false), 3000)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Verfijn mislukt')
    } finally {
      setVerfijnLoading(false)
    }
  }

  async function handleCopyTab(format: MediaFormat, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedTab(format)
    setTimeout(() => setCopiedTab(null), 2000)
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

          {/* Sectie 4: Foto's & Plattegrond */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
              Foto&apos;s &amp; Plattegrond
              <span className="ml-2 text-xs font-normal text-white/40 normal-case">optioneel</span>
            </h2>
            <p className="text-xs text-white/40 mb-4">
              Upload foto&apos;s of een plattegrond. De AI analyseert deze voor een nauwkeurige kamer-voor-kamer beschrijving. Zonder foto&apos;s schrijft de AI een algemene sfeervolle tekst.
            </p>

            {images.length < 4 && (
              <label className="block w-full cursor-pointer">
                <div className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-blue/40 hover:bg-white/5 transition-all">
                  <Upload className="w-5 h-5 text-white/30" />
                  <span className="text-sm text-white/40">Klik om foto&apos;s te uploaden</span>
                  <span className="text-xs text-white/25">JPEG, PNG, GIF, WebP + HEIC/HEIF auto-conversie — max 4MB per afbeelding, max 4 stuks</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}

            {imageError && (
              <p className="mt-2 text-xs text-red-400">{imageError}</p>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {images.map((src, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={imageNames[i]} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Verwijder afbeelding"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sectie 5: Lengte */}
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

          {/* Sectie 6: Agent prompt-uitbreiding */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
              Agent prompt-uitbreiding
            </h2>
            <p className="text-xs text-white/40 mb-3">
              Je kunt de agent veilig uitbreiden met extra stijlregels. De basisprompt blijft altijd beschermd en kan niet worden overschreven.
            </p>
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-200/90 text-xs">
              Waarschuwing: extra instructies kunnen de toon, structuur en reacties van de output veranderen.
            </div>

            <textarea
              className={`${INPUT_CLASS} min-h-[92px] resize-y text-sm`}
              value={promptAdditionDraft}
              onChange={(e) => setPromptAdditionDraft(e.target.value.slice(0, PROMPT_ADDITION_MAX_CHARS))}
              placeholder="Bijv. Spreek de lezer direct aan met je/u en schrijf persoonlijker, zonder feiten toe te voegen."
            />
            <div className="flex items-center justify-between mt-2 text-xs text-white/35">
              <span>{promptAdditionDraft.length}/{PROMPT_ADDITION_MAX_CHARS}</span>
              {savedPromptAddition && <span className="text-green-300/90">Standaard actief</span>}
            </div>

            {promptNotice && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
                {promptNotice}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => savePromptAddition(promptAdditionDraft)}
                className="px-4 py-2 rounded-xl bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-xs font-medium hover:bg-brand-blue/30 transition-all"
              >
                Opslaan als standaard
              </button>
              <button
                type="button"
                onClick={() => savePromptAddition('')}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
              >
                Resetten
              </button>
            </div>
          </div>

          {/* Genereer knoppen */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={loading}
              className="py-4 px-4 rounded-2xl bg-brand-blue text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-blue/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Funda tekst
            </button>
            <button
              type="button"
              onClick={handleGenerateAll}
              disabled={loading}
              className="py-4 px-4 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 text-brand-gold font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-gold/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Alle formats
            </button>
          </div>
        </div>

        {/* RIGHT — Output */}
        <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
          {/* API Error */}
          {apiError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {apiError}
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {[100, 90, 95, 80, 85, 70, 90, 60].map((w, i) => (
                  <div key={i} className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="mt-6 space-y-3">
                {[88, 75, 92, 65].map((w, i) => (
                  <div key={i} className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !result && !multiResult && !apiError && (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                <Sparkles className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/30 text-sm">Jouw gegenereerde tekst verschijnt hier...</p>
              <p className="text-white/20 text-xs mt-2">
                Klik op &ldquo;Funda tekst&rdquo; of &ldquo;Alle formats&rdquo;
              </p>
            </div>
          )}

          {/* Single Funda result */}
          {result && !loading && !multiResult && (
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/70">Funda tekst</h3>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
                  ~{result.woorden} woorden
                </span>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                {result.tekst.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-white/85 leading-relaxed text-sm mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-medium hover:bg-brand-blue/30 transition-all flex-1 justify-center"
                >
                  {copied ? <><Check className="w-4 h-4" /> Gekopieerd! ✓</> : <><Copy className="w-4 h-4" /> Kopieer</>}
                </button>
                <button
                  type="button"
                  onClick={handleOpnieuw}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Opnieuw</span>
                </button>
              </div>
              {/* Verfijn */}
              <div className="mt-4 pt-4 border-t border-white/10">
                {verfijnSuccess && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                    <Check className="w-3 h-3" /> Tekst bijgewerkt!
                  </div>
                )}
                <p className="text-xs font-medium text-white/40 mb-2 flex items-center gap-1.5">
                  <Pen className="w-3 h-3" /> Verfijn met AI
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verfijnInput}
                    onChange={(e) => setVerfijnInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !verfijnLoading) void handleVerfijn() }}
                    placeholder="bijv. maak de opening sfeervoller..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-white/20 focus:outline-none focus:border-brand-blue/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerfijn()}
                    disabled={verfijnLoading || !verfijnInput.trim()}
                    className="px-4 py-2 bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-xs font-medium rounded-xl hover:bg-brand-gold/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                  >
                    {verfijnLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pen className="w-3 h-3" />}
                    Verfijn
                  </button>
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-white/45">
                  <input
                    type="checkbox"
                    checked={applyVerfijnToFuture}
                    onChange={(e) => setApplyVerfijnToFuture(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-brand-blue focus:ring-brand-blue/40"
                  />
                  Deze verfijn-instructie ook als standaard toepassen op toekomstige creaties
                </label>
              </div>
            </div>
          )}

          {/* Multi-format result — tabs */}
          {multiResult && !loading && (
            <div className="glass-card p-6 rounded-2xl">
              {/* Tab bar */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 mb-5">
                {MEDIA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setVerfijnInput('') }}
                    className={`flex-1 py-2 px-1 rounded-lg transition-all text-center ${
                      activeTab === tab.id
                        ? 'bg-brand-blue/30 text-brand-blue border border-brand-blue/40'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <div className="text-xs font-medium">{tab.label}</div>
                    <div className="text-[10px] opacity-60 hidden sm:block">{tab.hint}</div>
                  </button>
                ))}
              </div>

              {/* Actieve tab tekst */}
              <div className={`prose prose-sm prose-invert max-w-none min-h-[180px] transition-opacity ${verfijnLoading ? 'opacity-40' : 'opacity-100'}`}>
                {multiResult[activeTab].split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-white/85 leading-relaxed text-sm mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Acties */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => void handleCopyTab(activeTab, multiResult[activeTab])}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-medium hover:bg-brand-blue/30 transition-all flex-1 justify-center"
                >
                  {copiedTab === activeTab
                    ? <><Check className="w-4 h-4" /> Gekopieerd! ✓</>
                    : <><Copy className="w-4 h-4" /> Kopieer {MEDIA_TABS.find(t => t.id === activeTab)?.label}</>}
                </button>
                <button
                  type="button"
                  onClick={handleOpnieuw}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/10 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Opnieuw</span>
                </button>
              </div>

              {/* Verfijn */}
              <div className="mt-4 pt-4 border-t border-white/10">
                {verfijnSuccess && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2">
                    <Check className="w-3 h-3" /> Tekst bijgewerkt!
                  </div>
                )}
                <p className="text-xs font-medium text-white/40 mb-2 flex items-center gap-1.5">
                  <Pen className="w-3 h-3" /> Verfijn de {MEDIA_TABS.find(t => t.id === activeTab)?.label} tekst met AI
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verfijnInput}
                    onChange={(e) => setVerfijnInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !verfijnLoading) void handleVerfijn() }}
                    placeholder="bijv. voeg meer nadruk op de ligging toe..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-white/20 focus:outline-none focus:border-brand-blue/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerfijn()}
                    disabled={verfijnLoading || !verfijnInput.trim()}
                    className="px-4 py-2 bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-xs font-medium rounded-xl hover:bg-brand-gold/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                  >
                    {verfijnLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pen className="w-3 h-3" />}
                    Verfijn
                  </button>
                </div>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-white/45">
                  <input
                    type="checkbox"
                    checked={applyVerfijnToFuture}
                    onChange={(e) => setApplyVerfijnToFuture(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-brand-blue focus:ring-brand-blue/40"
                  />
                  Deze verfijn-instructie ook als standaard toepassen op toekomstige creaties
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
