'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CalendarCheck, CalendarX, CheckCircle2, Clock, Loader2, MapPin } from 'lucide-react'

interface SessionData {
  id: string
  status: string
  session_start: string | null
  session_end: string | null
  proposed_duration_hours: number | null
  location_or_link: string | null
  agenda: string | null
  confirmed_at: string | null
  client_proposed_datetime: string | null
}

function fmtDateTime(iso: string | null) {
  if (!iso) return 'Nader te bepalen'
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}

type ViewState = 'loading' | 'ready' | 'already-confirmed' | 'confirm-success' | 'reschedule-form' | 'reschedule-success' | 'error'

export default function TrainingBevestigingPage() {
  const { token } = useParams<{ token: string }>()
  const searchParams = useSearchParams()
  const defaultAction = searchParams.get('actie') === 'tegenvoorstel' ? 'reschedule-form' : 'ready'

  const [view, setView] = useState<ViewState>('loading')
  const [session, setSession] = useState<SessionData | null>(null)
  const [contactPerson, setContactPerson] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // reschedule form state
  const [proposedDate, setProposedDate] = useState('')
  const [proposedTime, setProposedTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/training-session/${token}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMsg(body.error || 'Ongeldig of verlopen bevestigingslink')
        setView('error')
        return
      }
      const data = await res.json()
      setSession(data.session)
      setContactPerson(data.contactPerson ?? '')
      setCompanyName(data.companyName ?? '')

      if (data.session.status === 'confirmed') {
        setView('already-confirmed')
      } else if (defaultAction === 'reschedule-form') {
        setView('reschedule-form')
      } else {
        setView('ready')
      }
    }
    if (token) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleConfirm() {
    setSubmitting(true)
    const res = await fetch(`/api/training-session/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    setSubmitting(false)
    if (res.ok) {
      setView('confirm-success')
    } else {
      const body = await res.json().catch(() => ({}))
      setErrorMsg(body.error || 'Er is iets misgegaan')
      setView('error')
    }
  }

  async function handleReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (!proposedDate) return
    setSubmitting(true)

    const proposed_datetime = new Date(`${proposedDate}T${proposedTime}:00`).toISOString()

    const res = await fetch(`/api/training-session/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', proposed_datetime, reason }),
    })
    setSubmitting(false)
    if (res.ok) {
      setView('reschedule-success')
    } else {
      const body = await res.json().catch(() => ({}))
      setErrorMsg(body.error || 'Er is iets misgegaan')
      setView('error')
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (view === 'loading') {
    return (
      <PageShell>
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-orange" size={36} />
        </div>
      </PageShell>
    )
  }

  if (view === 'error') {
    return (
      <PageShell>
        <div className="text-center py-12">
          <CalendarX size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Link niet geldig</h2>
          <p className="text-white/50">{errorMsg}</p>
        </div>
      </PageShell>
    )
  }

  if (view === 'already-confirmed') {
    return (
      <PageShell>
        <div className="text-center py-12">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Al bevestigd</h2>
          <p className="text-white/60">
            Deze training is bevestigd op {fmtDateTime(session?.confirmed_at ?? null)}.
          </p>
        </div>
      </PageShell>
    )
  }

  if (view === 'confirm-success') {
    return (
      <PageShell>
        <div className="text-center py-12">
          <CheckCircle2 size={56} className="text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Bevestigd!</h2>
          <p className="text-white/70 max-w-sm mx-auto">
            Super! We zien jullie op {fmtDateTime(session?.session_start ?? null)}.
            Je ontvangt een bevestigingsmail.
          </p>
        </div>
      </PageShell>
    )
  }

  if (view === 'reschedule-success') {
    return (
      <PageShell>
        <div className="text-center py-12">
          <CalendarCheck size={56} className="text-brand-orange mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Tegenvoorstel ontvangen</h2>
          <p className="text-white/70 max-w-sm mx-auto">
            We nemen snel contact met je op om een nieuwe datum te prikken.
          </p>
        </div>
      </PageShell>
    )
  }

  if (view === 'reschedule-form') {
    return (
      <PageShell>
        <h2 className="text-xl font-bold text-white mb-1">Tegenvoorstel doen</h2>
        <p className="text-white/50 text-sm mb-6">
          Geef een datum en tijd op die beter uitkomt.
        </p>
        <form onSubmit={handleReschedule} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Gewenste datum <span className="text-red-400">*</span></label>
            <input
              type="date"
              required
              value={proposedDate}
              onChange={e => setProposedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Gewenste tijd</label>
            <input
              type="time"
              value={proposedTime}
              onChange={e => setProposedTime(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Toelichting (optioneel)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Waarom past de voorgestelde datum niet?"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-orange/50 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setView('ready')}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
            >
              Terug
            </button>
            <button
              type="submit"
              disabled={submitting || !proposedDate}
              className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-semibold text-sm hover:bg-brand-orange/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Tegenvoorstel sturen'}
            </button>
          </div>
        </form>
      </PageShell>
    )
  }

  // view === 'ready'
  return (
    <PageShell>
      <p className="text-white/60 text-sm mb-6">
        Hoi {contactPerson || companyName || 'klant'}, hieronder zie je het trainingsvoorstel.
        Bevestig de datum of doe een tegenvoorstel.
      </p>

      {/* session details */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-4">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Datum & Tijd</p>
          <p className="text-brand-orange font-semibold">{fmtDateTime(session?.session_start ?? null)}</p>
        </div>
        {session?.proposed_duration_hours && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock size={14} />
            <span>{session.proposed_duration_hours} uur</span>
          </div>
        )}
        {session?.location_or_link && (
          <div className="flex items-start gap-2 text-sm text-white/70">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span>{session.location_or_link}</span>
          </div>
        )}
        {session?.agenda && (
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Agenda</p>
            <ul className="space-y-1">
              {session.agenda.split('\n').filter(Boolean).map((line, i) => (
                <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                  <span className="text-brand-orange mt-0.5">•</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="space-y-3">
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="w-full py-4 bg-brand-orange text-white font-bold rounded-xl text-base hover:bg-brand-orange/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <Loader2 className="animate-spin" size={20} />
            : <><CalendarCheck size={20} /> Datum bevestigen</>}
        </button>
        <button
          onClick={() => setView('reschedule-form')}
          disabled={submitting}
          className="w-full py-3 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/5 transition-colors"
        >
          Tegenvoorstel doen
        </button>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center p-4 pt-16">
      <div className="w-full max-w-md">
        {/* branding */}
        <div className="text-center mb-8">
          <p className="text-brand-orange font-bold text-sm tracking-widest uppercase mb-1">Brand is Code</p>
          <h1 className="text-2xl font-bold text-white">Trainingsvoorstel</h1>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {children}
        </div>
        <p className="text-center text-xs text-white/20 mt-6">
          © {new Date().getFullYear()} Brand is Code · <a href="https://brandiscode.com" className="hover:text-white/40">brandiscode.com</a>
        </p>
      </div>
    </div>
  )
}
