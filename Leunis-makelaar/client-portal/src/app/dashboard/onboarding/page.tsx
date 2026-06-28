'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ProfileFieldErrors,
  formatBtwInput,
  formatIbanInput,
  formatKvkInput,
} from '@/lib/companyProfileValidation'
import { Building2, Users, FileText, MessageCircle, CheckCircle2, ArrowRight, Loader2, ChevronRight } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Bedrijfsgegevens' },
  { id: 2, label: 'Welkom in de portal' },
  { id: 3, label: 'Klaar!' },
]

const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-all'

interface BillingForm {
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
}

const emptyForm: BillingForm = {
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
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<BillingForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/onboarding/wizard')
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      if (data.client) {
        setForm({
          contact_person: data.client.contact_person ?? '',
          kvk_number: data.client.kvk_number ?? '',
          btw_number: data.client.btw_number ?? '',
          iban: data.client.iban ?? '',
          billing_email: data.client.billing_email ?? '',
          billing_address_line1: data.client.billing_address_line1 ?? '',
          billing_address_line2: data.client.billing_address_line2 ?? '',
          billing_postal_code: data.client.billing_postal_code ?? '',
          billing_city: data.client.billing_city ?? '',
          billing_country: data.client.billing_country ?? 'Nederland',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleBillingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const res = await fetch('/api/onboarding/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'billing', ...form }),
    })
    const data = await res.json()

    if (!res.ok) {
      if (data.errors) setFieldErrors(data.errors)
      else setError(data.error ?? 'Er ging iets mis. Probeer het opnieuw.')
      setSaving(false)
      return
    }

    setSaving(false)
    setStep(2)
  }

  async function handleComplete() {
    setSaving(true)
    await fetch('/api/onboarding/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'complete' }),
    })
    setSaving(false)
    setStep(3)
  }

  function goToDashboard() {
    router.push('/dashboard')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Voortgangsbalk */}
      {step < 3 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'bg-brand-gold text-black' :
                  'bg-white/10 text-white/40'
                }`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-sm hidden sm:block ${step === s.id ? 'text-white font-medium' : 'text-white/40'}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-white/20 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stap 1 — Bedrijfsgegevens */}
      {step === 1 && (
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Bedrijfsgegevens</h1>
              <p className="text-white/50 text-sm">Vul je gegevens in voor facturatie</p>
            </div>
          </div>

          <form onSubmit={handleBillingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Contactpersoon *</label>
              <input
                className={INPUT_CLASS}
                placeholder="Voor- en achternaam"
                value={form.contact_person}
                onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">KvK-nummer</label>
                <input
                  className={`${INPUT_CLASS}${fieldErrors.kvk_number ? ' border-red-500/50' : ''}`}
                  placeholder="12345678"
                  value={form.kvk_number}
                  onChange={e => setForm(f => ({ ...f, kvk_number: formatKvkInput(e.target.value) }))}
                  maxLength={8}
                />
                {fieldErrors.kvk_number && <p className="text-red-400 text-xs mt-1">{fieldErrors.kvk_number}</p>}
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">BTW-nummer</label>
                <input
                  className={`${INPUT_CLASS}${fieldErrors.btw_number ? ' border-red-500/50' : ''}`}
                  placeholder="NL123456789B01"
                  value={form.btw_number}
                  onChange={e => setForm(f => ({ ...f, btw_number: formatBtwInput(e.target.value) }))}
                  maxLength={14}
                />
                {fieldErrors.btw_number && <p className="text-red-400 text-xs mt-1">{fieldErrors.btw_number}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">IBAN</label>
              <input
                className={`${INPUT_CLASS}${fieldErrors.iban ? ' border-red-500/50' : ''}`}
                placeholder="NL00 BANK 0000 0000 00"
                value={form.iban}
                onChange={e => setForm(f => ({ ...f, iban: formatIbanInput(e.target.value) }))}
              />
              {fieldErrors.iban && <p className="text-red-400 text-xs mt-1">{fieldErrors.iban}</p>}
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Factuur e-mailadres *</label>
              <input
                type="email"
                className={`${INPUT_CLASS}${fieldErrors.billing_email ? ' border-red-500/50' : ''}`}
                placeholder="facturen@bedrijf.nl"
                value={form.billing_email}
                onChange={e => setForm(f => ({ ...f, billing_email: e.target.value }))}
                required
              />
              {fieldErrors.billing_email && <p className="text-red-400 text-xs mt-1">{fieldErrors.billing_email}</p>}
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5">Factuuradres *</label>
              <input
                className={INPUT_CLASS}
                placeholder="Straat en huisnummer"
                value={form.billing_address_line1}
                onChange={e => setForm(f => ({ ...f, billing_address_line1: e.target.value }))}
                required
              />
            </div>
            <div>
              <input
                className={INPUT_CLASS}
                placeholder="Toevoeging (optioneel)"
                value={form.billing_address_line2}
                onChange={e => setForm(f => ({ ...f, billing_address_line2: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Postcode *</label>
                <input
                  className={INPUT_CLASS}
                  placeholder="1234 AB"
                  value={form.billing_postal_code}
                  onChange={e => setForm(f => ({ ...f, billing_postal_code: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Stad *</label>
                <input
                  className={INPUT_CLASS}
                  placeholder="Amsterdam"
                  value={form.billing_city}
                  onChange={e => setForm(f => ({ ...f, billing_city: e.target.value }))}
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Volgende stap
            </button>
          </form>
        </div>
      )}

      {/* Stap 2 — Portal tour */}
      {step === 2 && (
        <div className="glass-card p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Welkom in jouw portal</h1>
            <p className="text-white/50">Dit is wat je allemaal kunt doen</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Team</h3>
                <p className="text-white/50 text-sm">Voeg teamleden toe zodat collega&apos;s ook toegang krijgen tot de portal.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Facturen</h3>
                <p className="text-white/50 text-sm">Bekijk, download en betaal je facturen direct vanuit de portal.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">AI Chat</h3>
                  <span className="text-xs bg-brand-gold/20 text-brand-gold px-2 py-0.5 rounded-full">Binnenkort</span>
                </div>
                <p className="text-white/50 text-sm">Stel vragen aan onze AI assistent. Complexe vragen worden direct doorgestuurd naar ons team.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Afronden
          </button>
        </div>
      )}

      {/* Stap 3 — Klaar */}
      {step === 3 && (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Alles is ingesteld!</h1>
          <p className="text-white/50 mb-8">Je bedrijfsgegevens zijn opgeslagen en je portal staat klaar voor gebruik.</p>
          <button
            onClick={goToDashboard}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl hover:bg-brand-gold/90 transition-all"
          >
            Naar het dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
