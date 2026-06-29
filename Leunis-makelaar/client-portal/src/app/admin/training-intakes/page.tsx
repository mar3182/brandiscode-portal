'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react'

interface IntakeRow {
  id: string
  client_id: string
  status: 'draft' | 'submitted' | 'reviewed' | 'planned'
  contact_person: string | null
  contact_email: string | null
  training_duration: '2u' | '3u' | null
  preferred_datetime: string | null
  communication_channel?: 'portal' | 'email' | 'whatsapp' | null
  communication_email?: string | null
  communication_whatsapp?: string | null
  portal_notifications_enabled?: boolean | null
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

interface ClientOption {
  id: string
  company: string | null
  name: string | null
  email: string | null
}

const INPUT_CLASS = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50'

const CHANNEL_LABELS: Record<'portal' | 'email' | 'whatsapp', string> = {
  portal: 'Portal',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
}

export default function AdminTrainingIntakesPage() {
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [rows, setRows] = useState<IntakeRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [createQuery, setCreateQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [trainerNotes, setTrainerNotes] = useState('')
  const [status, setStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned'>('draft')
  const [sessionStart, setSessionStart] = useState('')
  const [sessionEnd, setSessionEnd] = useState('')
  const [sessionDuration, setSessionDuration] = useState<2 | 3 | ''>('')
  const [sessionLink, setSessionLink] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    setUnauthorized(false)

    const [intakesRes, clientsRes] = await Promise.all([
      fetch('/api/admin/training-intakes', { cache: 'no-store' }),
      fetch('/api/admin/clients', { cache: 'no-store' }),
    ])

    if (intakesRes.status === 401 || clientsRes.status === 401) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    const intakesData = await intakesRes.json()
    const clientsData = await clientsRes.json()

    if (!intakesRes.ok) {
      setError(intakesData.error || 'Intakes laden is mislukt.')
      setLoading(false)
      return
    }

    if (!clientsRes.ok) {
      setError(clientsData.error || 'Klanten laden is mislukt.')
      setLoading(false)
      return
    }

    const nextRows = Array.isArray(intakesData) ? intakesData : []
    const nextClients = Array.isArray(clientsData)
      ? clientsData.map((client) => ({
        id: String(client.id),
        company: typeof client.company === 'string' ? client.company : null,
        name: typeof client.name === 'string' ? client.name : null,
        email: typeof client.email === 'string' ? client.email : null,
      }))
      : []

    setRows(nextRows)
    setClients(nextClients)

    if (!nextRows.some((item) => item.id === activeId)) {
      setActiveId(nextRows[0]?.id ?? null)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const active = useMemo(() => rows.find((item) => item.id === activeId) || null, [rows, activeId])
  const statusConfig: Record<IntakeRow['status'], { label: string; className: string }> = {
    draft: { label: 'Concept', className: 'text-white/80 border-white/25 bg-white/10' },
    submitted: { label: 'Ingediend', className: 'text-blue-200 border-blue-500/40 bg-blue-500/10' },
    reviewed: { label: 'Beoordeeld', className: 'text-amber-200 border-amber-500/40 bg-amber-500/10' },
    planned: { label: 'Gepland', className: 'text-green-200 border-green-500/40 bg-green-500/10' },
  }
  const clientsWithoutIntake = useMemo(
    () => clients.filter((client) => !rows.some((row) => row.client_id === client.id)),
    [clients, rows],
  )
  const filteredClients = useMemo(() => {
    const q = createQuery.trim().toLowerCase()
    if (!q) return clientsWithoutIntake
    return clientsWithoutIntake.filter((client) => {
      const haystack = `${client.company || ''} ${client.name || ''} ${client.email || ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [createQuery, clientsWithoutIntake])
  const selectedClient = useMemo(
    () => filteredClients.find((client) => client.id === selectedClientId) || clientsWithoutIntake.find((client) => client.id === selectedClientId) || null,
    [filteredClients, clientsWithoutIntake, selectedClientId],
  )
  const activeCommunicationMissing = useMemo(() => {
    if (!active) return []
    return active.missingRequiredFields.filter((field) =>
      ['Communicatiekanaal', 'Portalmeldingen', 'Communicatie e-mail', 'WhatsApp-nummer'].includes(field),
    )
  }, [active])
  const activeCommunicationComplete = activeCommunicationMissing.length === 0

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

    if (addSession && !activeCommunicationComplete) {
      setError('Voorstel versturen kan nog niet. Vul eerst alle kanaalgegevens aan bij communicatievoorkeur.')
      return
    }

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
    setSuccessMessage(addSession ? 'Intake en trainingsvoorstel zijn opgeslagen.' : 'Intake is opgeslagen.')
    setSaving(false)
  }

  async function createIntake() {
    if (!selectedClientId) {
      setError('Selecteer eerst een klant om een intake te starten.')
      return
    }

    setCreating(true)
    setError('')
    setSuccessMessage('')

    const res = await fetch('/api/admin/training-intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClientId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Intake aanmaken is mislukt.')
      setCreating(false)
      return
    }

    await loadData()
    if (typeof data.intake_id === 'string') {
      setActiveId(data.intake_id)
    }

    setSuccessMessage(data.message || 'Intake staat klaar voor beoordeling.')
    setCreating(false)
  }

  async function exportCsv(clientId: string) {
    window.location.href = `/api/admin/training-intakes/export?client_id=${encodeURIComponent(clientId)}`
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Training Intakes</h1>
        <p className="text-white/50 mt-1">Beheer intake-status, ontbrekende gegevens en planning per klant.</p>
      </div>

      {unauthorized ? (
        <div className="glass-card border border-red-500/40 p-6 text-red-200 mb-4">
          <p className="font-semibold">Geen toegang</p>
          <p className="text-sm mt-1 text-red-200/90">Je bent niet geautoriseerd als admin voor deze pagina.</p>
          <Link href="/login" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
            Opnieuw inloggen
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="glass-card border border-red-500/40 p-4 text-red-300 mb-4" role="alert" aria-live="assertive">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>{error}</p>
            </div>
            <button onClick={loadData} className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs">
              <RefreshCcw className="w-3.5 h-3.5" /> Opnieuw laden
            </button>
          </div>
        </div>
      ) : null}
      {successMessage ? <div className="glass-card border border-green-500/40 p-4 text-green-300 mb-4" role="status" aria-live="polite">{successMessage}</div> : null}

      <div className="glass-card p-4 sm:p-6 mb-6 space-y-3">
        <h2 className="text-white font-semibold">Nieuwe intake starten</h2>
        <p className="text-white/60 text-sm">Start een concept-intake voor klanten die nog geen intake hebben. Je opent daarna direct het beheerpaneel.</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3">
          <label className="relative block">
            <span className="sr-only">Zoek klant</span>
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
              placeholder="Zoek op bedrijfsnaam, contact of e-mail"
              value={createQuery}
              onChange={(e) => setCreateQuery(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="sr-only">Selecteer klant</span>
            <select
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-orange/50"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Selecteer klant</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company || client.name || 'Onbekende klant'}{client.email ? ` - ${client.email}` : ''}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={createIntake}
            disabled={creating || !selectedClientId}
            className="px-4 py-2.5 rounded-lg bg-brand-orange text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Intake starten
          </button>
        </div>

        {clientsWithoutIntake.length === 0 ? (
          <p className="text-xs text-green-200">Alle klanten hebben al een intake. Je kunt direct beoordelen en plannen.</p>
        ) : selectedClient ? (
          <p className="text-xs text-white/60">Geselecteerd: <span className="text-white">{selectedClient.company || selectedClient.name || 'Onbekende klant'}</span></p>
        ) : (
          <p className="text-xs text-white/40">{filteredClients.length} klant(en) beschikbaar zonder intake.</p>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-10 text-center">
          <Loader2 className="w-7 h-7 text-brand-orange animate-spin mx-auto" />
          <p className="text-sm text-white/50 mt-3">Intakes en klanten laden...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 glass-card p-4 sm:p-6 space-y-3">
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 p-8 text-center">
                <p className="text-white font-medium">Nog geen training intakes</p>
                <p className="text-white/50 text-sm mt-1">Maak hierboven een eerste intake aan om beoordeling en planning te starten.</p>
              </div>
            ) : rows.map((row) => (
              <button
                key={row.id}
                onClick={() => setActiveId(row.id)}
                aria-pressed={activeId === row.id}
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
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${row.communication_channel ? 'text-blue-200 border-blue-500/40 bg-blue-500/10' : 'text-red-200 border-red-500/40 bg-red-500/10'}`}>
                      {row.communication_channel ? CHANNEL_LABELS[row.communication_channel] : 'Kanaal ontbreekt'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${row.missingRequiredFields.some((field) => ['Communicatiekanaal', 'Portalmeldingen', 'Communicatie e-mail', 'WhatsApp-nummer'].includes(field)) ? 'text-red-200 border-red-500/40 bg-red-500/10' : 'text-green-200 border-green-500/40 bg-green-500/10'}`}>
                      {row.missingRequiredFields.some((field) => ['Communicatiekanaal', 'Portalmeldingen', 'Communicatie e-mail', 'WhatsApp-nummer'].includes(field)) ? 'Kanaal incompleet' : 'Kanaal compleet'}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${statusConfig[row.status].className}`}>{statusConfig[row.status].label}</span>
                  </div>
                </div>
                {row.missingRequiredFields.length > 0 ? (
                  <p className="text-xs text-yellow-200 mt-2">Nog nodig: {row.missingRequiredFields.join(', ')}</p>
                ) : null}
              </button>
            ))}
          </div>

          <div className="glass-card p-4 sm:p-6">
            {!active ? (
              <p className="text-white/50">Selecteer een intake om te beoordelen, plannen en exporteren.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-white font-semibold">{active.clients?.company || active.clients?.name}</p>
                  <p className="text-sm text-white/50">{active.training_intake_members?.length || 0} teamleden</p>
                </div>

                <div className={`rounded-xl p-3 border ${activeCommunicationComplete ? 'border-green-500/40 bg-green-500/10 text-green-100' : 'border-red-500/40 bg-red-500/10 text-red-100'}`}>
                  <p className="text-sm font-semibold">Communicatiekanaal: {active.communication_channel ? CHANNEL_LABELS[active.communication_channel] : 'Niet gekozen'}</p>
                  {active.communication_channel === 'email' ? (
                    <p className="text-xs mt-1">E-mail: {active.communication_email || '-'}</p>
                  ) : null}
                  {active.communication_channel === 'whatsapp' ? (
                    <p className="text-xs mt-1">WhatsApp: {active.communication_whatsapp || '-'}</p>
                  ) : null}
                  {active.communication_channel === 'portal' ? (
                    <p className="text-xs mt-1">Portalmeldingen: {active.portal_notifications_enabled ? 'Aan' : 'Uit'}</p>
                  ) : null}

                  {!activeCommunicationComplete ? (
                    <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
                      {activeCommunicationMissing.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className={`rounded-xl p-3 border ${active.readyForTraining ? 'border-green-500/40 bg-green-500/10 text-green-100' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'}`}>
                  <p className="text-sm font-semibold">{active.readyForTraining ? 'Ready for training' : 'Nog niet klaar voor planning'}</p>
                  {active.missingRequiredFields.length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
                      {active.missingRequiredFields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs mt-1">Alle verplichte velden zijn compleet. Je kunt de intake plannen.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="intake-status" className="block text-xs text-white/50 mb-1">Beoordeling: intake-status</label>
                  <select id="intake-status" className={INPUT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as IntakeRow['status'])}>
                    <option value="draft">draft</option>
                    <option value="submitted">submitted</option>
                    <option value="reviewed">reviewed</option>
                    <option value="planned">planned</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="trainer-notes" className="block text-xs text-white/50 mb-1">Beoordeling: interne trainernotitie</label>
                  <textarea id="trainer-notes" className={`${INPUT_CLASS} min-h-24`} value={trainerNotes} onChange={(e) => setTrainerNotes(e.target.value)} />
                </div>

                <div className="rounded-xl border border-white/10 p-3 bg-white/5 space-y-2">
                  <p className="text-sm text-white font-medium flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Trainingsvoorstel</p>
                  <label htmlFor="session-start" className="text-xs text-white/50">Start</label>
                  <input id="session-start" type="datetime-local" className={INPUT_CLASS} value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} />
                  <label htmlFor="session-end" className="text-xs text-white/50">Einde</label>
                  <input id="session-end" type="datetime-local" className={INPUT_CLASS} value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} />
                  <label htmlFor="session-duration" className="text-xs text-white/50">Duur</label>
                  <select id="session-duration" className={INPUT_CLASS} value={sessionDuration} onChange={(e) => setSessionDuration((e.target.value ? Number(e.target.value) : '') as 2 | 3 | '')}>
                    <option value="">Duur</option>
                    <option value="2">2 uur</option>
                    <option value="3">3 uur</option>
                  </select>
                  <label htmlFor="session-link" className="text-xs text-white/50">Locatie of link</label>
                  <input id="session-link" className={INPUT_CLASS} placeholder="Teams-link of locatie" value={sessionLink} onChange={(e) => setSessionLink(e.target.value)} />
                </div>

                <div className="rounded-xl border border-white/10 p-3 bg-white/5">
                  <p className="text-sm text-white font-medium mb-2">Bestaande sessies</p>
                  {active.training_sessions && active.training_sessions.length > 0 ? (
                    <div className="space-y-2">
                      {active.training_sessions.map((session) => (
                        <div key={session.id} className="rounded-lg border border-white/10 p-2.5 text-xs text-white/80">
                          <p>Status: {session.status}</p>
                          <p>Start: {session.session_start ? new Date(session.session_start).toLocaleString('nl-NL') : '-'}</p>
                          <p>Locatie/link: {session.location_or_link || '-'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/50">Nog geen sessies toegevoegd.</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => saveReview(false)} disabled={saving} className="px-3 py-2.5 rounded-lg bg-brand-orange text-white font-medium flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <NotebookPen className="w-4 h-4" />} Intake opslaan
                  </button>
                  <button
                    onClick={() => saveReview(true)}
                    disabled={saving || !activeCommunicationComplete}
                    className="px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Voorstel versturen
                  </button>
                  {!activeCommunicationComplete ? (
                    <p className="text-xs text-red-200" role="status" aria-live="polite">
                      Voorstel versturen is geblokkeerd tot kanaalgegevens compleet zijn.
                    </p>
                  ) : null}
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
