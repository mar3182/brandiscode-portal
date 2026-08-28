'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Euro,
  ExternalLink,
  FileText,
  FlaskConical,
  GraduationCap,
  History,
  ListChecks,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  PlusCircle,
  Power,
  RefreshCw,
  Sparkles,
  Star,
  User,
  X,
} from 'lucide-react'
import type {
  AiKeyStatus,
  AiMode,
  AiProvider,
  AiPromptVersion,
  AiUsageEvent,
  Client,
  ClientAiSettings,
  Deliverable,
  Factuur,
  FactuurStatus,
  Feedback,
  Offerte,
  OfferteStatus,
  Sprint,
  TrainingIntake,
  TrainingIntakeStatus,
  TrainingSlot,
} from '@/lib/types'
import StatCard from '@/components/StatCard'

// ── publish result ───────────────────────────────────────────────────────────
interface PublishResult {
  wordpress: { success?: boolean; url?: string; skipped?: boolean; reason?: string }
  socialPosts: { linkedin: string; instagram: string; facebook: string }
}

// ── local sub-types ───────────────────────────────────────────────────────────
interface TrainingIntakeMemberRow {
  id: string
  full_name: string | null
  role: string | null
  top_tasks: string[]
  digital_skill: number | null
  ai_experience: string | null
  bottleneck: string | null
  kpi_goal: string | null
  prompt_data_boundary: string | null
  training_day_availability: string | null
  sort_order: number
}

interface TrainingRow extends TrainingIntake {
  completeness: number
  readyForTraining: boolean
  memberCount: number
  sessionCount: number
  training_sessions?: Array<{
    id: string
    status: 'proposed' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | string
    session_start: string | null
    proposed_duration_hours: number | null
    location_or_link: string | null
    confirmed_at: string | null
    client_proposed_datetime: string | null
    rescheduled_reason: string | null
  }>
  training_intake_members?: TrainingIntakeMemberRow[]
}

interface SprintWithDeliverables extends Sprint {
  deliverables?: Deliverable[]
}

interface OfferteRow extends Offerte {
  sprints: SprintWithDeliverables[]
}

interface ClientDetail {
  client: Client
  offertes: OfferteRow[]
  trainingen: TrainingRow[]
  facturen: Factuur[]
}

interface FeedbackRow extends Feedback {
  sprints: { title: string } | null
}

type SanitizedClientAiSettings = Pick<
  ClientAiSettings,
  | 'client_id'
  | 'ai_mode'
  | 'provider'
  | 'listing_generation_model'
  | 'listing_refinement_model'
  | 'social_generation_model'
  | 'brochure_generation_model'
  | 'managed_bundle'
  | 'fair_use_limit'
  | 'warning_threshold'
  | 'api_key_last4'
  | 'key_status'
  | 'updated_by'
> & {
  id: string | null
  created_at: string | null
  updated_at: string | null
}

type AiSettingsFormState = {
  ai_mode: AiMode
  provider: AiProvider
  listing_generation_model: string
  listing_refinement_model: string
  social_generation_model: string
  brochure_generation_model: string
  managed_bundle: string
  fair_use_limit: string
  warning_threshold: string
  api_key: string
}

// ── helpers ───────────────────────────────────────────────────────────────────
const OFFERTE_STATUS_LABELS: Record<OfferteStatus, string> = {
  concept: 'Concept',
  verstuurd: 'Verstuurd',
  bekeken: 'Bekeken',
  getekend: 'Getekend',
  afgewezen: 'Afgewezen',
  afgerond: 'Afgerond',
}

const OFFERTE_STATUS_COLOR: Record<OfferteStatus, string> = {
  concept: 'bg-white/10 text-white/60',
  verstuurd: 'bg-blue-500/20 text-blue-300',
  bekeken: 'bg-yellow-500/20 text-yellow-300',
  getekend: 'bg-green-500/20 text-green-300',
  afgewezen: 'bg-red-500/20 text-red-300',
  afgerond: 'bg-purple-500/20 text-purple-300',
}

const INTAKE_STATUS_LABELS: Record<TrainingIntakeStatus, string> = {
  draft: 'Concept',
  submitted: 'Ingediend',
  reviewed: 'Beoordeeld',
  planned: 'Gepland',
}

const INTAKE_STATUS_COLOR: Record<TrainingIntakeStatus, string> = {
  draft: 'bg-white/10 text-white/60',
  submitted: 'bg-blue-500/20 text-blue-300',
  reviewed: 'bg-yellow-500/20 text-yellow-300',
  planned: 'bg-green-500/20 text-green-300',
}

const FACTUUR_STATUS_LABELS: Record<FactuurStatus, string> = {
  concept: 'Concept',
  verstuurd: 'Verstuurd',
  betaald: 'Betaald',
  herinnering: 'Herinnering',
}

const FACTUUR_STATUS_COLOR: Record<FactuurStatus, string> = {
  concept: 'bg-white/10 text-white/60',
  verstuurd: 'bg-blue-500/20 text-blue-300',
  betaald: 'bg-green-500/20 text-green-300',
  herinnering: 'bg-red-500/20 text-red-300',
}

const SESSION_STATUS_LABELS: Record<'proposed' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled', string> = {
  proposed: 'Voorgesteld',
  confirmed: 'Bevestigd',
  rescheduled: 'Verplaatst',
  completed: 'Afgerond',
  cancelled: 'Geannuleerd',
}

const SESSION_STATUS_COLOR: Record<'proposed' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled', string> = {
  proposed: 'bg-blue-500/20 text-blue-300',
  confirmed: 'bg-green-500/20 text-green-300',
  rescheduled: 'bg-yellow-500/20 text-yellow-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  cancelled: 'bg-red-500/20 text-red-300',
}

function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}

function fmt(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StarRating({ rating }: { rating: number | null }) {
  const count = rating ?? 0
  return (
    <span className="flex items-center gap-0.5" aria-label={`${count} van 5 sterren`}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} className={i <= count ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
      ))}
    </span>
  )
}

// ── tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overzicht' | 'offertes' | 'training' | 'facturen' | 'feedback' | 'ai'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overzicht', label: 'Overzicht', icon: <User size={15} /> },
  { id: 'offertes', label: 'Offertes', icon: <FileText size={15} /> },
  { id: 'training', label: 'Training', icon: <GraduationCap size={15} /> },
  { id: 'facturen', label: 'Facturen', icon: <CreditCard size={15} /> },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={15} /> },
  { id: 'ai', label: 'AI Tools', icon: <Sparkles size={15} /> },
]

// ── sub-sections ──────────────────────────────────────────────────────────────

