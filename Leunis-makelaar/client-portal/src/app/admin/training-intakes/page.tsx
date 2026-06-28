'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Download, Loader2, NotebookPen } from 'lucide-react'

interface IntakeRow {
  id: string
  client_id: string
  status: 'draft' | 'submitted' | 'reviewed' | 'planned'
  contact_person: string | null
  contact_email: string | null
  training_duration: '2u' | '3u' | null
  preferred_datetime: string | null
  trainer_notes: string | null
  readyForTraining: boolean
  missingRequiredFields: string[]
  clients?: {
    company?: string | null
    name?: string | null
    email?: string | null
  }
  training_intake_members?: Array<{ id: string }>
  training_sessions?: Array<{
    id: string
    status: string
    session_start: string | null
    location_or_link: string | null
  }>
}

const INPUT_CLASS = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50'

export default function AdminTrainingIntakesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<IntakeRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [trainerNotes, setTrainerNotes] = useState('')
  const [status, setStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned'>('draft')
  const [sessionStart, setSessionStart] = useState('')
  const [sessionEnd, setSessionEnd] = useState('')
  const [sessionDuration, setSessionDuration] = useState<2 | 3 | ''>('')
  const [sessionLink, setSessionLink] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/training-intakes', { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Intakes laden is mislukt.')
      setLoading(false)
      return
    }

    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const active = useMemo(() => rows.find((item) => item.id === activeId) || null, [rows, activeId])

  useEffect(() => {
    if (!active) return
    setTrainerNotes(active.trainer_notes || '')
    setStatus(active.status)
    setSessionStart('')
    setSessionEnd('')
    setSessionDuration('')
    setSessionLink('')
  }, [active])

  async function saveReview(addSession: boolean) {
    if (!active) return
    setSaving(true)
    setError('')

    const payload: Record<string, unknown> = {
      intake_id: active.id,
      status,
      trainer_notes: trainerNotes,
    }

    if (addSession) {
      payload.session = {
        status: 'proposed',
        session_start: sessionStart || undefined,
        session_end: sessionEnd || undefined,
        proposed_duration_hours: sessionDuration || undefined,
        location_or_link: sessionLink || undefined,
      }
    }

    const res = await fetch('/api/admin/training-intakes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Opslaan mislukt.')
      setSaving(false)
      return
    }

    await loadData()
    setSaving(false)
  }

  async function exportCsv(clientId: string) {
    window.location.href = `/api/admin/training-intakes/export?client_id=${encodeURIComponent(clientId)}`
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Training Intakes</h1>
        <p className="text-white/50 mt-1">Overzicht van intake-statussen: draft, submitted, reviewed en planned.</p>
      </div>

      {error ? <div className="glass-card border border-red-500/40 p-4 text-red-300 mb-4">{error}</div> : null}

      {loading ? (
        <div className="glass-card p-10 text-center">
          <Loader2 className="w-7 h-7 text-brand-orange animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-4 sm:p-6 space-y-3">
            {rows.length === 0 ? (
              <p className="text-white/50">Nog geen training intakes.</p>
            ) : rows.map((row) => (
              <button
                key={row.id}
                onClick={() => setActiveId(row.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${activeId === row.id ? 'border-brand-orange/60 bg-brand-orange/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-semibold">{row.clients?.company || row.clients?.name || 'Onbekende klant'}</p>
                    <p className="text-white/50 text-sm">{row.contact_person || '-'} · {row.contact_email || row.clients?.email || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${row.readyForTraining ? 'text-green-300 border-green-500/40 bg-green-500/10' : 'text-yellow-200 border-yellow-500/40 bg-yellow-500/10'}`}>
                      {row.readyForTraining ? 'Ready for training' : 'Incompleet'}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full border border-white/20 text-white/80">{row.status}</span>
                  </div>
                </div>
                {row.missingRequiredFields.length > 0 ? (
                  <p className="text-xs text-yellow-200 mt-2">Ontbreekt: {row.missingRequiredFields.join(', ')}</p>
                ) : null}
              </button>
            ))}
          </div>

          <div className="glass-card p-4 sm:p-6">
            {!active ? (
              <p className="text-white/50">Selecteer een intake om te beoordelen.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-white font-semibold">{active.clients?.company || active.clients?.name}</p>
                  <p className="text-sm text-white/50">{active.training_intake_members?.length || 0} teamleden</p>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Status</label>
                  <select className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as IntakeRow['status'])}>
                    <option value="draft">draft</option>
                    <option value="submitted">submitted</option>
                    <option value="reviewed">reviewed</option>
                    <option value="planned">planned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Interne trainernotitie</label>
                  <textarea className={`${INPUT_CLASS} min-h-24`} value={trainerNotes} onChange={(e) => setTrainerNotes(e.target.value)} />
                </div>

                <div className="rounded-xl border border-white/10 p-3 bg-white/5 space-y-2">
                  <p className="text-sm text-white font-medium flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Trainingsvoorstel</p>
                  <input type="datetime-local" className={INPUT_CLASS} value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} />
                  <input type="datetime-local" className={INPUT_CLASS} value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} />
                  <select className={INPUT_CLASS} value={sessionDuration} onChange={(e) => setSessionDuration((e.target.value ? Number(e.target.value) : '') as 2 | 3 | '')}>
                    <option value="">Duur</option>
                    <option value="2">2 uur</option>
                    <option value="3">3 uur</option>
                  </select>
                  <input className={INPUT_CLASS} placeholder="Teams-link of locatie" value={sessionLink} onChange={(e) => setSessionLink(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => saveReview(false)} disabled={saving} className="px-3 py-2.5 rounded-lg bg-brand-orange text-white font-medium flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <NotebookPen className="w-4 h-4" />} Intake opslaan
                  </button>
                  <button onClick={() => saveReview(true)} disabled={saving} className="px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Status + sessie opslaan
                  </button>
                  <button onClick={() => exportCsv(active.client_id)} className="px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
