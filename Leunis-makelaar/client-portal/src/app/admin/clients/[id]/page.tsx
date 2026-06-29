'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import type { Client, Factuur, FactuurStatus, Offerte, OfferteStatus, Sprint, TrainingIntake, TrainingIntakeStatus } from '@/lib/types'

// ── local sub-types ───────────────────────────────────────────────────────────
interface TrainingRow extends TrainingIntake {
  completeness: number
  readyForTraining: boolean
  memberCount: number
  sessionCount: number
}

interface OfferteRow extends Offerte {
  sprints: Sprint[]
}

interface ClientDetail {
  client: Client
  offertes: OfferteRow[]
  trainingen: TrainingRow[]
  facturen: Factuur[]
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

// ── tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'overzicht' | 'offertes' | 'training' | 'facturen'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overzicht', label: 'Overzicht', icon: <User size={15} /> },
  { id: 'offertes', label: 'Offertes', icon: <FileText size={15} /> },
  { id: 'training', label: 'Training', icon: <GraduationCap size={15} /> },
  { id: 'facturen', label: 'Facturen', icon: <CreditCard size={15} /> },
]

// ── sub-sections ──────────────────────────────────────────────────────────────

function OverzichtTab({ client }: { client: Client }) {
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
  )
}

function OffertesTab({ offertes, clientId }: { offertes: OfferteRow[]; clientId: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href={`/admin/offertes?client=${clientId}`}
          className="text-xs text-brand-orange hover:text-brand-orange/80 flex items-center gap-1"
        >
          Nieuwe offerte <ChevronRight size={12} />
        </Link>
      </div>
      {offertes.length === 0 && (
        <p className="text-white/40 text-sm text-center py-8">Geen offertes voor deze klant</p>
      )}
      {offertes.map(o => (
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
                o.sprints.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs text-white">Sprint {s.number} — {s.title}</p>
                      <p className="text-xs text-white/40">{fmt(s.amount)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      s.status === 'afgerond' ? 'bg-green-500/20 text-green-300' :
                      s.status === 'actief' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-white/10 text-white/50'
                    }`}>{s.status}</span>
                  </div>
                ))
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

function TrainingTab({ trainingen, clientId }: { trainingen: TrainingRow[]; clientId: string }) {
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
        <p className="text-white/40 text-sm text-center py-8">Geen training intakes voor deze klant</p>
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
        </div>
      ))}
    </div>
  )
}

function FacturenTab({ facturen, clientId }: { facturen: Factuur[]; clientId: string }) {
  const totaalOpenstaand = facturen
    .filter(f => f.status === 'verstuurd' || f.status === 'herinnering')
    .reduce((sum, f) => sum + (f.total_amount ?? 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {totaalOpenstaand > 0 && (
          <p className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5">
            Openstaand: {fmt(totaalOpenstaand)}
          </p>
        )}
        <Link
          href={`/admin/facturen?client=${clientId}`}
          className="text-xs text-brand-orange hover:text-brand-orange/80 flex items-center gap-1 ml-auto"
        >
          Nieuwe factuur <ChevronRight size={12} />
        </Link>
      </div>
      {facturen.length === 0 && (
        <p className="text-white/40 text-sm text-center py-8">Geen facturen voor deze klant</p>
      )}
      {facturen.map(f => (
        <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
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
        </div>
      ))}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('overzicht')

  useEffect(() => {
    async function load() {
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
    }
    if (id) load()
  }, [id])

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
              onClick={() => setTab(t.id)}
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
          {tab === 'offertes' && <OffertesTab offertes={offertes} clientId={client.id} />}
          {tab === 'training' && <TrainingTab trainingen={trainingen} clientId={client.id} />}
          {tab === 'facturen' && <FacturenTab facturen={facturen} clientId={client.id} />}
        </div>
      </div>
    </div>
  )
}
