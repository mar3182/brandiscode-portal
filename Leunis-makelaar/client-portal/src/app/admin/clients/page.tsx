'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Users, Plus, Loader2, Pencil, Save, X, RefreshCw, CheckCircle2, Clock, ExternalLink, Trash2 } from 'lucide-react'
import type { Client } from '@/lib/types'
import {
  type ProfileFieldErrors,
  formatBtwInput,
  formatIbanInput,
  formatKvkInput,
  validateCompanyProfileFields,
} from '@/lib/companyProfileValidation'

type ClientForm = {
  id?: string
  owner_name: string
  name: string
  email: string
  company: string
  phone: string
  contact_person: string
  kvk_number: string
  btw_number: string
  iban: string
  billing_email: string
  billing_address_line1: string
  billing_address_line2: string
  billing_postal_code: string
  billing_city: string
  billing_country: string
  mark_completed: boolean
}

const initialForm: ClientForm = {
  owner_name: '',
  name: '',
  email: '',
  company: '',
  phone: '',
  contact_person: '',
  kvk_number: '',
  btw_number: '',
  iban: '',
  billing_email: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_postal_code: '',
  billing_city: '',
  billing_country: 'Nederland',
  mark_completed: false,
}

const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-blue/50 transition-all'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateRequiredEmail(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return `${label} is verplicht.`
  if (!EMAIL_REGEX.test(trimmed)) return `Vul een geldig ${label.toLowerCase()} in.`
  return ''
}