function OverzichtTab({ client }: { client: Client }) {
  const [visitNotes, setVisitNotes] = useState(client.visit_notes ?? '')
  const [visitSaving, setVisitSaving] = useState(false)
  const [visitSavedAt, setVisitSavedAt] = useState<Date | null>(null)
  const [visitError, setVisitError] = useState('')

  async function handleSaveVisitNotes() {
    setVisitSaving(true)
    setVisitError('')
    const res = await fetch(`/api/admin/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_notes: visitNotes }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setVisitError((data as { error?: string }).error || 'Opslaan mislukt.')
      setVisitSaving(false)
      return
    }
    setVisitSavedAt(new Date())
    setVisitSaving(false)
  }

  const fields: [string, string | null][] = [
    ['Naam', client.name],
    ['E-mail', client.email],
    ['Bedrijf', client.company],
    ['Telefoon', client.phone],
    ['Contactpersoon', client.contact_person],
    ['KvK', client.kvk_number],
    ['BTW', client.btw_number],
    ['IBAN', client.iban],
    ['Facturatie e-mail', client.billing_email],
    ['Adres', [client.billing_address_line1, client.billing_address_line2].filter(Boolean).join(', ') || null],
    ['Postcode', client.billing_postal_code],
    ['Stad', client.billing_city],
    ['Land', client.billing_country],
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(([label, value]) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{label}</p>
            <p className="text-sm text-white">{value || <span className="text-white/30 italic">niet ingevuld</span>}</p>
          </div>
        ))}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:col-span-2">
          <p className="text-xs text-white/40 mb-1">Onboarding</p>
          <p className="text-sm text-white flex items-center gap-2">
            {client.onboarding_completed_at
              ? <><CheckCircle2 size={14} className="text-green-400" /> Voltooid op {fmtDate(client.onboarding_completed_at)}</>
              : <><Clock size={14} className="text-yellow-400" /> Nog niet voltooid</>}
          </p>
        </div>
      </div>

      {/* Bezoeknotities */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <p className="text-xs text-white/40 mb-2">Bezoeknotities / Contactlog</p>
        <textarea
          rows={5}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-orange/50 resize-y"
          placeholder="Notities over gesprekken, bezoeken, acties..."
          value={visitNotes}
          onChange={(e) => setVisitNotes(e.target.value)}
        />
        {visitError && (
          <p className="text-xs text-red-300 mt-1" role="alert">{visitError}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {visitSavedAt ? (
            <p className="text-xs text-white/40">
              Opgeslagen om {visitSavedAt.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : <span />}
          <button
            onClick={handleSaveVisitNotes}
            disabled={visitSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-medium disabled:opacity-60"
          >
            {visitSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Opslaan
          </button>
        </div>
      </div>
    </div>
  )
}

function OffertesTab({ offertes, clientId, clientEmail }: { offertes: OfferteRow[]; clientId: string; clientEmail?: string | null }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [localOffertes, setLocalOffertes] = useState<OfferteRow[]>(offertes)
  const [completingSprint, setCompletingSprint] = useState<Record<string, boolean>>({})
  const [sprintToast, setSprintToast] = useState<{ msg: string; isError: boolean } | null>(null)

  useEffect(() => {
    setLocalOffertes(offertes)
  }, [offertes])

  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  async function handleAfronden(sprintId: string, sprintTitle: string) {
    if (!confirm(`Sprint "${sprintTitle}" afronden? Dit stuurt een feedback-verzoek naar de klant.`)) return

    setCompletingSprint(prev => ({ ...prev, [sprintId]: true }))
    const res = await fetch(`/api/admin/sprints/${sprintId}/afronden`, { method: 'POST' })
    const data = await res.json().catch(() => ({} as { error?: string; clientEmail?: string }))

    if (!res.ok) {
      setSprintToast({ msg: (data as { error?: string }).error ?? 'Sprint afronden mislukt.', isError: true })
      setCompletingSprint(prev => ({ ...prev, [sprintId]: false }))
      setTimeout(() => setSprintToast(null), 4000)
      return
    }

    setLocalOffertes(prev => prev.map(o => ({
      ...o,
      sprints: o.sprints.map(s => s.id === sprintId ? { ...s, status: 'afgerond' as const } : s),
    })))

    const email = (data as { clientEmail?: string }).clientEmail ?? clientEmail ?? 'klant'
    setSprintToast({ msg: `Sprint afgerond — feedback verzoek verstuurd naar ${email}`, isError: false })
    setCompletingSprint(prev => ({ ...prev, [sprintId]: false }))
    setTimeout(() => setSprintToast(null), 5000)
  }

  return (
    <div className="space-y-3">
      {/* Toast */}
      {sprintToast && (
        <div
          className={`text-xs px-4 py-2.5 rounded-xl border ${
            sprintToast.isError
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-green-500/10 border-green-500/20 text-green-300'
          }`}
          role={sprintToast.isError ? 'alert' : 'status'}
        >
          {sprintToast.msg}
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href={`/admin/offertes?client=${clientId}`}
          className="text-xs text-brand-orange hover:text-brand-orange/80 flex items-center gap-1"
        >
          Nieuwe offerte <ChevronRight size={12} />
        </Link>
      </div>
      {localOffertes.length === 0 && (
        <p className="text-white/40 text-sm text-center py-8">Geen offertes voor deze klant</p>
      )}
      {localOffertes.map(o => (
        <div key={o.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(o.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText size={15} className="text-brand-orange shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{o.title}</p>
                <p className="text-xs text-white/40">{fmtDate(o.created_at)} · {fmt(o.total_amount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge label={OFFERTE_STATUS_LABELS[o.status]} colorClass={OFFERTE_STATUS_COLOR[o.status]} />
              <ChevronDown size={14} className={`text-white/40 transition-transform ${open[o.id] ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {open[o.id] && (
            <div className="border-t border-white/10 px-4 py-3 space-y-2">
              {o.description && <p className="text-xs text-white/60 mb-3">{o.description}</p>}
              {o.sprints && o.sprints.length > 0 ? (
                o.sprints.map(s => {
                  const deliverables = s.deliverables ?? []
                  const done = deliverables.filter((d) => d.status === 'done').length
                  const total = deliverables.length
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={s.id} className="bg-white/5 rounded-lg px-3 py-2 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-xs text-white">Sprint {s.number} — {s.title}</p>
                          <p className="text-xs text-white/40">{fmt(s.amount)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            s.status === 'afgerond' ? 'bg-green-500/20 text-green-300' :
                            s.status === 'actief' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-white/10 text-white/50'
                          }`}>{s.status}</span>
                          {s.status !== 'afgerond' && (
                            <button
                              onClick={() => handleAfronden(s.id, s.title)}
                              disabled={!!completingSprint[s.id]}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 transition-colors disabled:opacity-60"
                            >
                              {completingSprint[s.id]
                                ? <Loader2 size={10} className="animate-spin" />
                                : <CheckCircle2 size={10} />}
                              Sprint afronden
                            </button>
                          )}
                        </div>
                      </div>
                      {total > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-white/40 mb-1">
                            <span>{done} van {total} taken afgerond</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct === 100 ? 'bg-green-400' : 'bg-brand-blue'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-white/30 italic">Geen sprints</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TrainingTab({
  trainingen,
  clientId,
  onSessionPlanned,
}: {
  trainingen: TrainingRow[]
  clientId: string
  onSessionPlanned: () => Promise<void>
}) {
  const [planningIntakeId, setPlanningIntakeId] = useState<string | null>(null)
  const [sessionStart, setSessionStart] = useState('')
  const [sessionDuration, setSessionDuration] = useState<2 | 3 | ''>('')
  const [sessionRescheduleWindowHours, setSessionRescheduleWindowHours] = useState<number>(24)
  const [sessionLocation, setSessionLocation] = useState('')
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [sessionSuccess, setSessionSuccess] = useState('')
  const [openIntakeDetails, setOpenIntakeDetails] = useState<Record<string, boolean>>({})
  const [decisionLoading, setDecisionLoading] = useState<Record<string, boolean>>({})
  const [counterSessionId, setCounterSessionId] = useState<string | null>(null)
  const [counterSessionStart, setCounterSessionStart] = useState('')

  // Slots state
  const [slots, setSlots] = useState<Record<string, TrainingSlot[]>>({})
  const [slotsLoading, setSlotsLoading] = useState<Record<string, boolean>>({})
  const [showSlotsForm, setShowSlotsForm] = useState<string | null>(null)
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotLocation, setNewSlotLocation] = useState('')
  const [slotSaving, setSlotSaving] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [suggesting, setSuggesting] = useState<Record<string, boolean>>({})
  const [suggestedSlots, setSuggestedSlots] = useState<Record<string, Array<{ start: string; end: string }>>>({})
  const [suggestRangeFrom, setSuggestRangeFrom] = useState('')
  const [suggestRangeTo, setSuggestRangeTo] = useState('')
  const [suggestDurationMinutes, setSuggestDurationMinutes] = useState(120)

  async function loadSlots(intakeId: string) {
    setSlotsLoading(prev => ({ ...prev, [intakeId]: true }))
    try {
      const res = await fetch(`/api/admin/training-slots?intake_id=${intakeId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) setSlots(prev => ({ ...prev, [intakeId]: data.slots ?? [] }))
    } finally {
      setSlotsLoading(prev => ({ ...prev, [intakeId]: false }))
    }
  }

  function openSlotsForm(intakeId: string) {
    setShowSlotsForm(intakeId)
    setNewSlotStart('')
    setNewSlotLocation('')
    setSlotError('')
    const now = new Date()
    const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    setSuggestRangeFrom(fmtDatetimeLocal(now.toISOString()))
    setSuggestRangeTo(fmtDatetimeLocal(inTwoWeeks.toISOString()))
    if (!slots[intakeId]) loadSlots(intakeId)
  }

  async function handleAddSlot(e: React.FormEvent, intakeId: string) {
    e.preventDefault()
    if (!newSlotStart) { setSlotError('Kies een datum en tijd'); return }
    setSlotSaving(true)
    setSlotError('')
    const res = await fetch('/api/admin/training-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intake_id: intakeId,
        slot_start: new Date(newSlotStart).toISOString(),
        location_or_link: newSlotLocation || undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setSlotError(data.error || 'Slot toevoegen mislukt'); setSlotSaving(false); return }
    setNewSlotStart('')
    setNewSlotLocation('')
    await loadSlots(intakeId)
    setSlotSaving(false)
  }

  async function handleDeleteSlot(slotId: string, intakeId: string) {
    if (!confirm('Tijdslot verwijderen?')) return
    const res = await fetch(`/api/admin/training-slots?id=${slotId}`, { method: 'DELETE' })
    if (res.ok) await loadSlots(intakeId)
  }

  async function handleSuggestSlots(intakeId: string) {
    if (!suggestRangeFrom || !suggestRangeTo) {
      setSlotError('Vul een geldige van/tot periode in voor suggesties.')
      return
    }

    setSlotError('')
    setSuggesting(prev => ({ ...prev, [intakeId]: true }))

    const params = new URLSearchParams({
      time_min: new Date(suggestRangeFrom).toISOString(),
      time_max: new Date(suggestRangeTo).toISOString(),
      slot_minutes: String(suggestDurationMinutes),
      max_results: '8',
    })

    const res = await fetch(`/api/admin/training-calendar/availability?${params.toString()}`, {
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setSlotError(data.error || 'Vrije momenten ophalen mislukt.')
      setSuggesting(prev => ({ ...prev, [intakeId]: false }))
      return
    }

    if (data?.skipped) {
      setSlotError(data.reason || 'Kalenderkoppeling is nog niet geconfigureerd.')
      setSuggesting(prev => ({ ...prev, [intakeId]: false }))
      return
    }

    setSuggestedSlots(prev => ({
      ...prev,
      [intakeId]: Array.isArray(data?.slots) ? data.slots : [],
    }))
    setSuggesting(prev => ({ ...prev, [intakeId]: false }))
  }

  async function handleAddSuggestedSlot(intakeId: string, startIso: string, endIso: string | null) {
    setSlotSaving(true)
    setSlotError('')

    const res = await fetch('/api/admin/training-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intake_id: intakeId,
        slot_start: startIso,
        slot_end: endIso || undefined,
        location_or_link: newSlotLocation || undefined,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSlotError(data.error || 'Slot toevoegen mislukt.')
      setSlotSaving(false)
      return
    }

    await loadSlots(intakeId)
    setSuggestedSlots(prev => ({
      ...prev,
      [intakeId]: (prev[intakeId] ?? []).filter((s) => s.start !== startIso),
    }))
    setSlotSaving(false)
  }

  function fmtDatetimeLocal(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  async function handleDecision(sessionId: string, action: 'accept' | 'reject' | 'counter_propose', intakeId?: string) {
    setDecisionLoading(prev => ({ ...prev, [sessionId]: true }))
    setSessionError('')
    setSessionSuccess('')

    const payload: Record<string, unknown> = { action }
    if (action === 'counter_propose') {
      payload.session_start = counterSessionStart
    }

    const res = await fetch(`/api/admin/training-sessions/${sessionId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSessionError(data.error || 'Actie mislukt.')
      setDecisionLoading(prev => ({ ...prev, [sessionId]: false }))
      return
    }

    setSessionSuccess(action === 'accept' ? 'Klantvoorstel geaccepteerd.' : action === 'reject' ? 'Klantvoorstel geweigerd.' : 'Tegenvoorstel verstuurd.')
    setCounterSessionId(null)
    setCounterSessionStart('')
    setDecisionLoading(prev => ({ ...prev, [sessionId]: false }))
    await onSessionPlanned()
    if (intakeId) await loadSlots(intakeId)
  }

  function openPlanningForm(intakeId: string, trainingDuration: string | null) {
    setPlanningIntakeId(intakeId)
    setSessionStart('')
    setSessionDuration(trainingDuration === '2u' ? 2 : trainingDuration === '3u' ? 3 : '')
    setSessionRescheduleWindowHours(24)
    setSessionLocation('')
    setSessionError('')
    setSessionSuccess('')
  }

  async function handleScheduleSession(e: React.FormEvent) {
    e.preventDefault()
    if (!planningIntakeId) return

    setSessionSaving(true)
    setSessionError('')
    setSessionSuccess('')

    if (!sessionStart) {
      setSessionError('Kies eerst een datum en tijd voor het voorstel.')
      setSessionSaving(false)
      return
    }

    const res = await fetch('/api/admin/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intake_id: planningIntakeId,
        session_start: new Date(sessionStart).toISOString(),
        proposed_duration_hours: sessionDuration || undefined,
        reschedule_window_hours: sessionRescheduleWindowHours,
        location_or_link: sessionLocation || undefined,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSessionError(data.error || 'Sessie inplannen is mislukt.')
      setSessionSaving(false)
      return
    }

    setSessionSuccess('Sessievoorstel is opgeslagen en verstuurd.')
    await onSessionPlanned()
    setPlanningIntakeId(null)
    setSessionSaving(false)
  }

  // Intake aanmaken state
  const [creatingIntake, setCreatingIntake] = useState(false)
  const [createIntakeError, setCreateIntakeError] = useState('')

  function textOrDash(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    return normalized || '—'
  }

  function yesNo(value: boolean | null | undefined) {
    if (value === true) return 'Ja'
    if (value === false) return 'Nee'
    return '—'
  }

  async function handleCreateIntake() {
    setCreatingIntake(true)
    setCreateIntakeError('')
    const res = await fetch('/api/admin/training-intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setCreateIntakeError(data.error || 'Intake aanmaken mislukt')
      setCreatingIntake(false)
      return
    }
    await onSessionPlanned()
    setCreatingIntake(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href={`/admin/training-intakes?client=${clientId}`}
          className="text-xs text-brand-orange hover:text-brand-orange/80 flex items-center gap-1"
        >
          Nieuwe intake <ChevronRight size={12} />
        </Link>
      </div>
      {trainingen.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <p className="text-white/40 text-sm">Geen training intakes voor deze klant</p>
          {createIntakeError && <p className="text-red-300 text-xs">{createIntakeError}</p>}
          <button
            onClick={handleCreateIntake}
            disabled={creatingIntake}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-sm disabled:opacity-60"
          >
            {creatingIntake ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
            Intake aanmaken voor deze klant
          </button>
        </div>
      )}
      {trainingen.map(t => (
        <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-brand-orange shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white capitalize">
                  {t.training_duration ? `Workshop ${t.training_duration}` : 'Training intake'}
                </p>
                <p className="text-xs text-white/40">{fmtDate(t.created_at)}</p>
              </div>
            </div>
            <StatusBadge label={INTAKE_STATUS_LABELS[t.status]} colorClass={INTAKE_STATUS_COLOR[t.status]} />
          </div>

          {/* completeness bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Volledigheid</span>
              <span>{t.completeness}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  t.completeness >= 80 ? 'bg-green-400' :
                  t.completeness >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${t.completeness}%` }}
              />
            </div>
          </div>

          <div className="flex gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1"><User size={11} /> {t.memberCount} deelnemers</span>
            <span className="flex items-center gap-1"><BookOpen size={11} /> {t.sessionCount} sessies</span>
            {t.preferred_datetime && (
              <span className="flex items-center gap-1"><Clock size={11} /> {fmtDate(t.preferred_datetime)}</span>
            )}
          </div>

          {/* Ingevulde intake gegevens */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <button
              onClick={() => setOpenIntakeDetails(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
              className="flex items-center justify-between w-full text-xs text-white/40 hover:text-white/70 transition-colors"
              aria-expanded={!!openIntakeDetails[t.id]}
            >
              <span>Ingevulde intake gegevens</span>
              <ChevronDown size={14} className={`transition-transform ${openIntakeDetails[t.id] ? 'rotate-180' : ''}`} />
            </button>
            {openIntakeDetails[t.id] && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Focusgebied</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.focus_area)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Training duur</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.training_duration)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Voorkeursdatum</p>
                    <p className="text-xs text-white mt-0.5">{t.preferred_datetime ? fmtDate(t.preferred_datetime) : '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Voorkeur tijd opmerking</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.preferred_time_note)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Contactpersoon</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.contact_person)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Contact e-mail</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.contact_email)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Communicatiekanaal</p>
                    <p className="text-xs text-white mt-0.5 capitalize">{textOrDash(t.communication_channel)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Communicatie e-mail</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.communication_email)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Communicatie WhatsApp</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.communication_whatsapp)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Communicatie toestemming</p>
                    <p className="text-xs text-white mt-0.5">{yesNo(t.communication_consent)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Portal notificaties</p>
                    <p className="text-xs text-white mt-0.5">{yesNo(t.portal_notifications_enabled)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 sm:col-span-2">
                    <p className="text-xs text-white/40">Privacy beperkingen</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.privacy_constraints)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 sm:col-span-2">
                    <p className="text-xs text-white/40">Communicatie notities</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.communication_notes)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 sm:col-span-2">
                    <p className="text-xs text-white/40">Trainer notities</p>
                    <p className="text-xs text-white mt-0.5">{textOrDash(t.trainer_notes)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Data usage consent</p>
                    <p className="text-xs text-white mt-0.5">{yesNo(t.data_usage_consent)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Ingediend op</p>
                    <p className="text-xs text-white mt-0.5">{t.submitted_at ? fmtDateTime(t.submitted_at) : '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Beoordeeld op</p>
                    <p className="text-xs text-white mt-0.5">{t.reviewed_at ? fmtDateTime(t.reviewed_at) : '—'}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40">Gepland op</p>
                    <p className="text-xs text-white mt-0.5">{t.planned_at ? fmtDateTime(t.planned_at) : '—'}</p>
                  </div>
                </div>
                {Array.isArray(t.training_intake_members) && t.training_intake_members.length > 0 && (
                  <div>
                    <p className="text-xs text-white/40 mb-2">Teamleden</p>
                    <div className="space-y-2">
                      {t.training_intake_members
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(member => (
                          <div key={member.id} className="bg-white/5 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="text-xs font-medium text-white">{member.full_name || '—'}</p>
                                <p className="text-xs text-white/40">{member.role || '—'}</p>
                              </div>
                              <StarRating rating={member.digital_skill} />
                            </div>
                            {member.ai_experience ? (
                              <p className="text-xs text-white/60 mt-1">AI ervaring: {member.ai_experience}</p>
                            ) : null}
                            <p className="text-xs text-white/60 mt-1">Knelpunt: {textOrDash(member.bottleneck)}</p>
                            <p className="text-xs text-white/60 mt-1">KPI doel: {textOrDash(member.kpi_goal)}</p>
                            <p className="text-xs text-white/60 mt-1">Prompt data grens: {textOrDash(member.prompt_data_boundary)}</p>
                            <p className="text-xs text-white/60 mt-1">Beschikbare dag: {textOrDash(member.training_day_availability)}</p>
                            {Array.isArray(member.top_tasks) && member.top_tasks.length > 0 ? (
                              <div className="mt-1">
                                <p className="text-xs text-white/40">Taken:</p>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                  {member.top_tasks.map((task, idx) => (
                                    <li key={idx} className="text-xs text-white/60">{task}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 mb-2">Sessieoverzicht</p>
            {Array.isArray(t.training_sessions) && t.training_sessions.length > 0 ? (
              <div className="space-y-2">
                {t.training_sessions
                  .slice()
                  .sort((a, b) => {
                    const aDate = a.session_start ? new Date(a.session_start).getTime() : 0
                    const bDate = b.session_start ? new Date(b.session_start).getTime() : 0
                    return bDate - aDate
                  })
                  .map((session) => {
                    const statusKey = session.status as 'proposed' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled'
                    const statusLabel = SESSION_STATUS_LABELS[statusKey] || session.status
                    const statusColor = SESSION_STATUS_COLOR[statusKey] || 'bg-white/10 text-white/70'

                    return (
                      <div key={session.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StatusBadge label={statusLabel} colorClass={statusColor} />
                          <p className="text-xs text-white/70">{fmtDateTime(session.session_start)}</p>
                        </div>
                        <p className="text-xs text-white/60 mt-2">Locatie: {session.location_or_link || 'Nog niet ingevuld'}</p>
                        {session.status === 'confirmed' ? (
                          <p className="text-xs text-green-200 mt-1">Bevestigd op: {fmtDateTime(session.confirmed_at)}</p>
                        ) : null}
                        {session.status === 'rescheduled' && session.client_proposed_datetime ? (
                          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 space-y-2">
                            <p className="text-xs text-amber-200">
                              Klant stelt voor: {fmtDateTime(session.client_proposed_datetime)}
                            </p>
                            {session.rescheduled_reason ? (
                              <p className="text-xs text-white/60">Toelichting: {session.rescheduled_reason}</p>
                            ) : null}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button
                                type="button"
                                disabled={decisionLoading[session.id]}
                                onClick={() => handleDecision(session.id, 'accept', t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs disabled:opacity-60"
                              >
                                Accepteren
                              </button>
                              <button
                                type="button"
                                disabled={decisionLoading[session.id]}
                                onClick={() => handleDecision(session.id, 'reject', t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs disabled:opacity-60"
                              >
                                Weigeren
                              </button>
                              <button
                                type="button"
                                disabled={decisionLoading[session.id]}
                                onClick={() => {
                                  setCounterSessionId(session.id)
                                  setCounterSessionStart(fmtDatetimeLocal(session.client_proposed_datetime || session.session_start))
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs disabled:opacity-60"
                              >
                                Tegenvoorstel
                              </button>
                            </div>
                            {counterSessionId === session.id ? (
                              <div className="pt-2 space-y-2">
                                <label className="block text-xs text-white/40">Nieuwe datum/tijd</label>
                                <input
                                  type="datetime-local"
                                  value={counterSessionStart}
                                  onChange={(e) => setCounterSessionStart(e.target.value)}
                                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={decisionLoading[session.id] || !counterSessionStart}
                                    onClick={() => handleDecision(session.id, 'counter_propose', t.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500 text-white text-xs disabled:opacity-60"
                                  >
                                    Verstuur tegenvoorstel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCounterSessionId(null)
                                      setCounterSessionStart('')
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 text-white/70 text-xs"
                                  >
                                    Annuleren
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p className="text-xs text-white/40">Nog geen sessies voor deze intake.</p>
            )}
          </div>

          {(['draft', 'submitted', 'reviewed', 'planned'].includes(t.status)) && !((t.training_sessions || []).some((session) => session.status === 'proposed')) ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openPlanningForm(t.id, t.training_duration)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-sm"
                >
                  <CalendarPlus className="w-4 h-4" /> Sessie inplannen
                </button>
                <button
                  onClick={() => openSlotsForm(t.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm"
                >
                  <Clock className="w-4 h-4" /> Bied slots aan
                </button>
              </div>
            </div>
          ) : null}

          {/* Slots beheer sectie */}
          {showSlotsForm === t.id && (
            <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white/70">Tijdsloten voor klant</p>
                <button onClick={() => setShowSlotsForm(null)} className="text-white/40 hover:text-white/70">
                  <X size={14} />
                </button>
              </div>

              {/* Bestaande slots */}
              {slotsLoading[t.id] ? (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Loader2 size={12} className="animate-spin" /> Laden…
                </div>
              ) : (slots[t.id] ?? []).length === 0 ? (
                <p className="text-xs text-white/40">Nog geen tijdsloten. Voeg er hieronder toe.</p>
              ) : (
                <div className="space-y-2">
                  {(slots[t.id] ?? []).map(slot => (
                    <div key={slot.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${slot.is_selected ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
                      <div>
                        <span className={slot.is_selected ? 'text-green-300 font-medium' : 'text-white'}>
                          {new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }).format(new Date(slot.slot_start))}
                        </span>
                        {slot.location_or_link && <span className="text-white/40 ml-2">· {slot.location_or_link}</span>}
                        {slot.is_selected && <span className="ml-2 text-green-400">✓ Gekozen</span>}
                      </div>
                      {!slot.is_selected && (
                        <button
                          onClick={() => handleDeleteSlot(slot.id, t.id)}
                          className="text-white/30 hover:text-red-400 ml-2"
                          aria-label="Verwijder slot"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
                <p className="text-xs font-medium text-white/70">Zoek vrije momenten (Google trainingskalender)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Van</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                      value={suggestRangeFrom}
                      onChange={(e) => setSuggestRangeFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Tot</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                      value={suggestRangeTo}
                      onChange={(e) => setSuggestRangeTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Duur (min)</label>
                    <select
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                      value={suggestDurationMinutes}
                      onChange={(e) => setSuggestDurationMinutes(Number(e.target.value))}
                    >
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                      <option value={120}>120 min</option>
                      <option value={180}>180 min</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSuggestSlots(t.id)}
                  disabled={!!suggesting[t.id]}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm disabled:opacity-60"
                >
                  {suggesting[t.id] ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                  Zoek vrije momenten
                </button>

                {(suggestedSlots[t.id] ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/50">Voorgestelde vrije momenten</p>
                    {(suggestedSlots[t.id] ?? []).map((s) => (
                      <div key={s.start} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs">
                        <span className="text-white">
                          {new Intl.DateTimeFormat('nl-NL', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Amsterdam',
                          }).format(new Date(s.start))}
                        </span>
                        <button
                          type="button"
                          disabled={slotSaving}
                          onClick={() => handleAddSuggestedSlot(t.id, s.start, s.end ?? null)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                        >
                          Als slot toevoegen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nieuw slot toevoegen */}
              {(slots[t.id] ?? []).filter(s => !s.is_selected).length < 5 && (
                <form onSubmit={(e) => handleAddSlot(e, t.id)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Datum en tijd *</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                      value={newSlotStart}
                      onChange={(e) => setNewSlotStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Locatie / link</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
                      value={newSlotLocation}
                      onChange={(e) => setNewSlotLocation(e.target.value)}
                      placeholder="Teams-link of kantoor"
                    />
                  </div>
                  {slotError && <p className="sm:col-span-2 text-xs text-red-300">{slotError}</p>}
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={slotSaving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm disabled:opacity-60"
                    >
                      {slotSaving ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                      Slot toevoegen
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {planningIntakeId === t.id ? (
            <form onSubmit={handleScheduleSession} className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`session-start-${t.id}`} className="block text-xs text-white/50 mb-1">Datum en tijd *</label>
                  <input
                    id={`session-start-${t.id}`}
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={`session-duration-${t.id}`} className="block text-xs text-white/50 mb-1">Duur</label>
                  <select
                    id={`session-duration-${t.id}`}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration((e.target.value ? Number(e.target.value) : '') as 2 | 3 | '')}
                  >
                    <option value="">Kies duur</option>
                    <option value="2">2 uur</option>
                    <option value="3">3 uur</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`session-reschedule-window-${t.id}`} className="block text-xs text-white/50 mb-1">Wijzigtermijn klant (uren)</label>
                  <input
                    id={`session-reschedule-window-${t.id}`}
                    type="number"
                    min={0}
                    max={336}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
                    value={sessionRescheduleWindowHours}
                    onChange={(e) => setSessionRescheduleWindowHours(Math.max(0, Number(e.target.value || 0)))}
                  />
                  <p className="text-[11px] text-white/40 mt-1">Bijv. 24 = klant kan tot 24 uur voor sessie een later moment voorstellen.</p>
                </div>
              </div>

              <div>
                <label htmlFor={`session-location-${t.id}`} className="block text-xs text-white/50 mb-1">Locatie / link</label>
                <input
                  id={`session-location-${t.id}`}
                  type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
                  value={sessionLocation}
                  onChange={(e) => setSessionLocation(e.target.value)}
                  placeholder="Bijv. Teams-link of kantoorlocatie"
                />
              </div>

              {sessionError ? (
                <p className="text-xs text-red-300" role="alert" aria-live="assertive">{sessionError}</p>
              ) : null}
              {sessionSuccess ? (
                <p className="text-xs text-green-300" role="status" aria-live="polite">{sessionSuccess}</p>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  disabled={sessionSaving}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand-orange text-white text-sm disabled:opacity-60"
                >
                  {sessionSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Voorstel opslaan
                </button>
                <button
                  type="button"
                  onClick={() => setPlanningIntakeId(null)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/80 text-sm"
                >
                  Annuleren
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function FacturenTab({
  facturen,
  clientId,
  onRefresh,
}: {
  facturen: Factuur[]
  clientId: string
  onRefresh: () => Promise<void>
}) {
  const [selectedFactuur, setSelectedFactuur] = useState<Factuur | null>(null)
  const [editDueDate, setEditDueDate] = useState('')
  const [editStatus, setEditStatus] = useState<FactuurStatus>('concept')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')

  const totaalOpenstaand = facturen
    .filter(f => f.status === 'verstuurd' || f.status === 'herinnering')
    .reduce((sum, f) => sum + (f.total_amount ?? 0), 0)

  function openModal(f: Factuur) {
    setSelectedFactuur(f)
    setEditDueDate(f.due_date ? f.due_date.slice(0, 10) : '')
    setEditStatus(f.status)
    setModalError('')
    setModalSuccess('')
  }

  async function handleSave() {
    if (!selectedFactuur) return
    setModalSaving(true)
    setModalError('')
    setModalSuccess('')

    const res = await fetch(`/api/admin/facturen/${selectedFactuur.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: editStatus,
        due_date: editDueDate || null,
      }),
    })

    const body = await res.json().catch(() => ({} as { error?: string }))
    if (!res.ok) {
      setModalError((body as { error?: string }).error || 'Opslaan mislukt.')
      setModalSaving(false)
      return
    }

    setModalSuccess('Factuur succesvol bijgewerkt.')
    setSelectedFactuur(body as Factuur)
    await onRefresh()
    setModalSaving(false)
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          {totaalOpenstaand > 0 && (
            <p className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5">
              Openstaand: {fmt(totaalOpenstaand)}
            </p>
          )}
          <Link
            href={`/admin/facturen?client_id=${clientId}`}
            className="text-xs text-brand-orange hover:text-brand-orange/80 flex items-center gap-1 ml-auto"
          >
            Nieuwe factuur <ChevronRight size={12} />
          </Link>
        </div>
        {facturen.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">Geen facturen voor deze klant</p>
        )}
        {facturen.map(f => (
          <button
            key={f.id}
            onClick={() => openModal(f)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-white/10 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <CreditCard size={15} className="text-brand-orange shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">{f.title}</p>
                <p className="text-xs text-white/40">
                  {f.factuur_nummer} · {fmtDate(f.issue_date)}
                  {f.sprint && ` · Sprint ${f.sprint.number}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-white">{fmt(f.total_amount ?? f.amount)}</p>
              <StatusBadge label={FACTUUR_STATUS_LABELS[f.status]} colorClass={FACTUUR_STATUS_COLOR[f.status]} />
            </div>
          </button>
        ))}
      </div>

      {/* Factuur detail modal */}
      {selectedFactuur && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedFactuur(null) }}
          role="dialog"
          aria-modal="true"
          aria-label="Factuur details"
        >
          <div className="w-full sm:max-w-lg bg-slate-900 border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[90dvh]">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">{selectedFactuur.factuur_nummer}</p>
                <p className="text-xs text-white/50">{selectedFactuur.title}</p>
              </div>
              <button
                onClick={() => setSelectedFactuur(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                aria-label="Sluiten"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Bedragen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">Excl. BTW</p>
                  <p className="text-sm font-semibold text-white">{fmt(selectedFactuur.amount)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">BTW {selectedFactuur.btw_percentage}%</p>
                  <p className="text-sm font-semibold text-white">{fmt(selectedFactuur.btw_amount)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40 mb-1">Incl. BTW</p>
                  <p className="text-sm font-bold text-brand-orange">{fmt(selectedFactuur.total_amount ?? selectedFactuur.amount)}</p>
                </div>
              </div>

              {/* Datums */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Factuurdatum</p>
                  <p className="text-sm text-white">{fmtDate(selectedFactuur.issue_date)}</p>
                </div>
                {selectedFactuur.sprint && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-white/40 mb-1">Sprint</p>
                    <p className="text-sm text-white">Sprint {selectedFactuur.sprint.number} — {selectedFactuur.sprint.title}</p>
                  </div>
                )}
              </div>

              {selectedFactuur.description && (
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-white/40 mb-1">Omschrijving</p>
                  <p className="text-sm text-white/80">{selectedFactuur.description}</p>
                </div>
              )}

              {/* Bewerkbare velden */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Bewerken</p>

                <div>
                  <label htmlFor="modal-due-date" className="block text-xs text-white/50 mb-1">Vervaldatum</label>
                  <input
                    id="modal-due-date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
                  />
                </div>

                <div>
                  <label htmlFor="modal-status" className="block text-xs text-white/50 mb-1">Status</label>
                  <select
                    id="modal-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FactuurStatus)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
                  >
                    {(['concept', 'verstuurd', 'betaald', 'herinnering'] as FactuurStatus[]).map(s => (
                      <option key={s} value={s}>{FACTUUR_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {modalError && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
                  {modalError}
                </p>
              )}
              {modalSuccess && (
                <p className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2" role="status">
                  {modalSuccess}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={modalSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-medium disabled:opacity-60"
              >
                {modalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Opslaan
              </button>
              <button
                onClick={() => setSelectedFactuur(null)}
                className="px-4 py-2.5 rounded-lg bg-white/10 text-white/80 text-sm font-medium"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type SocialTab = 'linkedin' | 'instagram' | 'facebook'

function FeedbackTab({ clientId, companyName }: { clientId: string; companyName: string }) {
  const [items, setItems] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({})

  // Publish modal
  const [publishModal, setPublishModal] = useState<{
    open: boolean
    feedbackId: string | null
    feedbackText: string
    feedbackRating: number | null
    data: PublishResult | null
    loading: boolean
    error: string
  }>({
    open: false,
    feedbackId: null,
    feedbackText: '',
    feedbackRating: null,
    data: null,
    loading: false,
    error: '',
  })
  const [socialTab, setSocialTab] = useState<SocialTab>('linkedin')
  const [copiedTab, setCopiedTab] = useState<SocialTab | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/feedback`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError((data as { error?: string }).error || 'Feedback laden mislukt.')
      setLoading(false)
      return
    }
    setItems((data as { feedback: FeedbackRow[] }).feedback ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  async function markAsRead(feedbackId: string) {
    setMarkingRead(prev => ({ ...prev, [feedbackId]: true }))
    const res = await fetch(`/api/admin/feedback/${feedbackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    })
    if (res.ok) {
      setItems(prev => prev.map(item => item.id === feedbackId ? { ...item, is_read: true } : item))
    }
    setMarkingRead(prev => ({ ...prev, [feedbackId]: false }))
  }

  async function openPublishModal(item: FeedbackRow) {
    setPublishModal({
      open: true,
      feedbackId: item.id,
      feedbackText: item.message,
      feedbackRating: item.rating,
      data: null,
      loading: true,
      error: '',
    })
    setSocialTab('linkedin')

    const res = await fetch(`/api/admin/feedback/${item.id}/publiceer`, { method: 'POST' })
    const data = await res.json().catch(() => ({} as { error?: string }))

    if (!res.ok) {
      setPublishModal(prev => ({
        ...prev,
        loading: false,
        error: (data as { error?: string }).error ?? 'Publiceren mislukt.',
      }))
      return
    }

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_published: true } : i))
    setPublishModal(prev => ({ ...prev, loading: false, data: data as PublishResult }))
  }

  async function regenerateSocialPosts() {
    if (!publishModal.feedbackId) return
    setRegenerating(true)
    const res = await fetch(`/api/admin/feedback/${publishModal.feedbackId}/social-post`)
    const data = await res.json().catch(() => ({} as { socialPosts?: PublishResult['socialPosts'] }))
    if (res.ok && publishModal.data) {
      const socialPosts = (data as { socialPosts?: PublishResult['socialPosts'] }).socialPosts
      if (socialPosts) {
        setPublishModal(prev => ({
          ...prev,
          data: prev.data ? { ...prev.data, socialPosts } : null,
        }))
      }
    }
    setRegenerating(false)
  }

  async function copyToClipboard(text: string, tab: SocialTab) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTab(tab)
      setTimeout(() => setCopiedTab(null), 2000)
    } catch {
      // clipboard not available
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-white/60">
        <Loader2 className="w-5 h-5 animate-spin text-brand-orange" /> Feedback laden...
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3" role="alert">{error}</p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={32} className="mx-auto text-white/20 mb-3" />
        <p className="text-white/40 text-sm">Geen feedback voor deze klant</p>
      </div>
    )
  }

  const SOCIAL_TABS: SocialTab[] = ['linkedin', 'instagram', 'facebook']

  return (
    <>
      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white/5 border rounded-xl p-4 ${!item.is_read ? 'border-yellow-500/30' : 'border-white/10'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-2">
                {!item.is_read && (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1" aria-label="Ongelezen" />
                )}
                <div>
                  <p className="text-xs text-white/40">{fmtDate(item.created_at)}</p>
                  <p className="text-xs text-white/60 mt-0.5">
                    {item.sprints?.title ? `Sprint: ${item.sprints.title}` : 'Algemeen'}
                  </p>
                </div>
              </div>
              <StarRating rating={item.rating} />
            </div>
            <p className="text-sm text-white/80 mb-3">{item.message}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {!item.is_read && (
                <button
                  onClick={() => markAsRead(item.id)}
                  disabled={!!markingRead[item.id]}
                  className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-60"
                >
                  {markingRead[item.id]
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCircle2 className="w-3 h-3" />}
                  Markeer als gelezen
                </button>
              )}
              {item.is_published ? (
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-green-600/20 border border-green-500/30 text-green-300">
                  <CheckCircle2 size={10} /> Gepubliceerd ✓
                </span>
              ) : (
                <button
                  onClick={() => openPublishModal(item)}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors"
                >
                  <Sparkles size={10} /> Publiceer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Publish modal */}
      {publishModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !publishModal.loading) setPublishModal(prev => ({ ...prev, open: false })) }}
          role="dialog"
          aria-modal="true"
          aria-label="Review publiceren"
        >
          <div className="w-full sm:max-w-2xl bg-slate-900 border border-white/15 rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[95dvh] sm:max-h-[90dvh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">Publiceer review van {companyName}</p>
                <p className="text-xs text-white/50">WordPress + social media posts</p>
              </div>
              <button
                onClick={() => setPublishModal(prev => ({ ...prev, open: false }))}
                disabled={publishModal.loading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-40"
                aria-label="Sluiten"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Review preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/40">Review</p>
                  <StarRating rating={publishModal.feedbackRating} />
                </div>
                <p className="text-sm text-white/80 italic">&ldquo;{publishModal.feedbackText}&rdquo;</p>
              </div>

              {/* Loading / error */}
              {publishModal.loading && (
                <div className="flex items-center gap-2 text-white/60 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                  Publiceren naar WordPress en social posts genereren...
                </div>
              )}

              {publishModal.error && (
                <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
                  {publishModal.error}
                </p>
              )}

              {publishModal.data && (
                <>
                  {/* WordPress status */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wide mb-3">WordPress</p>
                    {publishModal.data.wordpress.skipped ? (
                      <p className="text-xs text-yellow-300 flex items-center gap-1.5">
                        ⚠️ WordPress niet geconfigureerd — sla env vars in
                      </p>
                    ) : publishModal.data.wordpress.success ? (
                      <div className="flex items-center gap-2 text-xs text-green-300">
                        <CheckCircle2 size={13} />
                        <span>Gepubliceerd op brandiscode.com</span>
                        {publishModal.data.wordpress.url && (
                          <a
                            href={publishModal.data.wordpress.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-brand-blue hover:underline"
                          >
                            Bekijk <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-300">
                        ⚠️ WordPress publicatie mislukt: {publishModal.data.wordpress.reason}
                      </p>
                    )}
                  </div>

                  {/* Social posts */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Social media posts</p>
                      <button
                        onClick={regenerateSocialPosts}
                        disabled={regenerating}
                        className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors disabled:opacity-60"
                        aria-label="Regenereer social posts"
                      >
                        <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
                        Regenereer
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-3">
                      {SOCIAL_TABS.map(tab => (
                        <button
                          key={tab}
                          onClick={() => setSocialTab(tab)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                            socialTab === tab
                              ? 'bg-brand-orange text-white'
                              : 'text-white/50 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Post content */}
                    <div className="space-y-2">
                      <textarea
                        readOnly
                        rows={6}
                        value={publishModal.data.socialPosts[socialTab]}
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none resize-y select-all cursor-text"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                      <button
                        onClick={() => copyToClipboard(publishModal.data!.socialPosts[socialTab], socialTab)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          copiedTab === socialTab
                            ? 'bg-green-600/20 border border-green-500/30 text-green-300'
                            : 'bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/15'
                        }`}
                      >
                        {copiedTab === socialTab
                          ? <><CheckCircle2 size={11} /> Gekopieerd ✓</>
                          : <><Copy size={11} /> Kopieer naar klembord</>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-white/10">
              <button
                onClick={() => setPublishModal(prev => ({ ...prev, open: false }))}
                disabled={publishModal.loading}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-white/10 text-white/80 text-sm font-medium hover:bg-white/15 transition-colors disabled:opacity-60"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const AI_MODE_OPTIONS: Array<{ value: AiMode; label: string }> = [
  { value: 'managed', label: 'Managed' },
  { value: 'byok', label: 'BYOK' },
  { value: 'hybrid', label: 'Hybrid' },
]

const AI_PROVIDER_OPTIONS: Array<{ value: AiProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'github-models', label: 'GitHub Models' },
]

const KEY_STATUS_META: Record<AiKeyStatus, { label: string; className: string }> = {
  unknown: { label: 'Onbekend', className: 'bg-yellow-500/20 text-yellow-300' },
  valid: { label: 'Geldig', className: 'bg-green-500/20 text-green-300' },
  invalid: { label: 'Ongeldig', className: 'bg-red-500/20 text-red-300' },
}

function toFormState(settings: SanitizedClientAiSettings): AiSettingsFormState {
  return {
    ai_mode: settings.ai_mode,
    provider: settings.provider,
    listing_generation_model: settings.listing_generation_model ?? '',
    listing_refinement_model: settings.listing_refinement_model ?? '',
    social_generation_model: settings.social_generation_model ?? '',
    brochure_generation_model: settings.brochure_generation_model ?? '',
    managed_bundle: settings.managed_bundle ?? '',
    fair_use_limit: settings.fair_use_limit ? String(settings.fair_use_limit) : '',
    warning_threshold: String(settings.warning_threshold),
    api_key: '',
  }
}

function AiSettingsTab({ clientId }: { clientId: string }) {
  const [form, setForm] = useState<AiSettingsFormState | null>(null)
  const [settings, setSettings] = useState<SanitizedClientAiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/ai-settings`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({} as { error?: string; settings?: SanitizedClientAiSettings }))

    if (!res.ok || !body.settings) {
      setError(body.error || 'Kon AI instellingen niet laden.')
      setLoading(false)
      return
    }

    setSettings(body.settings)
    setForm(toFormState(body.settings))
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function updateField<K extends keyof AiSettingsFormState>(key: K, value: AiSettingsFormState[K]) {
    setForm((prev) => {
      if (!prev) return prev
      return { ...prev, [key]: value }
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form || !settings) return

    setError('')
    setSuccess('')

    const warningValue = Number(form.warning_threshold)
    if (!Number.isInteger(warningValue) || warningValue < 50 || warningValue > 99) {
      setError('Waarschuwingsdrempel moet tussen 50 en 99 liggen.')
      return
    }

    let fairUseLimit: number | null = null
    if (form.fair_use_limit.trim() !== '') {
      const parsedLimit = Number(form.fair_use_limit)
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        setError('Fair use limiet moet een positief geheel getal zijn of leeg blijven.')
        return
      }
      fairUseLimit = parsedLimit
    }

    const apiKeyRequired =
      form.ai_mode === 'byok' &&
      (settings.key_status === 'unknown' || settings.key_status === 'invalid' || !settings.api_key_last4)

    if (apiKeyRequired && !form.api_key.trim()) {
      setError('Voor BYOK is een API key verplicht zolang de huidige key nog niet geldig is opgeslagen.')
      return
    }

    setSaving(true)

    const payload = {
      ai_mode: form.ai_mode,
      provider: form.provider,
      listing_generation_model: form.listing_generation_model,
      listing_refinement_model: form.listing_refinement_model,
      social_generation_model: form.social_generation_model,
      brochure_generation_model: form.brochure_generation_model,
      managed_bundle: form.managed_bundle,
      fair_use_limit: fairUseLimit,
      warning_threshold: warningValue,
      ...(form.api_key.trim() ? { api_key: form.api_key.trim() } : {}),
    }

    const res = await fetch(`/api/admin/clients/${clientId}/ai-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => ({} as { error?: string; settings?: SanitizedClientAiSettings }))

    if (!res.ok || !body.settings) {
      setError(body.error || 'Opslaan van AI instellingen is mislukt.')
      setSaving(false)
      return
    }

    setSettings(body.settings)
    setForm(toFormState(body.settings))
    setSuccess('AI instellingen zijn succesvol opgeslagen.')
    setSaving(false)
  }

  if (loading || !form || !settings) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3 text-white/70">
        <Loader2 className="w-5 h-5 animate-spin text-brand-orange" /> AI instellingen laden...
      </div>
    )
  }

  const apiKeyRequired =
    form.ai_mode === 'byok' &&
    (settings.key_status === 'unknown' || settings.key_status === 'invalid' || !settings.api_key_last4)

  return (
    <form onSubmit={onSubmit} className="glass-card p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-semibold text-white">AI Instellingen</h2>
          <p className="text-xs text-white/50">Configuratie voor modellen, provider en fair use limieten.</p>
        </div>
        <div className="text-xs text-white/70 flex flex-wrap gap-2">
          <span className={`px-2 py-1 rounded-full ${KEY_STATUS_META[settings.key_status].className}`}>
            Key status: {KEY_STATUS_META[settings.key_status].label}
          </span>
          {settings.api_key_last4 ? (
            <span className="px-2 py-1 rounded-full bg-white/10 text-white/80">
              Key opgeslagen (eindigt op {settings.api_key_last4})
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-white/10 text-white/60">Geen API key opgeslagen</span>
          )}
        </div>
      </div>

      {error ? (
        <div className="glass-card p-3 border border-red-500/40 bg-red-500/10 text-red-200 text-sm" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="glass-card p-3 border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-sm" role="status" aria-live="polite">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ai_mode" className="block text-xs text-white/50 mb-1">AI modus</label>
          <select
            id="ai_mode"
            value={form.ai_mode}
            onChange={(e) => updateField('ai_mode', e.target.value as AiMode)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          >
            {AI_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="provider" className="block text-xs text-white/50 mb-1">Provider</label>
          <select
            id="provider"
            value={form.provider}
            onChange={(e) => updateField('provider', e.target.value as AiProvider)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          >
            {AI_PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="listing_generation_model" className="block text-xs text-white/50 mb-1">Listing generation model</label>
          <input
            id="listing_generation_model"
            type="text"
            value={form.listing_generation_model}
            onChange={(e) => updateField('listing_generation_model', e.target.value)}
            placeholder="bijv. gpt-4.1-mini"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="listing_refinement_model" className="block text-xs text-white/50 mb-1">Listing refinement model</label>
          <input
            id="listing_refinement_model"
            type="text"
            value={form.listing_refinement_model}
            onChange={(e) => updateField('listing_refinement_model', e.target.value)}
            placeholder="bijv. gpt-4.1-mini"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="social_generation_model" className="block text-xs text-white/50 mb-1">Social generation model</label>
          <input
            id="social_generation_model"
            type="text"
            value={form.social_generation_model}
            onChange={(e) => updateField('social_generation_model', e.target.value)}
            placeholder="bijv. claude-3-5-sonnet"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="brochure_generation_model" className="block text-xs text-white/50 mb-1">Brochure generation model</label>
          <input
            id="brochure_generation_model"
            type="text"
            value={form.brochure_generation_model}
            onChange={(e) => updateField('brochure_generation_model', e.target.value)}
            placeholder="bijv. gpt-4.1"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="managed_bundle" className="block text-xs text-white/50 mb-1">Managed bundle</label>
          <input
            id="managed_bundle"
            type="text"
            value={form.managed_bundle}
            onChange={(e) => updateField('managed_bundle', e.target.value)}
            placeholder="bijv. premium-makelaars"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="fair_use_limit" className="block text-xs text-white/50 mb-1">Fair use limiet</label>
          <input
            id="fair_use_limit"
            type="number"
            min={1}
            step={1}
            value={form.fair_use_limit}
            onChange={(e) => updateField('fair_use_limit', e.target.value)}
            placeholder="Leeg = geen limiet"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>

        <div>
          <label htmlFor="warning_threshold" className="block text-xs text-white/50 mb-1">Waarschuwingsdrempel (50-99)</label>
          <input
            id="warning_threshold"
            type="number"
            min={50}
            max={99}
            step={1}
            value={form.warning_threshold}
            onChange={(e) => updateField('warning_threshold', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
          />
        </div>
      </div>

      <div>
        <label htmlFor="api_key" className={`block text-xs mb-1 ${apiKeyRequired ? 'text-red-300' : 'text-white/50'}`}>
          API key {apiKeyRequired ? '(verplicht voor BYOK)' : '(optioneel, alleen bij wijzigen)'}
        </label>
        <input
          id="api_key"
          type="password"
          autoComplete="new-password"
          value={form.api_key}
          onChange={(e) => updateField('api_key', e.target.value)}
          placeholder="Voer alleen in als je de key wilt opslaan of wijzigen"
          className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50 ${
            apiKeyRequired ? 'border-red-400/60' : 'border-white/10'
          }`}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Opslaan
        </button>
        <button
          type="button"
          onClick={loadSettings}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm font-medium disabled:opacity-60"
        >
          Opnieuw laden
        </button>
      </div>
    </form>
  )
}

// ── AI Tools: subnavigatie (Overzicht / Testen / Promptbeheer / Monitoring) ────

type AiToolsSubTab = 'overzicht' | 'testen' | 'promptbeheer' | 'monitoring'

const AI_SUB_TABS: { id: AiToolsSubTab; label: string }[] = [
  { id: 'overzicht', label: 'Overzicht' },
  { id: 'testen', label: 'Testen' },
  { id: 'promptbeheer', label: 'Promptbeheer' },
  { id: 'monitoring', label: 'Monitoring' },
]

const AI_TOOL_NAMES: { value: string; label: string }[] = [
  { value: 'funda-tekst', label: 'Funda-tekst' },
  { value: 'funda-multi', label: 'Funda-multi (4 kanalen)' },
  { value: 'verfijn-tekst', label: 'Verfijn-tekst' },
]

type AiToolsOverview = {
  settings: ClientAiSettings | null
  active_prompt_versions: AiPromptVersion[]
  recent_usage: AiUsageEvent[]
  cost_this_month: number
}

function AiToolsTab({ clientId }: { clientId: string }) {
  const [subTab, setSubTab] = useState<AiToolsSubTab>('overzicht')
  const [toolName, setToolName] = useState<string>(AI_TOOL_NAMES[0].value)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 overflow-x-auto">
        {AI_SUB_TABS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSubTab(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 ${
              subTab === s.id ? 'bg-brand-gold text-brand-dark shadow' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {subTab !== 'overzicht' && (
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="ai-tool-select" className="text-xs text-white/50">Tool</label>
          <select
            id="ai-tool-select"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
          >
            {AI_TOOL_NAMES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      )}

      {subTab === 'overzicht' && <AiOverviewSubTab clientId={clientId} />}
      {subTab === 'testen' && <AiTestSubTab clientId={clientId} toolName={toolName} />}
      {subTab === 'promptbeheer' && <AiPromptBeheerSubTab clientId={clientId} toolName={toolName} />}
      {subTab === 'monitoring' && <AiMonitoringSubTab clientId={clientId} />}
    </div>
  )
}

function AiOverviewSubTab({ clientId }: { clientId: string }) {
  const [overview, setOverview] = useState<AiToolsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({} as { error?: string }))
    if (!res.ok) {
      setError(body.error || 'Kon AI-overzicht niet laden.')
      setLoading(false)
      return
    }
    setOverview(body as AiToolsOverview)
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3 text-white/70">
        <Loader2 className="w-5 h-5 animate-spin text-brand-gold" /> Overzicht laden...
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="glass-card p-4 border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
        {error || 'Geen data beschikbaar.'}
      </div>
    )
  }

  const modeLabel = overview.settings
    ? AI_MODE_OPTIONS.find((o) => o.value === overview.settings!.ai_mode)?.label ?? overview.settings.ai_mode
    : null
  const providerLabel = overview.settings
    ? AI_PROVIDER_OPTIONS.find((o) => o.value === overview.settings!.provider)?.label ?? overview.settings.provider
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Kosten deze maand" value={fmt(overview.cost_this_month)} icon={Euro} variant="accent" />
        <StatCard
          title="Actieve promptversies"
          value={overview.active_prompt_versions.length}
          subtitle="per tool"
          icon={ListChecks}
        />
        <StatCard
          title="Recent gebruik"
          value={overview.recent_usage.length}
          subtitle="laatste runs (excl. testruns)"
          icon={History}
        />
      </div>

      {overview.settings && (
        <div className="glass-card p-4 md:p-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="text-white/50">AI-modus: <span className="text-white">{modeLabel}</span></span>
          <span className="text-white/50">Provider: <span className="text-white">{providerLabel}</span></span>
        </div>
      )}

      {overview.active_prompt_versions.length > 0 && (
        <div className="glass-card p-4 md:p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Actieve promptversies per tool</h3>
          <div className="space-y-2">
            {overview.active_prompt_versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/70">{v.tool_name}</span>
                <span className="status-badge status-positive">v{v.version_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AiSettingsTab clientId={clientId} />
    </div>
  )
}

function AiTestSubTab({ clientId, toolName }: { clientId: string; toolName: string }) {
  const [versions, setVersions] = useState<AiPromptVersion[]>([])
  const [versionId, setVersionId] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    output_text: string
    provider: string
    model: string
    prompt_version_id: string
  } | null>(null)

  useEffect(() => {
    setVersionId('')
    setResult(null)
    setError('')

    async function loadVersions() {
      const res = await fetch(`/api/admin/clients/${clientId}/ai-tools/${toolName}/prompt-versions`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({} as { prompt_versions?: AiPromptVersion[] }))
      if (res.ok) setVersions(body.prompt_versions ?? [])
    }

    loadVersions()
  }, [clientId, toolName])

  async function handleTest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim()) {
      setError('Testinvoer is verplicht.')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools/${toolName}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_input: input,
        ...(versionId ? { prompt_version_id: versionId } : {}),
      }),
    })
    const body = await res.json().catch(() => ({} as { error?: string }))

    if (!res.ok) {
      setError(body.error || 'Testrun mislukt.')
      setLoading(false)
      return
    }

    setResult(body as { output_text: string; provider: string; model: string; prompt_version_id: string })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 border border-amber-500/30 bg-amber-500/10 text-amber-200 text-sm flex items-start gap-2">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>TEST-omgeving — deze uitvoer is niet zichtbaar voor de klant en telt niet mee in het klantquotum.</span>
      </div>

      <form onSubmit={handleTest} className="glass-card p-4 md:p-6 space-y-4">
        <div>
          <label htmlFor="test-version" className="block text-xs text-white/50 mb-1">Promptversie</label>
          <select
            id="test-version"
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
          >
            <option value="">Actieve versie (standaard)</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version_number}{v.is_active ? ' — actief' : ''}{v.notes ? ` — ${v.notes}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="test-input" className="block text-xs text-white/50 mb-1">Testinvoer</label>
          <textarea
            id="test-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Bijv. woningkenmerken: vrijstaande woning, 4 slaapkamers, tuin op het zuiden, Tholen..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
          />
        </div>

        {error ? (
          <div className="glass-card p-3 border border-red-500/40 bg-red-500/10 text-red-200 text-sm" role="alert">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
          Testen uitvoeren
        </button>
      </form>

      {result ? (
        <div className="glass-card p-4 md:p-6 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-white">Gegenereerde output</h3>
            <span className="text-xs text-white/40">{result.provider} · {result.model}</span>
          </div>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{result.output_text}</p>
        </div>
      ) : null}
    </div>
  )
}

function AiPromptBeheerSubTab({ clientId, toolName }: { clientId: string; toolName: string }) {
  const [versions, setVersions] = useState<AiPromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [activateNew, setActivateNew] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools/${toolName}/prompt-versions`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({} as { prompt_versions?: AiPromptVersion[]; error?: string }))
    if (!res.ok) {
      setError(body.error || 'Kon promptversies niet laden.')
      setLoading(false)
      return
    }
    setVersions(body.prompt_versions ?? [])
    setLoading(false)
  }, [clientId, toolName])

  useEffect(() => {
    loadVersions()
    setShowForm(false)
    setError('')
  }, [loadVersions])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newPrompt.trim()) {
      setError('System prompt is verplicht.')
      return
    }

    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools/${toolName}/prompt-versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_prompt: newPrompt,
        notes: newNotes.trim() || undefined,
        activate: activateNew,
      }),
    })
    const body = await res.json().catch(() => ({} as { error?: string }))

    setSaving(false)

    if (!res.ok) {
      setError(body.error || 'Aanmaken van promptversie is mislukt.')
      return
    }

    setNewPrompt('')
    setNewNotes('')
    setActivateNew(true)
    setShowForm(false)
    await loadVersions()
  }

  // Er is geen los "activeren"-endpoint: een eerdere versie activeren maakt een
  // nieuwe versie aan met dezelfde promptinhoud, direct actief. Zo blijft de
  // volledige geschiedenis behouden en wordt de bestaande API niet aangepast.
  async function handleActivate(version: AiPromptVersion) {
    setActivatingId(version.id)
    setError('')

    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools/${toolName}/prompt-versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_prompt: version.system_prompt,
        notes: version.notes ?? undefined,
        activate: true,
      }),
    })
    const body = await res.json().catch(() => ({} as { error?: string }))

    setActivatingId(null)

    if (!res.ok) {
      setError(body.error || 'Activeren is mislukt.')
      return
    }

    await loadVersions()
  }

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3 text-white/70">
        <Loader2 className="w-5 h-5 animate-spin text-brand-gold" /> Promptversies laden...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="glass-card p-3 border border-red-500/40 bg-red-500/10 text-red-200 text-sm" role="alert">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleCreate} className="glass-card p-4 md:p-6 space-y-3">
          <div>
            <label htmlFor="new-system-prompt" className="block text-xs text-white/50 mb-1">System prompt</label>
            <textarea
              id="new-system-prompt"
              rows={8}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Volledige systeeminstructie voor deze tool..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <div>
            <label htmlFor="new-notes" className="block text-xs text-white/50 mb-1">Notities (optioneel)</label>
            <input
              id="new-notes"
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Bijv. kortere zinnen, meer nadruk op tuin"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-brand-gold/50"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={activateNew}
              onChange={(e) => setActivateNew(e.target.checked)}
              className="rounded"
            />
            Meteen activeren na aanmaken
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/10 text-white/80 text-sm font-medium disabled:opacity-60"
            >
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-dark text-sm font-semibold"
        >
          <PlusCircle className="w-4 h-4" /> Nieuwe versie
        </button>
      )}

      {versions.length === 0 ? (
        <div className="glass-card p-6 text-center text-white/40 text-sm">
          Nog geen promptversies voor deze tool.
        </div>
      ) : (
        <div className="glass-card divide-y divide-white/5">
          {versions.map((v) => (
            <div key={v.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">v{v.version_number}</span>
                  <span className={`status-badge ${v.is_active ? 'status-positive' : 'status-neutral'}`}>
                    {v.is_active ? 'Actief' : 'Niet actief'}
                  </span>
                </div>
                {v.notes && <p className="text-xs text-white/50 mt-1">{v.notes}</p>}
                <p className="text-xs text-white/30 mt-1">
                  Aangemaakt {fmtDateTime(v.created_at)}{v.created_by ? ` door ${v.created_by}` : ''}
                </p>
              </div>
              {!v.is_active && (
                <button
                  onClick={() => handleActivate(v)}
                  disabled={activatingId === v.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-dark text-xs font-semibold disabled:opacity-60 shrink-0"
                >
                  {activatingId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                  Activeren
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AiMonitoringSubTab({ clientId }: { clientId: string }) {
  const [overview, setOverview] = useState<AiToolsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/clients/${clientId}/ai-tools`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({} as { error?: string }))
    if (!res.ok) {
      setError(body.error || 'Kon monitoringgegevens niet laden.')
      setLoading(false)
      return
    }
    setOverview(body as AiToolsOverview)
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center gap-3 text-white/70">
        <Loader2 className="w-5 h-5 animate-spin text-brand-gold" /> Monitoring laden...
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="glass-card p-4 border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
        {error || 'Geen data beschikbaar.'}
      </div>
    )
  }

  const successCount = overview.recent_usage.filter((u) => u.request_status === 'success').length
  const errorCount = overview.recent_usage.length - successCount

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Kosten deze maand" value={fmt(overview.cost_this_month)} icon={Euro} variant="accent" />
        <StatCard
          title="Geslaagde runs"
          value={successCount}
          subtitle={`van laatste ${overview.recent_usage.length}`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Mislukte runs"
          value={errorCount}
          subtitle={`van laatste ${overview.recent_usage.length}`}
          icon={AlertTriangle}
        />
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/10">
              <th className="p-3 font-medium">Datum</th>
              <th className="p-3 font-medium">Tool</th>
              <th className="p-3 font-medium">Provider / model</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Kosten</th>
            </tr>
          </thead>
          <tbody>
            {overview.recent_usage.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-white/40">Nog geen gebruik geregistreerd.</td>
              </tr>
            ) : (
              overview.recent_usage.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="p-3 text-white/70 whitespace-nowrap">{fmtDateTime(u.created_at)}</td>
                  <td className="p-3 text-white/70">{u.tool_name}</td>
                  <td className="p-3 text-white/50">{u.provider} · {u.model}</td>
                  <td className="p-3">
                    <span className={`status-badge ${u.request_status === 'success' ? 'status-positive' : 'status-warning'}`}>
                      {u.request_status === 'success' ? 'Geslaagd' : 'Mislukt'}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">{u.estimated_cost != null ? fmt(u.estimated_cost) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Derive active tab directly from URL — avoids state-reset race with searchParams effect
  const rawTab = searchParams.get('tab')
  const tab: Tab = (rawTab === 'overzicht' || rawTab === 'offertes' || rawTab === 'training' || rawTab === 'facturen' || rawTab === 'feedback' || rawTab === 'ai') ? rawTab : 'overzicht'

  function handleTabChange(tabId: Tab) {
    router.replace(`/admin/clients/${id}?tab=${tabId}`)
  }

  const loadClientDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    const res = await fetch(`/api/admin/clients/${id}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Kon klant niet laden')
      setLoading(false)
      return
    }
    setData(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadClientDetail()
  }, [loadClientDetail])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-orange" size={32} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Klant niet gevonden'}</p>
        <button onClick={() => router.back()} className="text-sm text-white/60 hover:text-white">← Terug</button>
      </div>
    )
  }

  const { client, offertes, trainingen, facturen } = data
  const displayName = client.company || client.name

  const BADGE_COUNTS: Record<Tab, number> = {
    overzicht: 0,
    offertes: offertes.length,
    training: trainingen.length,
    facturen: facturen.length,
    feedback: 0,
    ai: 0,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/admin/clients')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 size={18} className="text-brand-orange shrink-0" />
              <h1 className="text-lg md:text-2xl font-bold text-white truncate">{displayName}</h1>
              {client.onboarding_completed_at && (
                <CheckCircle2 size={16} className="text-green-400 shrink-0" aria-label="Onboarding voltooid" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-white/40 flex-wrap">
              {client.email && <span className="flex items-center gap-1"><Mail size={11} />{client.email}</span>}
              {client.phone && <span className="flex items-center gap-1"><Phone size={11} />{client.phone}</span>}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 justify-center ${
                tab === t.id
                  ? 'bg-brand-orange text-white shadow'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
              {BADGE_COUNTS[t.id] > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
                  tab === t.id ? 'bg-white/20' : 'bg-white/10'
                }`}>
                  {BADGE_COUNTS[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* tab content */}
        <div>
          {tab === 'overzicht' && <OverzichtTab client={client} />}
          {tab === 'offertes' && <OffertesTab offertes={offertes} clientId={client.id} clientEmail={client.email} />}
          {tab === 'training' && <TrainingTab trainingen={trainingen} clientId={client.id} onSessionPlanned={loadClientDetail} />}
          {tab === 'facturen' && <FacturenTab facturen={facturen} clientId={client.id} onRefresh={loadClientDetail} />}
          {tab === 'feedback' && <FeedbackTab clientId={client.id} companyName={client.company || client.name || 'klant'} />}
          {tab === 'ai' && <AiToolsTab clientId={client.id} />}
        </div>
      </div>
    </div>
  )
}
