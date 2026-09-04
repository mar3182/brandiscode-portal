'use client'

import { useEffect, useState } from 'react'
import { Building2, Loader2, Save, CheckCircle2 } from 'lucide-react'
import {
  type ProfileFieldErrors,
  formatBtwInput,
  formatIbanInput,
  formatKvkInput,
  validateCompanyProfileFields,
} from '@/lib/companyProfileValidation'

interface ProfileForm {
  owner_name: string
  name: string
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

const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-gold/50 transition-all'

const initialForm: ProfileForm = {
  owner_name: '',
  name: '',
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

export default function BedrijfsgegevensPage() {
  const [form, setForm] = useState<ProfileForm>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch('/api/client-profile', { cache: 'no-store' })
      if (!res.ok) {
        setError('Kon bedrijfsgegevens niet laden')
        setLoading(false)
        return
      }

      const data = await res.json()
      setForm({
        owner_name: data.owner_name || '',
        name: data.name || '',
        company: data.company || '',
        phone: data.phone || '',
        contact_person: data.contact_person || '',
        kvk_number: data.kvk_number || '',
        btw_number: data.btw_number || '',
        iban: data.iban || '',
        billing_email: data.billing_email || data.email || '',
        billing_address_line1: data.billing_address_line1 || '',
        billing_address_line2: data.billing_address_line2 || '',
        billing_postal_code: data.billing_postal_code || '',
        billing_city: data.billing_city || '',
        billing_country: data.billing_country || 'Nederland',
        mark_completed: Boolean(data.onboarding_completed_at),
      })
      setSavedAt(data.onboarding_completed_at || null)
      setLoading(false)
    }

    loadProfile()
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const clientValidation = validateCompanyProfileFields({
      billing_email: form.billing_email,
      kvk_number: form.kvk_number,
      btw_number: form.btw_number,
      iban: form.iban,
    })

    if (Object.keys(clientValidation.errors).length > 0) {
      setFieldErrors(clientValidation.errors)
      setSaving(false)
      return
    }

    const res = await fetch('/api/client-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setError(payload?.error || 'Opslaan is mislukt')
      if (payload?.field_errors) setFieldErrors(payload.field_errors)
      setSaving(false)
      return
    }

    const updated = await res.json()
    setSavedAt(updated.onboarding_completed_at || null)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="glass-card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Bedrijfsgegevens</h1>
        <p className="text-white/50 mt-1">
          Vul deze gegevens in voor de start van de opdracht. Deze informatie gebruiken we voor administratie en facturatie.
        </p>
      </div>

      {error && (
        <div className="mb-4 glass-card p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      {savedAt && (
        <div className="mb-4 glass-card p-4 border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Gegevens laatst opgeslagen op {new Date(savedAt).toLocaleString('nl-NL')}
        </div>
      )}

      <form onSubmit={onSubmit} className="glass-card p-6 space-y-8">
        <section>
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-gold" />
            Bedrijf en contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Naam eigenaar account *">
              <input value={form.owner_name} onChange={(e) => setForm((p) => ({ ...p, owner_name: e.target.value }))} required className={INPUT_CLASS} />
            </Field>
            <Field label="Contactnaam *">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={INPUT_CLASS} />
            </Field>
            <Field label="Bedrijfsnaam">
              <input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Telefoon">
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Financieel contactpersoon">
              <input value={form.contact_person} onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Factuur e-mail" error={fieldErrors.billing_email}>
              <input type="email" value={form.billing_email} onChange={(e) => setForm((p) => ({ ...p, billing_email: e.target.value }))} className={INPUT_CLASS} />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-4">Zakelijke gegevens</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="KvK nummer" error={fieldErrors.kvk_number}>
              <input value={form.kvk_number} onChange={(e) => setForm((p) => ({ ...p, kvk_number: formatKvkInput(e.target.value) }))} className={INPUT_CLASS} placeholder="12345678" />
            </Field>
            <Field label="BTW nummer" error={fieldErrors.btw_number}>
              <input value={form.btw_number} onChange={(e) => setForm((p) => ({ ...p, btw_number: formatBtwInput(e.target.value) }))} className={INPUT_CLASS} placeholder="NL001234567B01" />
            </Field>
            <Field label="IBAN" error={fieldErrors.iban}>
              <input value={form.iban} onChange={(e) => setForm((p) => ({ ...p, iban: formatIbanInput(e.target.value) }))} className={INPUT_CLASS} placeholder="NL00 BANK 0123 4567 89" />
            </Field>
          </div>
        </section>

        <section>
          <h2 className="text-white font-semibold mb-4">Factuuradres</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Adresregel 1">
              <input value={form.billing_address_line1} onChange={(e) => setForm((p) => ({ ...p, billing_address_line1: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Adresregel 2">
              <input value={form.billing_address_line2} onChange={(e) => setForm((p) => ({ ...p, billing_address_line2: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Postcode">
              <input value={form.billing_postal_code} onChange={(e) => setForm((p) => ({ ...p, billing_postal_code: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Plaats">
              <input value={form.billing_city} onChange={(e) => setForm((p) => ({ ...p, billing_city: e.target.value }))} className={INPUT_CLASS} />
            </Field>
            <Field label="Land">
              <input value={form.billing_country} onChange={(e) => setForm((p) => ({ ...p, billing_country: e.target.value }))} className={INPUT_CLASS} />
            </Field>
          </div>
        </section>

        <label className="flex items-start gap-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.mark_completed}
            onChange={(e) => setForm((p) => ({ ...p, mark_completed: e.target.checked }))}
            className="mt-1"
          />
          Deze bedrijfsgegevens zijn compleet en mogen gebruikt worden voor facturatie.
        </label>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Opslaan
          </button>
        </div>
      </form>
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