export default function AdminClientsPage() {
  const searchParams = useSearchParams()
  const preferredTab = searchParams.get('tab')
  const detailTab = preferredTab === 'offertes' || preferredTab === 'training' || preferredTab === 'facturen' || preferredTab === 'overzicht'
    ? preferredTab
    : 'overzicht'
  const [clients, setClients] = useState<Client[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [actionError, setActionError] = useState('')
  const [createFieldErrors, setCreateFieldErrors] = useState<ProfileFieldErrors>({})
  const [editFieldErrors, setEditFieldErrors] = useState<ProfileFieldErrors>({})
  const [createEmailErrors, setCreateEmailErrors] = useState<{ email?: string; billing_email?: string }>({})
  const [editEmailErrors, setEditEmailErrors] = useState<{ email?: string; billing_email?: string }>({})
  const [form, setForm] = useState<ClientForm>(initialForm)
  const [editForm, setEditForm] = useState<ClientForm | null>(null)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [triggerSuccess, setTriggerSuccess] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    void loadClients()
  }, [])

  async function loadClients() {
    const res = await fetch('/api/admin/clients', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) setClients(data)
  }

  const toPayload = (source: ClientForm) => ({
    id: source.id,
    owner_name: source.owner_name,
    name: source.name,
    email: source.email,
    company: source.company,
    phone: source.phone,
    contact_person: source.contact_person,
    kvk_number: source.kvk_number,
    btw_number: source.btw_number,
    iban: source.iban,
    billing_email: source.billing_email,
    billing_address_line1: source.billing_address_line1,
    billing_address_line2: source.billing_address_line2,
    billing_postal_code: source.billing_postal_code,
    billing_city: source.billing_city,
    billing_country: source.billing_country,
    mark_completed: source.mark_completed,
  })

  const toEditForm = (client: Client): ClientForm => ({
    id: client.id,
    owner_name: client.name || '',
    name: client.name || '',
    email: client.email || '',
    company: client.company || '',
    phone: client.phone || '',
    contact_person: client.contact_person || '',
    kvk_number: client.kvk_number || '',
    btw_number: client.btw_number || '',
    iban: client.iban || '',
    billing_email: client.billing_email || client.email || '',
    billing_address_line1: client.billing_address_line1 || '',
    billing_address_line2: client.billing_address_line2 || '',
    billing_postal_code: client.billing_postal_code || '',
    billing_city: client.billing_city || '',
    billing_country: client.billing_country || 'Nederland',
    mark_completed: Boolean(client.onboarding_completed_at),
  })

  function validateCreateEmails(source: Pick<ClientForm, 'email' | 'billing_email'>) {
    const errors: { email?: string; billing_email?: string } = {}
    const emailError = validateRequiredEmail(source.email, 'E-mailadres')
    const billingError = validateRequiredEmail(source.billing_email, 'Factuur e-mailadres')
    if (emailError) errors.email = emailError
    if (billingError) errors.billing_email = billingError
    return errors
  }

  function validateEditEmails(source: Pick<ClientForm, 'email' | 'billing_email'>) {
    const errors: { email?: string; billing_email?: string } = {}
    const emailError = validateRequiredEmail(source.email, 'E-mailadres')
    const billingError = validateRequiredEmail(source.billing_email, 'Factuur e-mailadres')
    if (emailError) errors.email = emailError
    if (billingError) errors.billing_email = billingError
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setActionError('')
    setCreateFieldErrors({})

    const emailErrors = validateCreateEmails(form)
    setCreateEmailErrors(emailErrors)
    if (Object.keys(emailErrors).length > 0) {
      setLoading(false)
      return
    }

    const validation = validateCompanyProfileFields({
      email: form.email,
      billing_email: form.billing_email,
      kvk_number: form.kvk_number,
      btw_number: form.btw_number,
      iban: form.iban,
    })

    if (Object.keys(validation.errors).length > 0) {
      setCreateFieldErrors(validation.errors)
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(form)),
    })

    if (res.ok) {
      const newClient = await res.json()
      setClients(prev => [newClient, ...prev])
      setForm(initialForm)
      setShowForm(false)
    } else {
      const err = await res.json().catch(() => ({}))
      setActionError(err.error || 'Klant opslaan is mislukt')
      if (err.field_errors) setCreateFieldErrors(err.field_errors)
    }

    setLoading(false)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm?.id) return

    setSavingEdit(true)
    setActionError('')
    setEditFieldErrors({})

    const editEmailValidation = validateEditEmails(editForm)
    setEditEmailErrors(editEmailValidation)
    if (Object.keys(editEmailValidation).length > 0) {
      setSavingEdit(false)
      return
    }

    const validation = validateCompanyProfileFields({
      email: editForm.email,
      billing_email: editForm.billing_email,
      kvk_number: editForm.kvk_number,
      btw_number: editForm.btw_number,
      iban: editForm.iban,
    })

    if (Object.keys(validation.errors).length > 0) {
      setEditFieldErrors(validation.errors)
      setSavingEdit(false)
      return
    }

    const res = await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(editForm)),
    })

    if (res.ok) {
      const updated = await res.json()
      setClients((prev) => prev.map((client) => (client.id === updated.id ? updated : client)))
      setEditForm(null)
    } else {
      const err = await res.json().catch(() => ({}))
      setActionError(err.error || 'Klant bijwerken is mislukt')
      if (err.field_errors) setEditFieldErrors(err.field_errors)
    }

    setSavingEdit(false)
  }

  async function handleTriggerOnboarding(clientId: string) {
    setTriggeringId(clientId)
    setActionError('')
    setTriggerSuccess(null)

    const res = await fetch('/api/admin/onboarding/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, action: 'trigger' }),
    })

    if (res.ok) {
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, onboarding_completed_at: null } : c
      ))
      setTriggerSuccess(clientId)
      setTimeout(() => setTriggerSuccess(null), 3000)
    } else {
      const err = await res.json().catch(() => ({}))
      setActionError(err.error || 'Onboarding triggeren mislukt')
    }

    setTriggeringId(null)
  }

  async function handleConfirmDeleteClient() {
    if (!deleteTarget) return

    setDeletingClientId(deleteTarget.id)
    setDeleteError('')

    const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, {
      method: 'DELETE',
    })

    const err = await res.json().catch(() => ({}))
    if (!res.ok) {
      setDeleteError(err.error || 'Klant verwijderen is mislukt')
      setDeletingClientId(null)
      return
    }

    setClients((prev) => prev.filter((client) => client.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeletingClientId(null)
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Klanten</h1>
          <p className="text-white/50 mt-1">Beheer klantprofielen, bedrijfsgegevens en facturatie-informatie.</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setActionError('')
            setCreateEmailErrors({})
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Nieuwe klant
        </button>
      </div>

      {actionError && (
        <div className="mb-4 glass-card p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {/* New client form */}
      {showForm && (
        <div className="glass-card p-6 mb-6 border-brand-blue/20">
          <h2 className="text-lg font-semibold text-white mb-4">Nieuwe klant toevoegen</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Naam eigenaar account *">
                <input
                  type="text"
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value, name: e.target.value }))}
                  required
                  className={INPUT_CLASS}
                  placeholder="Volledige naam"
                />
              </Field>
              <Field label="E-mail *" error={createEmailErrors.email || createFieldErrors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => {
                    const email = e.target.value
                    setForm(f => ({ ...f, email }))
                    setCreateEmailErrors(validateCreateEmails({ email, billing_email: form.billing_email }))
                  }}
                  required
                  className={INPUT_CLASS}
                  placeholder="klant@email.nl"
                />
              </Field>
              <Field label="Contactpersoon">
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Naam contactpersoon"
                />
              </Field>
              <Field label="Bedrijf">
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Bedrijfsnaam"
                />
              </Field>
              <Field label="Telefoon">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="+31 6..."
                />
              </Field>
              <Field label="KvK nummer" error={createFieldErrors.kvk_number}>
                <input
                  type="text"
                  value={form.kvk_number}
                  onChange={e => setForm(f => ({ ...f, kvk_number: formatKvkInput(e.target.value) }))}
                  className={INPUT_CLASS}
                  placeholder="12345678"
                />
              </Field>
              <Field label="BTW nummer" error={createFieldErrors.btw_number}>
                <input
                  type="text"
                  value={form.btw_number}
                  onChange={e => setForm(f => ({ ...f, btw_number: formatBtwInput(e.target.value) }))}
                  className={INPUT_CLASS}
                  placeholder="NL001234567B01"
                />
              </Field>
              <Field label="Factuur e-mail" error={createEmailErrors.billing_email || createFieldErrors.billing_email}>
                <input
                  type="email"
                  value={form.billing_email}
                  onChange={e => {
                    const billingEmail = e.target.value
                    setForm(f => ({ ...f, billing_email: billingEmail }))
                    setCreateEmailErrors(validateCreateEmails({ email: form.email, billing_email: billingEmail }))
                  }}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="IBAN" error={createFieldErrors.iban}>
                <input
                  type="text"
                  value={form.iban}
                  onChange={e => setForm(f => ({ ...f, iban: formatIbanInput(e.target.value) }))}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Adresregel 1">
                <input
                  type="text"
                  value={form.billing_address_line1}
                  onChange={e => setForm(f => ({ ...f, billing_address_line1: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Postcode">
                <input
                  type="text"
                  value={form.billing_postal_code}
                  onChange={e => setForm(f => ({ ...f, billing_postal_code: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Plaats">
                <input
                  type="text"
                  value={form.billing_city}
                  onChange={e => setForm(f => ({ ...f, billing_city: e.target.value }))}
                  className="input"
                />
              </Field>
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.mark_completed}
                  onChange={(e) => setForm((p) => ({ ...p, mark_completed: e.target.checked }))}
                  className="mt-1"
                />
                Markeer klantgegevens als compleet voor facturatie.
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-white font-medium rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Toevoegen
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-white/5 text-white/60 rounded-xl hover:bg-white/10 transition-all text-sm"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">Nog geen klanten. Voeg er een toe of voer de seed-data uit.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-medium">{client.company || client.name}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-white/40 mt-1">
                    <span>{client.email}</span>
                    {client.phone && <span>• {client.phone}</span>}
                    {client.kvk_number && <span>• KvK {client.kvk_number}</span>}
                    {client.btw_number && <span>• BTW {client.btw_number}</span>}
                  </div>
                  <div className="mt-2">
                    {client.onboarding_completed_at ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Onboarding voltooid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                        <Clock className="w-3 h-3" />
                        Onboarding in afwachting
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-white/30">
                    {new Date(client.created_at).toLocaleDateString('nl-NL')}
                  </span>
                  <button
                    onClick={() => handleTriggerOnboarding(client.id)}
                    disabled={triggeringId === client.id}
                    title="Onboarding opnieuw triggeren"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      triggerSuccess === client.id
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {triggeringId === client.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : triggerSuccess === client.id
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : <RefreshCw className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{triggerSuccess === client.id ? 'Getriggerd!' : 'Onboarding'}</span>
                  </button>
                  <Link
                    href={`/admin/clients/${client.id}?tab=${detailTab}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Bekijken</span>
                  </Link>
                  <button
                    onClick={() => {
                      setEditForm(toEditForm(client))
                      setActionError('')
                      setEditEmailErrors({})
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Bewerken</span>
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(client)
                      setDeleteError('')
                    }}
                    title="Klant verwijderen"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Verwijderen</span>
                  </button>
                </div>
              </div>
              <div className="mt-3 text-sm text-white/45">
                Factuuradres: {client.billing_address_line1 || '-'}
                {client.billing_postal_code || client.billing_city ? `, ${client.billing_postal_code || ''} ${client.billing_city || ''}` : ''}
                {client.billing_country ? `, ${client.billing_country}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {editForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl glass-card p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-lg font-semibold">Klant bewerken</h3>
              <button
                onClick={() => setEditForm(null)}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Naam eigenaar account">
                  <input className={INPUT_CLASS} value={editForm.owner_name} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, owner_name: e.target.value, name: e.target.value }) : prev)} />
                </Field>
                <Field label="E-mail" error={editEmailErrors.email || editFieldErrors.email}>
                  <input
                    className={INPUT_CLASS}
                    type="email"
                    value={editForm.email}
                    onChange={(e) => {
                      const email = e.target.value
                      setEditForm((prev) => prev ? ({ ...prev, email }) : prev)
                      setEditEmailErrors(validateEditEmails({ email, billing_email: editForm.billing_email }))
                    }}
                  />
                </Field>
                <Field label="Contactpersoon">
                  <input className={INPUT_CLASS} value={editForm.contact_person} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, contact_person: e.target.value }) : prev)} placeholder="Naam contactpersoon" />
                </Field>
                <Field label="Bedrijfsnaam">
                  <input className={INPUT_CLASS} value={editForm.company} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, company: e.target.value }) : prev)} />
                </Field>
                <Field label="Telefoon">
                  <input className={INPUT_CLASS} value={editForm.phone} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, phone: e.target.value }) : prev)} />
                </Field>
                <Field label="KvK nummer" error={editFieldErrors.kvk_number}>
                  <input className={INPUT_CLASS} value={editForm.kvk_number} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, kvk_number: formatKvkInput(e.target.value) }) : prev)} />
                </Field>
                <Field label="BTW nummer" error={editFieldErrors.btw_number}>
                  <input className={INPUT_CLASS} value={editForm.btw_number} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, btw_number: formatBtwInput(e.target.value) }) : prev)} />
                </Field>
                <Field label="Factuur e-mail" error={editEmailErrors.billing_email || editFieldErrors.billing_email}>
                  <input
                    className={INPUT_CLASS}
                    type="email"
                    value={editForm.billing_email}
                    onChange={(e) => {
                      const billingEmail = e.target.value
                      setEditForm((prev) => prev ? ({ ...prev, billing_email: billingEmail }) : prev)
                      setEditEmailErrors(validateEditEmails({ email: editForm.email, billing_email: billingEmail }))
                    }}
                  />
                </Field>
                <Field label="IBAN" error={editFieldErrors.iban}>
                  <input className={INPUT_CLASS} value={editForm.iban} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, iban: formatIbanInput(e.target.value) }) : prev)} />
                </Field>
                <Field label="Adresregel 1">
                  <input className={INPUT_CLASS} value={editForm.billing_address_line1} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, billing_address_line1: e.target.value }) : prev)} />
                </Field>
                <Field label="Adresregel 2">
                  <input className={INPUT_CLASS} value={editForm.billing_address_line2} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, billing_address_line2: e.target.value }) : prev)} />
                </Field>
                <Field label="Postcode">
                  <input className={INPUT_CLASS} value={editForm.billing_postal_code} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, billing_postal_code: e.target.value }) : prev)} />
                </Field>
                <Field label="Plaats">
                  <input className={INPUT_CLASS} value={editForm.billing_city} onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, billing_city: e.target.value }) : prev)} />
                </Field>
              </div>
              <label className="flex items-start gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={editForm.mark_completed}
                  onChange={(e) => setEditForm((prev) => prev ? ({ ...prev, mark_completed: e.target.checked }) : prev)}
                  className="mt-1"
                />
                Gegevens zijn compleet voor facturatie.
              </label>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={savingEdit} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan
                </button>
                <button type="button" onClick={() => setEditForm(null)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-sm">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card p-6 border border-white/10">
            <h3 className="text-white text-lg font-semibold">Klant verwijderen?</h3>
            <p className="text-sm text-white/70 mt-2">
              Weet je zeker dat je {deleteTarget.company || deleteTarget.name} wilt verwijderen? Dit verwijdert ook alle intakes, sessies en offertes.
            </p>

            {deleteError ? (
              <p className="text-sm text-red-300 mt-3" role="alert">{deleteError}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingClientId === deleteTarget.id}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm disabled:opacity-60"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClient}
                disabled={deletingClientId === deleteTarget.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {deletingClientId === deleteTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Definitief verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  error,
}: {
  label: string
  children: React.ReactNode
  error?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm text-white/60 mb-1.5">{label}</span>
      {children}
      {error ? <span className="block mt-1.5 text-xs text-red-300">{error}</span> : null}
    </label>
  )
}
