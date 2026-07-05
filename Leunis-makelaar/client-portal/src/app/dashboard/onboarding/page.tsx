'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ProfileFieldErrors,
  formatBtwInput,
  formatIbanInput,
  formatKvkInput,
} from '@/lib/companyProfileValidation'
import {
  DEFAULT_FOCUS_AREA,
  computeTrainingCompleteness,
  validateCommunicationPreference,
  validateTrainingIntake,
  type TrainingIntakeInput,
  type TrainingIntakeMemberInput,
} from '@/lib/trainingIntake'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Save,
  Users,
} from 'lucide-react'

const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-all'

const STEPS = [
  { id: 1, label: 'Bedrijfsgegevens' },
  { id: 2, label: 'Training intake' },
  { id: 3, label: 'Teamlid intake' },
  { id: 4, label: 'Samenvatting' },
  { id: 5, label: 'Klaar' },
]

const STATUS_LABELS: Record<'draft' | 'submitted' | 'reviewed' | 'planned', string> = {
  draft: 'Concept',
  submitted: 'Ingediend',
  reviewed: 'Beoordeeld',
  planned: 'Gepland',
}

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

const emptyBilling: BillingForm = {
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

function createEmptyMember(index: number): TrainingIntakeMemberInput {
  return {
    full_name: '',
    role: '',
    top_tasks: ['', '', ''],
    bottleneck: '',
    kpi_goal: '',
    digital_skill: null,
    ai_experience: '',
    prompt_data_boundary: '',
    training_day_availability: '',
    sort_order: index,
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [channelTouched, setChannelTouched] = useState(false)
  const [status, setStatus] = useState<'draft' | 'submitted' | 'reviewed' | 'planned'>('draft')

  const [billing, setBilling] = useState<BillingForm>(emptyBilling)
  const [training, setTraining] = useState<TrainingIntakeInput>({
    training_duration: '',
    preferred_datetime: '',
    preferred_time_note: '',
    contact_person: '',
    contact_email: '',
    focus_area: DEFAULT_FOCUS_AREA,
    privacy_constraints: '',
    data_usage_consent: false,
    communication_channel: '',
    communication_email: '',
    communication_whatsapp: '',
    portal_notifications_enabled: false,
    trainer_notes: '',
    members: [createEmptyMember(0)],
      communication_consent: false,
      communication_notes: '',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      const [billingRes, intakeRes] = await Promise.all([
        fetch('/api/onboarding/wizard'),
        fetch('/api/training-intake'),
      ])

      if (billingRes.ok) {
        const billingData = await billingRes.json()
        if (billingData.client) {
          setBilling({
            contact_person: billingData.client.contact_person ?? '',
            kvk_number: billingData.client.kvk_number ?? '',
            btw_number: billingData.client.btw_number ?? '',
            iban: billingData.client.iban ?? '',
            billing_email: billingData.client.billing_email ?? '',
            billing_address_line1: billingData.client.billing_address_line1 ?? '',
            billing_address_line2: billingData.client.billing_address_line2 ?? '',
            billing_postal_code: billingData.client.billing_postal_code ?? '',
            billing_city: billingData.client.billing_city ?? '',
            billing_country: billingData.client.billing_country ?? 'Nederland',
          })
        }
      }

      if (intakeRes.ok) {
        const intakeData = await intakeRes.json()
        if (intakeData.intake) {
          setTraining({
            training_duration: intakeData.intake.training_duration ?? '',
            preferred_datetime: intakeData.intake.preferred_datetime ?? '',
            preferred_time_note: intakeData.intake.preferred_time_note ?? '',
            contact_person: intakeData.intake.contact_person ?? '',
            contact_email: intakeData.intake.contact_email ?? '',
            focus_area: intakeData.intake.focus_area ?? DEFAULT_FOCUS_AREA,
            privacy_constraints: intakeData.intake.privacy_constraints ?? '',
            data_usage_consent: Boolean(intakeData.intake.data_usage_consent),
            communication_channel: intakeData.intake.communication_channel === 'portal' || intakeData.intake.communication_channel === 'email' || intakeData.intake.communication_channel === 'whatsapp'
              ? intakeData.intake.communication_channel
              : '',
            communication_email: intakeData.intake.communication_email ?? '',
            communication_whatsapp: intakeData.intake.communication_whatsapp ?? '',
              communication_consent: Boolean(intakeData.intake.communication_consent),
              communication_notes: intakeData.intake.communication_notes ?? '',
            portal_notifications_enabled: Boolean(intakeData.intake.portal_notifications_enabled),
            trainer_notes: intakeData.intake.trainer_notes ?? '',
            members: Array.isArray(intakeData.members) && intakeData.members.length > 0
              ? intakeData.members.map((member: any, index: number) => ({
                id: member.id,
                full_name: member.full_name ?? '',
                role: member.role ?? '',
                top_tasks: Array.isArray(member.top_tasks) && member.top_tasks.length === 3
                  ? member.top_tasks
                  : [member.top_tasks?.[0] ?? '', member.top_tasks?.[1] ?? '', member.top_tasks?.[2] ?? ''],
                bottleneck: member.bottleneck ?? '',
                kpi_goal: member.kpi_goal ?? '',
                digital_skill: typeof member.digital_skill === 'number' ? member.digital_skill : null,
                ai_experience: member.ai_experience ?? '',
                prompt_data_boundary: member.prompt_data_boundary ?? '',
                training_day_availability: member.training_day_availability ?? '',
                sort_order: typeof member.sort_order === 'number' ? member.sort_order : index,
              }))
              : [createEmptyMember(0)],
          })
          setStatus(intakeData.intake.status ?? 'draft')
        }
      }

      setLoading(false)
    }

    load()
  }, [])

  const completeness = useMemo(() => computeTrainingCompleteness(training), [training])
  const communicationErrors = useMemo(() => validateCommunicationPreference(training), [training])

  async function saveBilling() {
    const res = await fetch('/api/onboarding/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'billing', ...billing }),
    })

    const data = await res.json()
    if (!res.ok) {
      if (data.errors) setFieldErrors(data.errors)
      setError(data.error ?? 'Bedrijfsgegevens opslaan is mislukt.')
      return false
    }

    setFieldErrors({})
    return true
  }

  async function saveTrainingDraft(submit: boolean) {
    const res = await fetch('/api/training-intake', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...training, submit }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Opslaan mislukt.')
      if (Array.isArray(data.validationErrors)) setValidationErrors(data.validationErrors)
      return false
    }

    setStatus(data.status)
    setValidationErrors([])
    setSuccessMessage(submit ? 'Intake is ingediend.' : 'Concept is opgeslagen.')
    return true
  }

  async function handleBillingSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const ok = await saveBilling()
    setSaving(false)
    if (ok) setStep(2)
  }

  async function handleDraftSave() {
    setSaving(true)
    setError('')
    await saveTrainingDraft(false)
    setSaving(false)
  }

  async function handleSubmitIntake() {
    setSaving(true)
    setError('')
    setChannelTouched(true)

    const localErrors = validateTrainingIntake(training)
    if (localErrors.length > 0) {
      setValidationErrors(localErrors)
      setSaving(false)
      return
    }

    const saved = await saveTrainingDraft(true)
    if (!saved) {
      setSaving(false)
      return
    }

    await fetch('/api/onboarding/wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'complete' }),
    })

    setSaving(false)
    setStep(5)
  }

  function addMember() {
    setTraining((prev) => ({
      ...prev,
      members: [...prev.members, createEmptyMember(prev.members.length)],
    }))
  }

  function removeMember(index: number) {
    setTraining((prev) => {
      const members = prev.members.filter((_, idx) => idx !== index)
      return {
        ...prev,
        members: members.length > 0 ? members : [createEmptyMember(0)],
      }
    })
  }

  function updateMember(index: number, patch: Partial<TrainingIntakeMemberInput>) {
    setTraining((prev) => ({
      ...prev,
      members: prev.members.map((member, idx) => (idx === index ? { ...member, ...patch } : member)),
    }))
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {step < 5 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {STEPS.filter((s) => s.id < 5).map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step > item.id ? 'bg-green-500 text-white' : step === item.id ? 'bg-brand-gold text-black' : 'bg-white/10 text-white/50'
                }`}>
                  {step > item.id ? <CheckCircle2 className="w-4 h-4" /> : item.id}
                </div>
                <span className={`text-xs sm:text-sm ${step === item.id ? 'text-white font-semibold' : 'text-white/50'}`}>
                  {item.label}
                </span>
                {idx < 3 ? <ChevronRight className="w-4 h-4 text-white/20" /> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {error ? <div className="glass-card border border-red-500/40 p-4 text-red-300 text-sm">{error}</div> : null}
      {successMessage ? <div className="glass-card border border-green-500/40 p-4 text-green-300 text-sm">{successMessage}</div> : null}

      {step === 1 && (
        <div className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-brand-gold" />
            <div>
              <h1 className="text-xl font-bold text-white">Bedrijfsgegevens</h1>
              <p className="text-white/50 text-sm">Deze gegevens gebruiken we voor facturatie.</p>
            </div>
          </div>

          <form onSubmit={handleBillingSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Contactpersoon *</label>
              <input className={INPUT_CLASS} value={billing.contact_person} onChange={(e) => setBilling((prev) => ({ ...prev, contact_person: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">KvK-nummer</label>
                <input className={INPUT_CLASS} value={billing.kvk_number} onChange={(e) => setBilling((prev) => ({ ...prev, kvk_number: formatKvkInput(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">BTW-nummer</label>
                <input className={INPUT_CLASS} value={billing.btw_number} onChange={(e) => setBilling((prev) => ({ ...prev, btw_number: formatBtwInput(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">IBAN</label>
              <input className={INPUT_CLASS} value={billing.iban} onChange={(e) => setBilling((prev) => ({ ...prev, iban: formatIbanInput(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Factuur e-mail *</label>
              <input type="email" className={INPUT_CLASS} value={billing.billing_email} onChange={(e) => setBilling((prev) => ({ ...prev, billing_email: e.target.value }))} />
              {fieldErrors.billing_email ? <p className="text-red-400 text-xs mt-1">{fieldErrors.billing_email}</p> : null}
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Adres *</label>
              <input className={INPUT_CLASS} value={billing.billing_address_line1} onChange={(e) => setBilling((prev) => ({ ...prev, billing_address_line1: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Postcode *</label>
                <input className={INPUT_CLASS} value={billing.billing_postal_code} onChange={(e) => setBilling((prev) => ({ ...prev, billing_postal_code: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Stad *</label>
                <input className={INPUT_CLASS} value={billing.billing_city} onChange={(e) => setBilling((prev) => ({ ...prev, billing_city: e.target.value }))} />
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-black font-semibold rounded-xl disabled:opacity-60" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} Volgende stap
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-brand-gold" />
            <div>
              <h2 className="text-xl font-bold text-white">Training Intake (klantniveau)</h2>
              <p className="text-white/50 text-sm">Status: {STATUS_LABELS[status]}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Gewenste trainingsduur *</label>
              <select className={INPUT_CLASS} value={training.training_duration} onChange={(e) => setTraining((prev) => ({ ...prev, training_duration: e.target.value as '2u' | '3u' | '' }))}>
                <option value="">Kies duur</option>
                <option value="2u">2 uur</option>
                <option value="3u">3 uur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Voorkeursdatum/tijd *</label>
              <input type="datetime-local" className={INPUT_CLASS} value={training.preferred_datetime} onChange={(e) => setTraining((prev) => ({ ...prev, preferred_datetime: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Contactpersoon *</label>
              <input className={INPUT_CLASS} value={training.contact_person} onChange={(e) => setTraining((prev) => ({ ...prev, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Contact e-mail *</label>
              <input type="email" className={INPUT_CLASS} value={training.contact_email} onChange={(e) => setTraining((prev) => ({ ...prev, contact_email: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Focusgebied *</label>
            <input className={INPUT_CLASS} value={training.focus_area} onChange={(e) => setTraining((prev) => ({ ...prev, focus_area: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Privacy/security randvoorwaarden *</label>
            <textarea className={`${INPUT_CLASS} min-h-24`} value={training.privacy_constraints} onChange={(e) => setTraining((prev) => ({ ...prev, privacy_constraints: e.target.value }))} />
          </div>

          <label className="flex items-start gap-3 text-sm text-white/70">
            <input type="checkbox" checked={training.data_usage_consent} onChange={(e) => setTraining((prev) => ({ ...prev, data_usage_consent: e.target.checked }))} className="mt-1" />
            Ik ga akkoord dat deze data gebruikt wordt voor trainingsvoorbereiding.
          </label>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div>
              <h3 className="text-white font-semibold">Communicatievoorkeur</h3>
              <p className="text-xs text-white/50 mt-1">Kies hoe je trainingsvoorstellen en bevestigingen wilt ontvangen.</p>
            </div>

            <fieldset>
              <legend className="text-sm text-white/70 mb-2">Voorkeurskanaal *</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'portal', label: 'Portal' },
                  { value: 'email', label: 'E-mail' },
                  { value: 'whatsapp', label: 'WhatsApp' },
                ].map((option) => (
                  <label key={option.value} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition ${training.communication_channel === option.value ? 'border-brand-gold/60 bg-brand-gold/10 text-white' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'}`}>
                    <input
                      type="radio"
                      name="communication-channel"
                      value={option.value}
                      checked={training.communication_channel === option.value}
                      onChange={(e) => {
                        const channel = e.target.value as 'portal' | 'email' | 'whatsapp'
                        setChannelTouched(true)
                        setTraining((prev) => ({
                          ...prev,
                          communication_channel: channel,
                          communication_email: channel === 'email' ? prev.communication_email : '',
                          communication_whatsapp: channel === 'whatsapp' ? prev.communication_whatsapp : '',
                          communication_notes:
                            channel === 'whatsapp'
                              ? prev.communication_notes || 'Alleen template-bericht met portal-link versturen.'
                              : '',
                          portal_notifications_enabled: channel === 'portal',
                        }))
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {training.communication_channel === 'portal' ? (
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={training.portal_notifications_enabled}
                  onChange={(e) => {
                    setChannelTouched(true)
                    setTraining((prev) => ({ ...prev, portal_notifications_enabled: e.target.checked }))
                  }}
                  className="mt-1"
                />
                Ik wil meldingen in het portal ontvangen voor nieuwe voorstellen en bevestigingen.
              </label>
            ) : null}

            {training.communication_channel === 'email' ? (
              <div>
                <label className="block text-sm text-white/60 mb-1.5">E-mailadres voor communicatie *</label>
                <input
                  type="email"
                  className={INPUT_CLASS}
                  value={training.communication_email}
                  onChange={(e) => {
                    setChannelTouched(true)
                    setTraining((prev) => ({ ...prev, communication_email: e.target.value }))
                  }}
                  placeholder="bijv. planning@bedrijf.nl"
                />
              </div>
            ) : null}

            {training.communication_channel === 'whatsapp' ? (
              <div className="space-y-3">
                <label className="block text-sm text-white/60 mb-1.5">WhatsApp-nummer *</label>
                <input
                  type="tel"
                  className={INPUT_CLASS}
                  value={training.communication_whatsapp}
                  onChange={(e) => {
                    setChannelTouched(true)
                    setTraining((prev) => ({ ...prev, communication_whatsapp: e.target.value }))
                  }}
                  placeholder="bijv. +31612345678"
                />

                <div>
                  <label className="block text-sm text-white/60 mb-1.5">Template-notitie *</label>
                  <textarea
                    className={`${INPUT_CLASS} min-h-20`}
                    value={training.communication_notes}
                    onChange={(e) => {
                      setChannelTouched(true)
                      setTraining((prev) => ({ ...prev, communication_notes: e.target.value }))
                    }}
                    placeholder="Bevestig dat alleen een template-bericht met portal-link wordt verstuurd."
                  />
                </div>
              </div>
            ) : null}

            {training.communication_channel ? (
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={training.communication_consent}
                  onChange={(e) => {
                    setChannelTouched(true)
                    setTraining((prev) => ({ ...prev, communication_consent: e.target.checked }))
                  }}
                  className="mt-1"
                />
                Ik geef toestemming om voorstellen en bevestigingen via dit kanaal te ontvangen.
              </label>
            ) : null}

            {channelTouched && communicationErrors.length > 0 ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3" role="status" aria-live="polite">
                <p className="text-red-200 text-sm font-medium">Controleer je communicatievoorkeur:</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-red-100 space-y-1">
                  {communicationErrors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleDraftSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold">Volgende: teamleden</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-brand-gold" />
              <h2 className="text-xl font-bold text-white">Teamlid intake</h2>
            </div>
            <button onClick={addMember} className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm">+ Teamlid</button>
          </div>

          <div className="space-y-4">
            {training.members.map((member, index) => (
              <div key={index} className="rounded-xl border border-white/10 p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/70">Teamlid {index + 1}</p>
                  {training.members.length > 1 ? (
                    <button onClick={() => removeMember(index)} className="text-xs text-red-300">Verwijderen</button>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={INPUT_CLASS} placeholder="Naam *" value={member.full_name} onChange={(e) => updateMember(index, { full_name: e.target.value })} />
                  <input className={INPUT_CLASS} placeholder="Rol *" value={member.role} onChange={(e) => updateMember(index, { role: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {member.top_tasks.map((task, taskIndex) => (
                    <input key={taskIndex} className={INPUT_CLASS} placeholder={`Top taak ${taskIndex + 1} *`} value={task} onChange={(e) => {
                      const nextTasks = [...member.top_tasks]
                      nextTasks[taskIndex] = e.target.value
                      updateMember(index, { top_tasks: nextTasks })
                    }} />
                  ))}
                </div>
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="Grootste knelpunt *" value={member.bottleneck} onChange={(e) => updateMember(index, { bottleneck: e.target.value })} />
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="KPI/doelresultaat *" value={member.kpi_goal} onChange={(e) => updateMember(index, { kpi_goal: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select className={INPUT_CLASS} value={member.digital_skill ?? ''} onChange={(e) => updateMember(index, { digital_skill: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Digitale vaardigheid (1-5) *</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <input className={INPUT_CLASS} placeholder="AI-ervaring *" value={member.ai_experience} onChange={(e) => updateMember(index, { ai_experience: e.target.value })} />
                </div>
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="Datagrens (wat mag niet in prompts) *" value={member.prompt_data_boundary} onChange={(e) => updateMember(index, { prompt_data_boundary: e.target.value })} />
                <input className={INPUT_CLASS} placeholder="Beschikbaarheid trainingsdag *" value={member.training_day_availability} onChange={(e) => updateMember(index, { training_day_availability: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleDraftSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={() => setStep(4)} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold">Naar samenvatting</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="glass-card p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-bold text-white">Controleer en verzend</h2>

          <div className="rounded-xl border border-white/10 p-4 bg-white/5 text-sm text-white/80 space-y-2">
            <p><strong className="text-white">Trainingsduur:</strong> {training.training_duration || '-'}</p>
            <p><strong className="text-white">Voorkeursmoment:</strong> {training.preferred_datetime || '-'}</p>
            <p><strong className="text-white">Contact:</strong> {training.contact_person || '-'} ({training.contact_email || '-'})</p>
            <p><strong className="text-white">Communicatiekanaal:</strong> {training.communication_channel || '-'}</p>
            <p><strong className="text-white">Kanaaltoestemming:</strong> {training.communication_consent ? 'Ja' : 'Nee'}</p>
            {training.communication_channel === 'email' ? <p><strong className="text-white">Kanaal e-mail:</strong> {training.communication_email || '-'}</p> : null}
            {training.communication_channel === 'whatsapp' ? <p><strong className="text-white">WhatsApp:</strong> {training.communication_whatsapp || '-'}</p> : null}
            {training.communication_channel === 'whatsapp' ? <p><strong className="text-white">Template-notitie:</strong> {training.communication_notes || '-'}</p> : null}
            {training.communication_channel === 'portal' ? <p><strong className="text-white">Portalmeldingen:</strong> {training.portal_notifications_enabled ? 'Aan' : 'Uit'}</p> : null}
            <p><strong className="text-white">Focus:</strong> {training.focus_area}</p>
            <p><strong className="text-white">Teamleden:</strong> {training.members.length}</p>
          </div>

          <div className={`rounded-xl p-4 border ${completeness.readyForTraining ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'}`}>
            <p className="font-semibold">{completeness.readyForTraining ? 'Ready for training' : 'Nog niet klaar voor planning'}</p>
            {!completeness.readyForTraining ? (
              <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                {completeness.missingRequiredFields.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {validationErrors.length > 0 ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
              <p className="font-semibold">Los eerst deze punten op:</p>
              <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                {validationErrors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleDraftSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={handleSubmitIntake} disabled={saving} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold">
              Definitief indienen
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="glass-card p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Intake ingediend</h2>
          <p className="text-white/60">Bedankt. De status staat nu op <span className="text-white font-medium">Ingediend</span>. Ons team beoordeelt jullie intake en plant daarna de trainingssessie. Je ontvangt hiervan een update.</p>
          <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-semibold">
            Naar dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
