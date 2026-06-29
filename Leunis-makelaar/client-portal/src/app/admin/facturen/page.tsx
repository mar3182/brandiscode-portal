'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import type { Factuur, FactuurStatus } from '@/lib/types'
import { generateFactuurPDF, type FactuurClientInfo } from '@/lib/generateFactuurPDF'
import { Download, Loader2, Plus, Receipt } from 'lucide-react'

interface ClientLite {
  id: string
  name: string
  company: string | null
}

interface OfferteLite {
  id: string
  client_id: string
  sprints: Array<{ id: string; number: number; title: string }> | null
}

const filterOptions: Array<'alle' | FactuurStatus> = ['alle', 'concept', 'verstuurd', 'betaald', 'herinnering']

function formatEuro(value: number) {
  return `EUR ${value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('nl-NL')
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().split('T')[0]
}

export default function AdminFacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [clients, setClients] = useState<ClientLite[]>([])
  const [offertes, setOffertes] = useState<OfferteLite[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'alle' | FactuurStatus>('alle')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editFactuurId, setEditFactuurId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [form, setForm] = useState({
    client_id: '',
    sprint_id: '',
    title: '',
    description: '',
    amount: '',
    btw_percentage: '21',
    due_date: defaultDueDate(),
  })
  const [editForm, setEditForm] = useState({
    sprint_id: '',
    title: '',
    description: '',
    amount: '',
    btw_percentage: '21',
    due_date: '',
    status: 'concept' as FactuurStatus,
  })

  const getResponseError = async (res: Response, fallback: string) => {
    try {
      const data = await res.json()
      if (data?.error) return `${fallback} (${res.status}): ${data.error}`
    } catch {
      const text = await res.text().catch(() => '')
      if (text) return `${fallback} (${res.status}): ${text}`
    }
    return `${fallback} (${res.status})`
  }

  const loadFacturen = async () => {
    const res = await fetch('/api/admin/facturen')
    const data = await res.json()
    if (Array.isArray(data)) setFacturen(data)
  }

  useEffect(() => {
    async function load() {
      const [facturenRes, clientsRes, offertesRes] = await Promise.all([
        fetch('/api/admin/facturen'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/offertes'),
      ])

      const [facturenData, clientsData, offertesData] = await Promise.all([
        facturenRes.json(),
        clientsRes.json(),
        offertesRes.json(),
      ])

      if (Array.isArray(facturenData)) setFacturen(facturenData)
      if (Array.isArray(clientsData)) setClients(clientsData)
      if (Array.isArray(offertesData)) setOffertes(offertesData)
      setLoading(false)
    }

    load()
  }, [])

  const sprintOptions = useMemo(() => {
    if (!form.client_id) return []
    const sprints = offertes
      .filter((offerte) => offerte.client_id === form.client_id)
      .flatMap((offerte) => offerte.sprints || [])

    return sprints.sort((a, b) => a.number - b.number)
  }, [offertes, form.client_id])

  const filteredFacturen = useMemo(() => {
    if (filter === 'alle') return facturen
    return facturen.filter((factuur) => factuur.status === filter)
  }, [facturen, filter])

  const openstaand = useMemo(
    () => facturen.filter((f) => f.status === 'verstuurd' || f.status === 'herinnering'),
    [facturen]
  )

  const betaaldDitJaar = useMemo(() => {
    const year = new Date().getFullYear()
    return facturen
      .filter((f) => f.status === 'betaald' && f.paid_at && new Date(f.paid_at).getFullYear() === year)
      .reduce((sum, f) => sum + f.amount, 0)
  }, [facturen])

  const updateStatus = async (id: string, status: FactuurStatus) => {
    setActionError('')
    setUpdatingId(id)
    const res = await fetch('/api/admin/facturen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })

    if (res.ok) {
      const updated = await res.json()
      setFacturen((prev) => prev.map((factuur) => (factuur.id === id ? updated : factuur)))
      await loadFacturen()
    } else {
      const err = await res.json().catch(() => ({}))
      setActionError(err.error || 'Status bijwerken is mislukt.')
    }
    setUpdatingId(null)
  }

  const openEditModal = (factuur: any) => {
    setEditFactuurId(factuur.id)
    setEditForm({
      sprint_id: factuur.sprint_id || '',
      title: factuur.title || '',
      description: factuur.description || '',
      amount: String(factuur.amount ?? ''),
      btw_percentage: String(factuur.btw_percentage ?? 21),
      due_date: factuur.due_date || '',
      status: factuur.status,
    })
    setShowEditModal(true)
  }

  const onSaveEditFactuur = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editFactuurId) return
    setActionError('')

    const parsedAmount = Number(editForm.amount)
    const parsedBtw = Number(editForm.btw_percentage)
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setActionError('Bedrag moet een geldig positief getal zijn.')
      return
    }
    if (!Number.isFinite(parsedBtw) || parsedBtw < 0) {
      setActionError('BTW moet een geldig positief getal zijn.')
      return
    }

    setSavingEdit(true)

    const res = await fetch('/api/admin/facturen', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editFactuurId,
        sprint_id: editForm.sprint_id || null,
        title: editForm.title,
        description: editForm.description || null,
        amount: parsedAmount,
        btw_percentage: parsedBtw,
        due_date: editForm.due_date || null,
        status: editForm.status,
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setFacturen((prev) => prev.map((f) => (f.id === editFactuurId ? updated : f)))
      await loadFacturen()
      setShowEditModal(false)
      setEditFactuurId(null)
    } else {
      setActionError(await getResponseError(res, 'Factuur opslaan is mislukt'))
    }

    setSavingEdit(false)
  }

  const handleDownloadPDF = async (factuur: any) => {
    const client: FactuurClientInfo | null = factuur.clients
      ? {
          name: factuur.clients.name ?? '',
          company: factuur.clients.company ?? null,
          billing_address_line1: factuur.clients.billing_address_line1 ?? null,
          billing_address_line2: factuur.clients.billing_address_line2 ?? null,
          billing_postal_code: factuur.clients.billing_postal_code ?? null,
          billing_city: factuur.clients.billing_city ?? null,
          billing_email: factuur.clients.billing_email ?? null,
          btw_number: factuur.clients.btw_number ?? null,
        }
      : null
    await generateFactuurPDF(factuur as Factuur, client)
  }

  const deleteFactuur = async (id: string) => {
    const ok = window.confirm('Weet je zeker dat je deze factuur wilt verwijderen?')
    if (!ok) return

    setActionError('')
    setDeletingId(id)
    const res = await fetch(`/api/admin/facturen?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setFacturen((prev) => prev.filter((f) => f.id !== id))
      await loadFacturen()
    } else {
      setActionError(await getResponseError(res, 'Factuur verwijderen is mislukt'))
    }
    setDeletingId(null)
  }

  const onCreateFactuur = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)

    const res = await fetch('/api/admin/facturen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: form.client_id,
        sprint_id: form.sprint_id || null,
        title: form.title,
        description: form.description || null,
        amount: Number(form.amount),
        btw_percentage: Number(form.btw_percentage),
        due_date: form.due_date || null,
      }),
    })

    if (res.ok) {
      await loadFacturen()
      setShowCreateModal(false)
      setForm({
        client_id: '',
        sprint_id: '',
        title: '',
        description: '',
        amount: '',
        btw_percentage: '21',
        due_date: defaultDueDate(),
      })
    } else {
      setActionError(await getResponseError(res, 'Factuur aanmaken is mislukt'))
    }

    setCreating(false)
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturen</h1>
          <p className="text-white/50 mt-1">Beheer facturen, betaalstatus en opvolging.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nieuwe factuur
        </button>
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Totaal openstaand"
          value={formatEuro(openstaand.reduce((sum, f) => sum + f.amount, 0))}
          icon={Receipt}
          color="gold"
        />
        <StatCard
          title="Totaal betaald dit jaar"
          value={formatEuro(betaaldDitJaar)}
          icon={Receipt}
          color="green"
        />
        <StatCard
          title="Openstaande facturen"
          value={openstaand.length}
          icon={Receipt}
          color="blue"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filterOptions.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              filter === option
                ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {option === 'alle' ? 'Alle' : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/50">
              <tr>
                <th className="text-left p-3">Factuur nr</th>
                <th className="text-left p-3">Klant</th>
                <th className="text-left p-3">Sprint</th>
                <th className="text-right p-3">Bedrag</th>
                <th className="text-right p-3">Totaal incl. BTW</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Vervaldatum</th>
                <th className="text-left p-3">Acties</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacturen.map((factuur: any) => (
                <tr key={factuur.id} className="border-t border-white/5 text-white/80">
                  <td className="p-3 font-medium">{factuur.factuur_nummer}</td>
                  <td className="p-3">{factuur.clients?.company || factuur.clients?.name || '-'}</td>
                  <td className="p-3">{factuur.sprints?.title ? `Sprint ${factuur.sprints.number}: ${factuur.sprints.title}` : '-'}</td>
                  <td className="p-3 text-right">{formatEuro(factuur.amount)}</td>
                  <td className="p-3 text-right font-semibold">{formatEuro(factuur.total_amount)}</td>
                  <td className="p-3"><StatusBadge status={factuur.status} /></td>
                  <td className="p-3">{formatDate(factuur.due_date)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={factuur.status}
                        onChange={(e) => updateStatus(factuur.id, e.target.value as FactuurStatus)}
                        disabled={updatingId === factuur.id}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-brand-gold/50"
                      >
                        <option value="concept">Concept</option>
                        <option value="verstuurd">Verstuurd</option>
                        <option value="herinnering">Herinnering</option>
                        <option value="betaald">Betaald</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDownloadPDF(factuur)}
                        className="px-2 py-1 rounded-lg text-xs border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/10 inline-flex items-center gap-1"
                        title="Download PDF"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(factuur)}
                        className="px-2 py-1 rounded-lg text-xs border border-white/10 text-white/70 hover:bg-white/5"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFactuur(factuur.id)}
                        disabled={deletingId === factuur.id}
                        className="px-2 py-1 rounded-lg text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {deletingId === factuur.id ? 'Bezig...' : 'Verwijderen'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <form onSubmit={onCreateFactuur} className="glass-card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Nieuwe factuur</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-white/70">
                Klant
                <select
                  required
                  value={form.client_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value, sprint_id: '' }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="">Selecteer klant</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company || client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                Sprint (optioneel)
                <select
                  value={form.sprint_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, sprint_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="">Geen sprint</option>
                  {sprintOptions.map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      Sprint {sprint.number}: {sprint.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Titel
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Beschrijving (optioneel)
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                Bedrag excl. BTW
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                BTW %
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.btw_percentage}
                  onChange={(e) => setForm((prev) => ({ ...prev, btw_percentage: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                Vervaldatum
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5"
              >
                Annuleren
              </button>
              <button type="submit" disabled={creating} className="btn-primary px-4 py-2 rounded-xl">
                {creating ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <form onSubmit={onSaveEditFactuur} className="glass-card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Factuur bewerken</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-white/70">
                Sprint (optioneel)
                <select
                  value={editForm.sprint_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, sprint_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="">Geen sprint</option>
                  {offertes.flatMap((offerte) => offerte.sprints || []).map((sprint) => (
                    <option key={sprint.id} value={sprint.id}>
                      Sprint {sprint.number}: {sprint.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/70">
                Status
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as FactuurStatus }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="concept">Concept</option>
                  <option value="verstuurd">Verstuurd</option>
                  <option value="herinnering">Herinnering</option>
                  <option value="betaald">Betaald</option>
                </select>
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Titel
                <input
                  required
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70 md:col-span-2">
                Beschrijving
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                Bedrag excl. BTW
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                BTW %
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.btw_percentage}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, btw_percentage: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>

              <label className="text-sm text-white/70">
                Vervaldatum
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:bg-white/5"
              >
                Annuleren
              </button>
              <button type="submit" disabled={savingEdit} className="btn-primary px-4 py-2 rounded-xl">
                {savingEdit ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
