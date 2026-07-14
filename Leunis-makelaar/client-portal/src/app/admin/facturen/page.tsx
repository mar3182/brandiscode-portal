'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Receipt, ExternalLink, Loader2 } from 'lucide-react'
import { computeFactuurBedragen } from '@/lib/types'

const STATUS_STYLE: Record<string, string> = {
  concept:     'bg-white/10 text-white/50',
  verstuurd:   'bg-blue-500/20 text-blue-300',
  herinnering: 'bg-amber-500/20 text-amber-300',
  betaald:     'bg-green-500/20 text-green-300',
}

const STATUS_LABEL: Record<string, string> = {
  concept:     'Concept',
  verstuurd:   'Verstuurd',
  herinnering: 'Herinnering',
  betaald:     'Betaald',
}

type RecurringPlan = {
  enabled: boolean
  title: string
  description: string
  amount: number | null
  btw_percentage: number
  due_days: number
  send_to: string
  last_generated_month: string | null
  last_generated_at: string | null
}

export default function AdminFacturenPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client_id') || searchParams.get('client')
  const [facturen, setFacturen] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [title, setTitle] = useState('Website onderhoud - maandfactuur')
  const [amount, setAmount] = useState('')
  const [btwPercentage, setBtwPercentage] = useState('21')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurringPlan, setRecurringPlan] = useState<RecurringPlan | null>(null)
  const [recurringLoading, setRecurringLoading] = useState(false)
  const [recurringSaving, setRecurringSaving] = useState(false)
  const [recurringRunning, setRecurringRunning] = useState(false)
  const [recurringError, setRecurringError] = useState('')
  const [recurringSuccess, setRecurringSuccess] = useState('')

  useEffect(() => {
    const url = clientId
      ? `/api/admin/facturen?client_id=${encodeURIComponent(clientId)}`
      : '/api/admin/facturen'

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setFacturen(d)
        else setError(d.error || 'Laden mislukt')
      })
      .catch(() => setError('Verbinding mislukt'))
      .finally(() => setLoading(false))
  }, [clientId])

  const totaalOpenstaand = facturen
    .filter((f) => f.status === 'verstuurd' || f.status === 'herinnering')
    .reduce((sum, f) => sum + computeFactuurBedragen(f).total_amount, 0)

  useEffect(() => {
    if (!clientId) {
      setRecurringPlan(null)
      return
    }

    setRecurringLoading(true)
    setRecurringError('')

    fetch(`/api/admin/clients/${clientId}/recurring-invoice`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.plan) {
          setRecurringPlan({
            enabled: Boolean(d.plan.enabled),
            title: d.plan.title ?? 'Website onderhoud - maandfactuur',
            description: d.plan.description ?? 'Onderhoud website',
            amount: typeof d.plan.amount === 'number' ? d.plan.amount : (d.plan.amount ? Number(d.plan.amount) : null),
            btw_percentage: Number(d.plan.btw_percentage ?? 21),
            due_days: Number(d.plan.due_days ?? 14),
            send_to: d.plan.send_to ?? '',
            last_generated_month: d.plan.last_generated_month ?? null,
            last_generated_at: d.plan.last_generated_at ?? null,
          })
        } else {
          setRecurringError(d?.error || 'Abonnement laden mislukt.')
        }
      })
      .catch(() => setRecurringError('Abonnement laden mislukt.'))
      .finally(() => setRecurringLoading(false))
  }, [clientId])

  async function handleCreateFactuur(e: React.FormEvent) {
    e.preventDefault()

    if (!clientId) {
      setCreateError('Geen klant geselecteerd. Open deze pagina via een klantdetail.')
      return
    }

    setCreateSaving(true)
    setCreateError('')
    setCreateSuccess('')

    const res = await fetch('/api/admin/facturen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        title: title.trim(),
        amount: Number(amount),
        btw_percentage: Number(btwPercentage),
        description: description.trim() || null,
        due_date: dueDate || null,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setCreateError(data.error || 'Factuur aanmaken mislukt.')
      setCreateSaving(false)
      return
    }

    const url = `/api/admin/facturen?client_id=${encodeURIComponent(clientId)}`
    const refreshed = await fetch(url)
      .then((r) => r.json())
      .catch(() => null)

    if (Array.isArray(refreshed)) setFacturen(refreshed)

    setCreateSuccess('Conceptfactuur aangemaakt.')
    setCreateSaving(false)
    setShowCreateForm(false)
    setDescription('')
    setDueDate('')
  }

  async function handleSaveRecurringPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !recurringPlan) return

    setRecurringSaving(true)
    setRecurringError('')
    setRecurringSuccess('')

    const res = await fetch(`/api/admin/clients/${clientId}/recurring-invoice`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: recurringPlan.enabled,
        title: recurringPlan.title,
        description: recurringPlan.description,
        amount: recurringPlan.amount,
        btw_percentage: recurringPlan.btw_percentage,
        due_days: recurringPlan.due_days,
        send_to: recurringPlan.send_to,
      }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRecurringError(data.error || 'Opslaan abonnement mislukt.')
      setRecurringSaving(false)
      return
    }

    setRecurringSuccess('Maandelijks abonnement opgeslagen.')
    setRecurringSaving(false)
  }

  async function handleRunRecurringNow() {
    if (!clientId) return

    setRecurringRunning(true)
    setRecurringError('')
    setRecurringSuccess('')

    const res = await fetch('/api/admin/recurring-invoices/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRecurringError(data.error || 'Handmatig uitvoeren mislukt.')
      setRecurringRunning(false)
      return
    }

    const url = `/api/admin/facturen?client_id=${encodeURIComponent(clientId)}`
    const refreshed = await fetch(url).then((r) => r.json()).catch(() => null)
    if (Array.isArray(refreshed)) setFacturen(refreshed)

    setRecurringSuccess(`Run uitgevoerd: ${data.created ?? 0} factuur(en) aangemaakt, ${data.emailed ?? 0} verzonden.`)
    setRecurringRunning(false)
  }

  return (
    <div className="min-h-screen p-4 pt-16 md:pt-8 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-blue/20 border border-brand-blue/30">
          <Receipt className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Facturen</h1>
          {clientId && !loading && (
            <p className="text-xs text-white/40 mt-0.5">Gefilterd op geselecteerde klant</p>
          )}
          {!loading && totaalOpenstaand > 0 && (
            <p className="text-sm text-amber-300 mt-0.5">
              €{totaalOpenstaand.toFixed(2).replace('.', ',')} openstaand
            </p>
          )}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => {
              setShowCreateForm((prev) => !prev)
              setCreateError('')
              setCreateSuccess('')
            }}
            className="px-3 py-2 rounded-lg bg-brand-orange text-white text-sm hover:bg-brand-orange/80 disabled:opacity-60"
            disabled={!clientId}
            title={!clientId ? 'Open via klantdetail om een nieuwe factuur te maken' : 'Nieuwe factuur'}
          >
            Nieuwe factuur
          </button>
        </div>
      </div>

      {showCreateForm && clientId && (
        <form onSubmit={handleCreateFactuur} className="glass-card rounded-2xl p-5 mb-6 space-y-4 border border-white/10">
          <h2 className="text-white font-semibold">Nieuwe factuur aanmaken</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Titel *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Bedrag excl. BTW *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
                placeholder="bijv. 150.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">BTW %</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={btwPercentage}
                onChange={(e) => setBtwPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Vervaldatum</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1">Omschrijving</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 min-h-20 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-blue/50"
              placeholder="Bijv. onderhoud website maand juli"
            />
          </div>

          {createError ? <p className="text-red-300 text-sm">{createError}</p> : null}
          {createSuccess ? <p className="text-green-300 text-sm">{createSuccess}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={createSaving}
              className="px-3 py-2 rounded-lg bg-brand-blue text-white text-sm hover:bg-brand-blue/80 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {createSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Conceptfactuur maken
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-sm hover:bg-white/20"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {clientId && (
        <div className="glass-card rounded-2xl p-5 mb-6 space-y-4 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold">Maandelijks abonnement</h2>
              <p className="text-xs text-white/50 mt-1">Factuur wordt op de laatste dag van de maand automatisch aangemaakt en verzonden.</p>
            </div>
            <button
              onClick={handleRunRecurringNow}
              disabled={recurringRunning || recurringLoading || !recurringPlan?.enabled}
              className="px-3 py-2 rounded-lg bg-brand-blue text-white text-xs hover:bg-brand-blue/80 disabled:opacity-60"
              title="Handmatig runnen voor test"
            >
              {recurringRunning ? 'Bezig...' : 'Nu uitvoeren (test)'}
            </button>
          </div>

          {recurringLoading ? (
            <p className="text-xs text-white/50 inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Abonnement laden...</p>
          ) : recurringPlan ? (
            <form onSubmit={handleSaveRecurringPlan} className="space-y-4">
              <label className="inline-flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={recurringPlan.enabled}
                  onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, enabled: e.target.checked }) : prev)}
                />
                Automatisch maandfactuur actief
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Titel *</label>
                  <input
                    value={recurringPlan.title}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, title: e.target.value }) : prev)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Bedrag excl. BTW *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recurringPlan.amount ?? ''}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, amount: e.target.value ? Number(e.target.value) : null }) : prev)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">BTW %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recurringPlan.btw_percentage}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, btw_percentage: Number(e.target.value) }) : prev)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Betaaltermijn (dagen)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={recurringPlan.due_days}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, due_days: Number(e.target.value) }) : prev)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Verzenden naar e-mail *</label>
                  <input
                    type="email"
                    value={recurringPlan.send_to}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, send_to: e.target.value }) : prev)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Omschrijving</label>
                  <textarea
                    value={recurringPlan.description}
                    onChange={(e) => setRecurringPlan((prev) => prev ? ({ ...prev, description: e.target.value }) : prev)}
                    className="w-full px-3 py-2 min-h-20 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-white/40">
                Laatste run: {recurringPlan.last_generated_at ? new Date(recurringPlan.last_generated_at).toLocaleString('nl-NL') : 'nog niet uitgevoerd'}
                {recurringPlan.last_generated_month ? ` (maand ${recurringPlan.last_generated_month})` : ''}
              </p>

              {recurringError ? <p className="text-red-300 text-sm">{recurringError}</p> : null}
              {recurringSuccess ? <p className="text-green-300 text-sm">{recurringSuccess}</p> : null}

              <button
                type="submit"
                disabled={recurringSaving}
                className="px-3 py-2 rounded-lg bg-brand-orange text-white text-sm hover:bg-brand-orange/80 disabled:opacity-60"
              >
                {recurringSaving ? 'Opslaan...' : 'Abonnement opslaan'}
              </button>
            </form>
          ) : (
            <p className="text-red-300 text-sm">{recurringError || 'Abonnement laden mislukt.'}</p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-white/50">
          <Loader2 className="w-4 h-4 animate-spin" /> Laden…
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Nummer</th>
                <th className="px-5 py-3 text-left">Klant</th>
                <th className="px-5 py-3 text-left">Omschrijving</th>
                <th className="px-5 py-3 text-right">Bedrag</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-left">Datum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {facturen.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-white/30">
                    Geen facturen gevonden
                  </td>
                </tr>
              )}
              {facturen.map((f) => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 font-mono text-white/70 whitespace-nowrap">{f.factuur_nummer ?? '—'}</td>
                    <td className="px-5 py-3 text-white/80">{f.clients?.company ?? f.clients?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-white/60 max-w-[200px] truncate">{f.title}</td>
                    <td className="px-5 py-3 text-right text-white font-medium tabular-nums whitespace-nowrap">
                      €{computeFactuurBedragen(f).total_amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[f.status] ?? 'bg-white/10 text-white/40'}`}>
                        {STATUS_LABEL[f.status] ?? f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/40 whitespace-nowrap">
                      {new Date(f.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => router.push(`/admin/clients/${f.client_id}?tab=facturen`)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                        title="Bekijk bij klant"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
