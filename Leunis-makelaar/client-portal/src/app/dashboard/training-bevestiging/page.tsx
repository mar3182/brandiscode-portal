'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck2, CheckCircle2, Loader2, MessageSquareWarning, Send } from 'lucide-react'

interface SessionLite {
  id: string
  status: string
  session_start: string | null
  session_end: string | null
  location_or_link: string | null
}

interface SlotLite {
  id: string
  slot_start: string
  slot_end: string | null
  location_or_link: string | null
  is_selected: boolean
}

function fmtSlot(iso: string) {
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam',
  }).format(new Date(iso))
}

export default function TrainingBevestigingPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectingSlot, setSelectingSlot] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [intakeStatus, setIntakeStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned' | null>(null)
  const [session, setSession] = useState<SessionLite | null>(null)
  const [slots, setSlots] = useState<SlotLite[]>([])
  const [proposalDateTime, setProposalDateTime] = useState('')
  const [proposalReason, setProposalReason] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      const [intakeRes, slotsRes] = await Promise.all([
        fetch('/api/training-intake', { cache: 'no-store' }),
        fetch('/api/training-slots', { cache: 'no-store' }),
      ])

      const intakeData = await intakeRes.json().catch(() => ({}))
      const slotsData = await slotsRes.json().catch(() => ({}))

      if (!intakeRes.ok) {
        setError(intakeData.error || 'Kon trainingsinformatie niet laden.')
        setLoading(false)
        return
      }

      setIntakeStatus(intakeData?.intake?.status ?? null)

      const nextSession = Array.isArray(intakeData?.sessions)
        ? intakeData.sessions.find((item: SessionLite) => item.status === 'proposed' || item.status === 'confirmed') || null
        : null

      setSession(nextSession)
      setSlots(Array.isArray(slotsData?.slots) ? slotsData.slots : [])
      setLoading(false)
    }

    load()
  }, [])

  const openSlots = useMemo(() => slots.filter(s => !s.is_selected), [slots])
  const selectedSlot = useMemo(() => slots.find(s => s.is_selected) ?? null, [slots])
  const canConfirm = useMemo(() => intakeStatus === 'planned' && Boolean(session), [intakeStatus, session])
  const hasSlots = openSlots.length > 0

  async function handleSelectSlot(slotId: string) {
    setSelectingSlot(slotId)
    setError('')
    setSuccess('')

    const res = await fetch(`/api/training-slots/${slotId}/select`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(data.error || 'Slot kiezen mislukt.')
      setSelectingSlot(null)
      return
    }

    setSuccess('Bedankt! Je trainingsmoment is bevestigd. We sturen je een bevestigingsmail.')
    // Herlaad slots
    const slotsRes = await fetch('/api/training-slots', { cache: 'no-store' })
    const slotsData = await slotsRes.json().catch(() => ({}))
    setSlots(Array.isArray(slotsData?.slots) ? slotsData.slots : [])
    setSelectingSlot(null)
  }

  async function handleAccept() {
    setSubmitting(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/training-intake/confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept', session_id: session?.id }),
    })

    if (!res.ok) {
      if (res.status === 404) {
        setError('Bevestigings-API is nog niet beschikbaar.')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Bevestigen is mislukt.')
      }
      setSubmitting(false)
      return
    }

    setSuccess('Bedankt. Je trainingsmoment is bevestigd.')
    setSubmitting(false)
  }

  async function handleProposeOtherDate(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    if (!proposalDateTime) {
      setError('Kies eerst een nieuw voorkeursmoment.')
      setSubmitting(false)
      return
    }

    const res = await fetch('/api/training-intake/confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'propose_other_date',
        session_id: session?.id,
        proposed_datetime: proposalDateTime,
        note: proposalReason,
      }),
    })

    if (!res.ok) {
      if (res.status === 404) {
        setError('Bevestigings-API is nog niet beschikbaar.')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Voorstel versturen is mislukt.')
      }
      setSubmitting(false)
      return
    }

    setSuccess('Je alternatieve datum is verstuurd. We komen snel bij je terug.')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="glass-card p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto" />
          <p className="text-white/50 text-sm mt-3">Trainingsvoorstel laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Training bevestigen</h1>
        <p className="text-white/50 mt-1">Kies een beschikbaar moment of bevestig je ingeplande training.</p>
      </div>

      {error ? (
        <div className="glass-card border border-red-500/40 p-4 text-red-200" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="glass-card border border-green-500/40 p-4 text-green-200" role="status" aria-live="polite">
          {success}
        </div>
      ) : null}

      {/* Geselecteerde slot bevestiging */}
      {selectedSlot && (
        <div className="glass-card border border-green-500/30 bg-green-500/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <p className="text-green-300 font-semibold">Training ingepland</p>
          </div>
          <p className="text-white font-medium">{fmtSlot(selectedSlot.slot_start)}</p>
          {selectedSlot.location_or_link && (
            <p className="text-sm text-white/60 mt-1">Locatie: {selectedSlot.location_or_link}</p>
          )}
        </div>
      )}

      {/* Tijdsloten kiezen */}
      {hasSlots && !selectedSlot && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarCheck2 className="w-5 h-5 text-brand-orange" />
            <h2 className="text-white font-semibold">Kies een tijdslot</h2>
          </div>
          <p className="text-sm text-white/60">We hebben {openSlots.length} moment{openSlots.length !== 1 ? 'en' : ''} voor je vrijgehouden. Kies wat jou het beste uitkomt:</p>

          <div className="space-y-3">
            {openSlots.map(slot => (
              <div key={slot.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-white font-medium">{fmtSlot(slot.slot_start)}</p>
                  {slot.location_or_link && (
                    <p className="text-sm text-white/50 mt-0.5">{slot.location_or_link}</p>
                  )}
                </div>
                <button
                  onClick={() => handleSelectSlot(slot.id)}
                  disabled={selectingSlot !== null}
                  className="ml-4 shrink-0 px-4 py-2 rounded-lg bg-brand-orange text-white text-sm font-medium hover:bg-brand-orange/80 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {selectingSlot === slot.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Dit moment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bestaande sessie bevestigen (old flow) */}
      {canConfirm && !hasSlots && !selectedSlot && (
        <>
          <div className="glass-card p-6 space-y-2">
            <p className="text-sm text-white/60">Voorgesteld moment</p>
            <p className="text-white font-semibold">
              {session?.session_start ? fmtSlot(session.session_start) : 'Nog niet bekend'}
            </p>
            {session?.location_or_link ? (
              <p className="text-sm text-white/70">Locatie / link: {session.location_or_link}</p>
            ) : null}
          </div>

          <div className="glass-card p-6">
            <button
              onClick={handleAccept}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-green-500/80 hover:bg-green-500 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Accepteren
            </button>
          </div>
        </>
      )}

      {/* Alternatieve datum voorstellen */}
      {(canConfirm || hasSlots) && !selectedSlot && (
        <form onSubmit={handleProposeOtherDate} className="glass-card p-6 space-y-4">
          <h2 className="text-white font-semibold">Geen van deze momenten schikt?</h2>
          <p className="text-sm text-white/60">Stel zelf een alternatief moment voor en we zoeken een oplossing.</p>

          <div>
            <label htmlFor="proposalDate" className="block text-sm text-white/60 mb-1.5">Nieuw voorkeursmoment *</label>
            <input
              id="proposalDate"
              type="datetime-local"
              value={proposalDateTime}
              onChange={(e) => setProposalDateTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-gold/50"
            />
          </div>

          <div>
            <label htmlFor="proposalReason" className="block text-sm text-white/60 mb-1.5">Toelichting (optioneel)</label>
            <textarea
              id="proposalReason"
              value={proposalReason}
              onChange={(e) => setProposalReason(e.target.value)}
              className="w-full px-4 py-2.5 min-h-24 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-gold/50"
              placeholder="Bijv. liever in de ochtend i.v.m. teamplanning"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-gold text-black font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Alternatief versturen
          </button>
        </form>
      )}

      {/* Geen slots en geen sessie */}
      {!hasSlots && !canConfirm && !selectedSlot && (
        <div className="glass-card p-6 border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-yellow-100 font-medium flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4" />
            Er zijn nog geen tijdsloten beschikbaar.
          </p>
          <p className="text-yellow-50/80 text-sm mt-2">
            Zodra we trainingsdata voor je hebben vrijgehouden, zie je die hier. We laten je weten zodra je een keuze kunt maken.
          </p>
          <Link href="/dashboard/onboarding" className="inline-block mt-4 text-sm text-brand-gold hover:underline">
            Naar Training Intake →
          </Link>
        </div>
      )}
    </div>
  )
}

