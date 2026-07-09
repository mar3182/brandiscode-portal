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
type Prijsklasse = 'onbekend' | 'starter' | 'midden' | 'hoog' | 'luxe'
type WoningtypeTag =
  | 'vrijstaande-woning'
  | 'tussenwoning'
  | 'hoekwoning'
  | '2-onder-1-kapwoning'
  | 'appartement'
  | 'boerderij'
  | 'bungalow'
  | 'anders'
type LocatieTag = 'centrum' | 'rustig' | 'water' | 'landelijk' | 'nieuwbouw'

const LENGTE_OPTIONS: { value: Lengte; label: string; desc: string }[] = [
  { value: 'kort', label: 'Kort', desc: '~200 woorden' },
  { value: 'normaal', label: 'Normaal', desc: '~400 woorden' },
  { value: 'uitgebreid', label: 'Uitgebreid', desc: '~600 woorden' },
]

const PRIJSKLASSE_OPTIONS: { value: Prijsklasse; label: string }[] = [
  { value: 'onbekend', label: 'Onbekend / niet opgegeven' },
  { value: 'starter', label: 'Starter / betaalbaar' },
  { value: 'midden', label: 'Middenklasse' },
  { value: 'hoog', label: 'Hoger segment' },
  { value: 'luxe', label: 'Luxe segment' },
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
const PROMPT_EXTENSION_STORAGE_KEY = 'funda-agent-prompt-extensions-v1'
const PROMPT_ADDITION_STORAGE_KEY = 'funda-agent-prompt-addition'
const PROMPT_EXTENSION_MAX_CHARS = 320
const PROMPT_ADDITION_MAX_CHARS = 800
const DEFAULT_PROMPT_EXTENSIONS = [
  'Spreek de lezer direct aan met je/u en houd die aanspreekvorm consequent door de hele tekst.',
  'Schrijf warm, persoonlijk en belevingsgericht, maar blijf feitelijk en noem geen kenmerken die niet zijn opgegeven.',
  'Start met een uitnodigende openingszin over sfeer en locatie, en sluit af met een duidelijke uitnodiging voor bezichtiging.',
]

type PromptGalleryItem = {
  id: string
  title: string
  subtitle: string
  prompt: string
  woningtypes: Array<WoningtypeTag>
  locaties: Array<LocatieTag>
  prijsklasses: Array<Prijsklasse>
}

const PROMPT_GALLERY_ITEMS: PromptGalleryItem[] = [
  {
    id: 'persoonlijk-direct',
    title: 'Persoonlijk en direct',
    subtitle: 'Meer menselijk contact',
    prompt: 'Spreek de lezer direct aan met je/u, maak de toon persoonlijker en laat elke alinea voelen alsof een makelaar de woning zelf laat zien.',
    woningtypes: ['vrijstaande-woning', 'tussenwoning', 'hoekwoning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow', 'anders'],
    locaties: ['centrum', 'rustig', 'water', 'landelijk', 'nieuwbouw'],
    prijsklasses: ['starter', 'midden', 'hoog', 'luxe', 'onbekend'],
  },
  {
    id: 'sfeer-locatie',
    title: 'Sfeer en locatie sterker',
    subtitle: 'Opening met beleving',
    prompt: 'Geef de opening meer sfeer en locatiegevoel met een warme, beeldende eerste zin, zonder extra feiten toe te voegen.',
    woningtypes: ['vrijstaande-woning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow'],
    locaties: ['centrum', 'water', 'landelijk', 'rustig'],
    prijsklasses: ['midden', 'hoog', 'luxe', 'onbekend'],
  },
  {
    id: 'heldere-structuur',
    title: 'Heldere structuur',
    subtitle: 'Beter scanbaar',
    prompt: 'Maak de tekst strakker en beter scanbaar met korte alinea\'s en duidelijke opbouw: opening, woning, ligging, afsluiting.',
    woningtypes: ['vrijstaande-woning', 'tussenwoning', 'hoekwoning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow', 'anders'],
    locaties: ['centrum', 'rustig', 'water', 'landelijk', 'nieuwbouw'],
    prijsklasses: ['starter', 'midden', 'hoog', 'luxe', 'onbekend'],
  },
  {
    id: 'bezichtiging-cta',
    title: 'Sterkere bezichtigings-CTA',
    subtitle: 'Meer actiegericht',
    prompt: 'Laat de slotalinea overtuigender uitnodigen tot bezichtiging met een concrete en vriendelijke call-to-action.',
    woningtypes: ['vrijstaande-woning', 'tussenwoning', 'hoekwoning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow', 'anders'],
    locaties: ['centrum', 'rustig', 'water', 'landelijk', 'nieuwbouw'],
    prijsklasses: ['starter', 'midden', 'hoog', 'luxe', 'onbekend'],
  },
  {
    id: 'brochure-zakelijk',
    title: 'Zakelijk brochuretoon',
    subtitle: 'Neutraal en professioneel',
    prompt: 'Herschrijf in een zakelijke, neutrale brochurestijl met feitelijke formuleringen en zonder overdreven marketingtaal.',
    woningtypes: ['vrijstaande-woning', 'tussenwoning', 'hoekwoning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow', 'anders'],
    locaties: ['centrum', 'rustig', 'water', 'landelijk', 'nieuwbouw'],
    prijsklasses: ['starter', 'midden', 'hoog', 'luxe', 'onbekend'],
  },
  {
    id: 'starter-compact',
    title: 'Starterproof en compact',
    subtitle: 'Betaalbare woningen',
    prompt: 'Benadruk praktische indeling, betaalbaarheid en direct bruikbare leefruimte voor starters, met een toegankelijke en enthousiaste toon.',
    woningtypes: ['tussenwoning', 'hoekwoning', 'appartement'],
    locaties: ['centrum', 'nieuwbouw', 'rustig'],
    prijsklasses: ['starter', 'midden'],
  },
  {
    id: 'luxe-exclusief',
    title: 'Exclusief en verfijnd',
    subtitle: 'Hoger en luxe segment',
    prompt: 'Gebruik een premium, elegante toon met nadruk op kwaliteit, afwerking en exclusieve woonbeleving, zonder overdrijving.',
    woningtypes: ['vrijstaande-woning', '2-onder-1-kapwoning', 'boerderij', 'bungalow'],
    locaties: ['water', 'landelijk', 'rustig'],
    prijsklasses: ['hoog', 'luxe'],
  },
  {
    id: 'water-buitenleven',
    title: 'Buitenleven en water',
    subtitle: 'Natuur/ligging centraal',
    prompt: 'Leg extra nadruk op buitenruimte, rust, natuur en eventuele ligging aan of nabij water in een beeldende stijl.',
    woningtypes: ['vrijstaande-woning', '2-onder-1-kapwoning', 'appartement', 'boerderij', 'bungalow'],
    locaties: ['water', 'landelijk', 'rustig'],
    prijsklasses: ['midden', 'hoog', 'luxe', 'onbekend'],
  },
]

type PromptExtensionItem = {
  id: string
  text: string
  enabled: boolean
}

interface FormState {
  woningtype: string
  adres: string
  bouwjaar: string
  woonoppervlakte: string
  perceeloppervlakte: string
  kamers: string
  slaapkamers: string
  prijsklasse: Prijsklasse
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
  prijsklasse: 'onbekend',
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
  const [promptExtensionDraft, setPromptExtensionDraft] = useState('')
  const [promptExtensions, setPromptExtensions] = useState<PromptExtensionItem[]>([])
  const [promptNotice, setPromptNotice] = useState('')
  const [applyVerfijnToFuture, setApplyVerfijnToFuture] = useState(false)
  const [showRelevantOnly, setShowRelevantOnly] = useState(false)
  const lastRequestRef = useRef<FundaTekstRequest | null>(null)

  useEffect(() => {
    const savedJson = localStorage.getItem(PROMPT_EXTENSION_STORAGE_KEY)
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson) as PromptExtensionItem[]
        const normalizedItems = parsed
          .filter((item) => item && typeof item.id === 'string' && typeof item.text === 'string')
          .map((item) => ({
            id: item.id,
            text: normalizePromptExtensionText(item.text),
            enabled: Boolean(item.enabled),
          }))
          .filter((item) => item.text)

        setPromptExtensions(normalizedItems)
        return
      } catch {
        // Fallback to legacy key below.
      }
    }

    const legacy = normalizePromptExtensionText(localStorage.getItem(PROMPT_ADDITION_STORAGE_KEY) ?? '')
    if (legacy) {
      setPromptExtensions([{ id: crypto.randomUUID(), text: legacy, enabled: true }])
      localStorage.removeItem(PROMPT_ADDITION_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PROMPT_EXTENSION_STORAGE_KEY, JSON.stringify(promptExtensions))
  }, [promptExtensions])

  function normalizePromptExtensionText(value: string): string {
    return value.trim().slice(0, PROMPT_EXTENSION_MAX_CHARS)
  }

  function buildPromptAdditionFromList(items: PromptExtensionItem[]): string {
    return items
      .filter((item) => item.enabled)
      .map((item) => `- ${item.text}`)
      .join('\n')
      .slice(0, PROMPT_ADDITION_MAX_CHARS)
  }

  function setPromptNoticeMessage(message: string) {
    setPromptNotice(message)
    setTimeout(() => setPromptNotice(''), 3000)
  }

  function addPromptExtension(text: string) {
    const normalized = normalizePromptExtensionText(text)
    if (!normalized) return

    setPromptExtensions((prev) => {
      const existing = prev.find((item) => item.text.toLowerCase() === normalized.toLowerCase())
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, enabled: true } : item
        )
      }
      return [{ id: crypto.randomUUID(), text: normalized, enabled: true }, ...prev]
    })
  }

  function normalizeWoningtypeToTag(value: string): WoningtypeTag {
    const key = value.toLowerCase().trim()
    if (key.includes('vrijstaande')) return 'vrijstaande-woning'
    if (key.includes('tussenwoning')) return 'tussenwoning'
    if (key.includes('hoekwoning')) return 'hoekwoning'
    if (key.includes('2-onder-1-kap')) return '2-onder-1-kapwoning'
    if (key.includes('appartement')) return 'appartement'
    if (key.includes('boerderij')) return 'boerderij'
    if (key.includes('bungalow')) return 'bungalow'
    return 'anders'
  }

  function detectLocatieTags(text: string): Array<LocatieTag> {
    const value = text.toLowerCase()
    const tags: Array<LocatieTag> = []
    if (/(centrum|binnenstad|dorpskern|winkel)/.test(value)) tags.push('centrum')
    if (/(rustig|kindvriendelijk|woonwijk|straat)/.test(value)) tags.push('rustig')
    if (/(water|haven|dijk|kade|meer|zee)/.test(value)) tags.push('water')
    if (/(landelijk|polder|buitengebied|boeren|groen)/.test(value)) tags.push('landelijk')
    if (/(nieuwbouw|recent|nieuw)/.test(value)) tags.push('nieuwbouw')
    return tags
  }

  function scoreGalleryItem(item: PromptGalleryItem): number {
    const woningtypeTag = normalizeWoningtypeToTag(form.woningtype)
    const locatieTags = detectLocatieTags(form.ligging)
    let score = 0

    if (item.woningtypes.includes(woningtypeTag)) score += 3
    if (item.prijsklasses.includes(form.prijsklasse)) score += 3
    if (form.prijsklasse === 'onbekend') score += 1

    const matchedLocaties = locatieTags.filter((tag) => item.locaties.includes(tag)).length
    score += matchedLocaties * 2

    return score
  }

  const sortedGalleryItems = [...PROMPT_GALLERY_ITEMS].sort((a, b) => scoreGalleryItem(b) - scoreGalleryItem(a))
  const visibleGalleryItems = showRelevantOnly
    ? sortedGalleryItems.filter((item) => scoreGalleryItem(item) > 0)
    : sortedGalleryItems

  function togglePromptExtension(id: string) {
    setPromptExtensions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    )
  }

  function removePromptExtension(id: string) {
    setPromptExtensions((prev) => prev.filter((item) => item.id !== id))
  }

  function clearPromptExtensions() {
    setPromptExtensions([])
    setPromptNoticeMessage('Alle prompt-uitbreidingen verwijderd.')
  }

  function restoreDefaultPromptExtensions() {
    setPromptExtensions((prev) => {
      const map = new Map<string, PromptExtensionItem>()

      for (const item of prev) {
        const normalizedKey = item.text.toLowerCase()
        map.set(normalizedKey, item)
      }

      for (const text of DEFAULT_PROMPT_EXTENSIONS) {
        const normalizedText = normalizePromptExtensionText(text)
        const key = normalizedText.toLowerCase()
        const existing = map.get(key)

        if (existing) {
          map.set(key, { ...existing, enabled: true })
        } else {
          map.set(key, { id: crypto.randomUUID(), text: normalizedText, enabled: true })
        }
      }

      return Array.from(map.values())
    })

    setPromptNoticeMessage('Standaardset hersteld en geactiveerd.')
  }

  function addGalleryPromptToExtensions(prompt: string) {
    addPromptExtension(prompt)
    setPromptNoticeMessage('Gallery prompt toegevoegd aan uitbreidingen.')
  }

  function useGalleryPromptAsRefinement(prompt: string) {
    setVerfijnInput(prompt)
    setPromptNoticeMessage('Gallery prompt geladen in verfijnveld.')
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
    const activePromptAddition = buildPromptAdditionFromList(promptExtensions)

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
        prompt_addition: activePromptAddition || undefined,
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
    const activePromptAddition = buildPromptAdditionFromList(promptExtensions)

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
      prompt_addition: activePromptAddition || undefined,
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
        addPromptExtension(refinementInstruction)
        setPromptNoticeMessage('Verfijn-instructie toegevoegd aan prompt-uitbreidingen.')
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

              {/* Prijsklasse */}
              <div>
                <label className={LABEL_CLASS}>Prijsklasse</label>
                <div className="relative">
                  <select
                    className={SELECT_CLASS}
                    value={form.prijsklasse}
                    onChange={(e) => updateForm('prijsklasse', e.target.value as Prijsklasse)}
                  >
                    {PRIJSKLASSE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#1B2A4A]">
                        {opt.label}
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
              value={promptExtensionDraft}
              onChange={(e) => setPromptExtensionDraft(e.target.value.slice(0, PROMPT_EXTENSION_MAX_CHARS))}
              placeholder="Bijv. Spreek de lezer direct aan met je/u en schrijf persoonlijker, zonder feiten toe te voegen."
            />
            <div className="flex items-center justify-between mt-2 text-xs text-white/35">
              <span>{promptExtensionDraft.length}/{PROMPT_EXTENSION_MAX_CHARS}</span>
              {promptExtensions.length > 0 && <span className="text-green-300/90">{promptExtensions.filter((item) => item.enabled).length} actief</span>}
            </div>

            {promptNotice && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs">
                {promptNotice}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => {
                  const normalized = normalizePromptExtensionText(promptExtensionDraft)
                  if (!normalized) return
                  addPromptExtension(normalized)
                  setPromptExtensionDraft('')
                  setPromptNoticeMessage('Prompt-uitbreiding toegevoegd.')
                }}
                className="px-4 py-2 rounded-xl bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-xs font-medium hover:bg-brand-blue/30 transition-all"
              >
                Toevoegen
              </button>
              <button
                type="button"
                onClick={clearPromptExtensions}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white transition-all"
              >
                Alles verwijderen
              </button>
              <button
                type="button"
                onClick={restoreDefaultPromptExtensions}
                className="px-4 py-2 rounded-xl bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-xs font-medium hover:bg-brand-gold/30 transition-all"
              >
                Herstel standaardset
              </button>
            </div>

            {promptExtensions.length > 0 && (
              <div className="mt-3 space-y-2">
                {promptExtensions.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => togglePromptExtension(item.id)}
                      className="mt-0.5 rounded border-white/20 bg-white/5 text-brand-blue focus:ring-brand-blue/40"
                    />
                    <div className="flex-1 text-xs text-white/75 leading-relaxed">
                      {item.text}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePromptExtension(item.id)}
                      className="text-xs text-red-300/80 hover:text-red-200 transition-colors"
                    >
                      Verwijder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sectie 7: Prompt gallery */}
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
              Prompt gallery
            </h2>
            <p className="text-xs text-white/40 mb-4">
              Kies uit kant-en-klare verfijningsprompts. De lijst wordt automatisch gesorteerd op woningtype, ligging en prijsklasse.
            </p>

            <label className="inline-flex items-center gap-2 mb-4 text-xs text-white/65">
              <input
                type="checkbox"
                checked={showRelevantOnly}
                onChange={(e) => setShowRelevantOnly(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-brand-blue focus:ring-brand-blue/40"
              />
              Alleen relevante prompts tonen
            </label>

            <div className="space-y-3">
              {visibleGalleryItems.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white/85">{item.title}</p>
                      <p className="text-xs text-white/45 mt-0.5">{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/55">
                      Relevantie {scoreGalleryItem(item)}
                    </span>
                  </div>

                  <p className="text-xs text-white/70 mt-2 leading-relaxed">{item.prompt}</p>

                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => useGalleryPromptAsRefinement(item.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-brand-blue/20 border border-brand-blue/40 text-brand-blue text-xs font-medium hover:bg-brand-blue/30 transition-all"
                    >
                      Gebruik nu
                    </button>
                    <button
                      type="button"
                      onClick={() => addGalleryPromptToExtensions(item.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-xs font-medium hover:bg-brand-gold/30 transition-all"
                    >
                      Voeg toe als vaste uitbreiding
                    </button>
                  </div>
                </div>
              ))}

              {visibleGalleryItems.length === 0 && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/55">
                  Geen prompts gevonden die matchen met de huidige woningselectie. Zet de filter uit om alle prompts te bekijken.
                </div>
              )}
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
