'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, MessageSquareWarning, Send } from 'lucide-react'

interface SessionLite {
  id: string
  status: string
  session_start: string | null
  session_end: string | null
  location_or_link: string | null
}

export default function TrainingBevestigingPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [status, setStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned' | null>(null)
  const [session, setSession] = useState<SessionLite | null>(null)
  const [proposalDateTime, setProposalDateTime] = useState('')
  const [proposalReason, setProposalReason] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      const res = await fetch('/api/training-intake', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Kon trainingsinformatie niet laden.')
        setLoading(false)
        return
      }

      setStatus(data?.intake?.status ?? null)

      const nextSession = Array.isArray(data?.sessions)
        ? data.sessions.find((item: SessionLite) => item.status === 'proposed' || item.status === 'confirmed') || null
        : null

      setSession(nextSession)
      setLoading(false)
    }

    load()
  }, [])

  const canConfirm = useMemo(() => status === 'planned' && Boolean(session), [status, session])

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
        setError('Bevestigings-API is nog niet beschikbaar. Backend moet deze route nog opleveren.')
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
        setError('Bevestigings-API is nog niet beschikbaar. Backend moet deze route nog opleveren.')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Voorstel versturen is mislukt.')
      }
      setSubmitting(false)
      return
    }

    setSuccess('Je alternatieve datum is verstuurd. We komen snel bij je terug met bevestiging.')
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
        <p className="text-white/50 mt-1">Bevestig je ingeplande trainingsmoment of stel een alternatief moment voor.</p>
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

      {!canConfirm ? (
        <div className="glass-card p-6 border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-yellow-100 font-medium flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4" />
            Er is nog geen ingeplande sessie om te bevestigen.
          </p>
          <p className="text-yellow-50/80 text-sm mt-2">
            Zodra de status op Gepland staat en er een voorstel klaarstaat, kun je hier accepteren of een alternatieve datum doorgeven.
          </p>
          <Link href="/dashboard/onboarding" className="inline-block mt-4 text-sm text-brand-gold hover:underline">
            Naar Training Intake →
          </Link>
        </div>
      ) : (
        <>
          <div className="glass-card p-6 space-y-2">
            <p className="text-sm text-white/60">Voorgesteld moment</p>
            <p className="text-white font-semibold">
              {session?.session_start
                ? new Date(session.session_start).toLocaleString('nl-NL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : 'Nog niet bekend'}
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

          <form onSubmit={handleProposeOtherDate} className="glass-card p-6 space-y-4">
            <h2 className="text-white font-semibold">Andere datum voorstellen</h2>

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
                placeholder="Bijvoorbeeld: liever in de ochtend i.v.m. teamplanning"
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
        </>
      )}
    </div>
  )
}
