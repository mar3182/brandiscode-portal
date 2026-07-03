'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2, Save, Users } from 'lucide-react'

type CommunicationChannel = 'portal' | 'email' | 'whatsapp' | ''
type IntakeStatus = 'draft' | 'submitted' | 'reviewed' | 'planned'

interface TrainingMember {
  full_name: string
  role: string
  top_tasks: string[]
  bottleneck: string
  kpi_goal: string
  digital_skill: number | null
  ai_experience: string
  prompt_data_boundary: string
  training_day_availability: string
  sort_order: number
}

interface TrainingInput {
  training_duration: '2u' | '3u' | ''
  preferred_datetime: string
  preferred_time_note: string
  contact_person: string
  contact_email: string
  focus_area: string
  privacy_constraints: string
  data_usage_consent: boolean
  communication_channel: CommunicationChannel
  communication_email: string
  communication_whatsapp: string
  communication_consent: boolean
  communication_notes: string
  portal_notifications_enabled: boolean
  trainer_notes: string
  members: TrainingMember[]
}

const INPUT_CLASS = 'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-all'

function createEmptyMember(index: number): TrainingMember {
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

export default function AdminClientIntakePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [status, setStatus] = useState<IntakeStatus>('draft')
  const [clientName, setClientName] = useState('')

  const [training, setTraining] = useState<TrainingInput>({
    training_duration: '',
    preferred_datetime: '',
    preferred_time_note: '',
    contact_person: '',
    contact_email: '',
    focus_area: 'huizenbeschrijvingen-agent',
    privacy_constraints: '',
    data_usage_consent: false,
    communication_channel: '',
    communication_email: '',
    communication_whatsapp: '',
    communication_consent: false,
    communication_notes: '',
    portal_notifications_enabled: false,
    trainer_notes: '',
    members: [],
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      const res = await fetch(`/api/admin/clients/${id}/intake`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || 'Intake laden is mislukt.')
        setLoading(false)
        return
      }

      setClientName(data.client?.company || data.client?.name || 'Klant')

      setTraining({
        training_duration: data.intake?.training_duration ?? '',
        preferred_datetime: data.intake?.preferred_datetime ?? '',
        preferred_time_note: data.intake?.preferred_time_note ?? '',
        contact_person: data.intake?.contact_person ?? data.client?.contact_person ?? '',
        contact_email: data.intake?.contact_email ?? data.client?.email ?? '',
        focus_area: data.intake?.focus_area ?? 'huizenbeschrijvingen-agent',
        privacy_constraints: data.intake?.privacy_constraints ?? '',
        data_usage_consent: Boolean(data.intake?.data_usage_consent),
        communication_channel:
          data.intake?.communication_channel === 'portal' || data.intake?.communication_channel === 'email' || data.intake?.communication_channel === 'whatsapp'
            ? data.intake.communication_channel
            : '',
        communication_email: data.intake?.communication_email ?? '',
        communication_whatsapp: data.intake?.communication_whatsapp ?? '',
        communication_consent: Boolean(data.intake?.communication_consent),
        communication_notes: data.intake?.communication_notes ?? '',
        portal_notifications_enabled: Boolean(data.intake?.portal_notifications_enabled),
        trainer_notes: data.intake?.trainer_notes ?? '',
        members: Array.isArray(data.members)
          ? data.members.map((member: any, index: number) => ({
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
          : [],
      })

      setStatus((data.intake?.status ?? 'draft') as IntakeStatus)
      setLoading(false)
    }

    void load()
  }, [id])

  const requiredErrors = useMemo(() => {
    const errors: string[] = []
    if (!training.contact_person.trim()) errors.push('Contactpersoon is verplicht voor definitief indienen.')
    if (!training.contact_email.trim()) errors.push('Contact e-mail is verplicht voor definitief indienen.')
    return errors
  }, [training.contact_person, training.contact_email])

  function updateMember(index: number, patch: Partial<TrainingMember>) {
    setTraining((prev) => ({
      ...prev,
      members: prev.members.map((member, idx) => (idx === index ? { ...member, ...patch } : member)),
    }))
  }

  function addMember() {
    setTraining((prev) => ({ ...prev, members: [...prev.members, createEmptyMember(prev.members.length)] }))
  }

  function removeMember(index: number) {
    setTraining((prev) => ({ ...prev, members: prev.members.filter((_, idx) => idx !== index) }))
  }

  async function saveIntake(submit: boolean) {
    setSaving(true)
    setError('')

    const res = await fetch(`/api/admin/clients/${id}/intake`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...training, submit }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Opslaan mislukt.')
      setSaving(false)
      return false
    }

    setStatus((data.status ?? (submit ? 'reviewed' : 'draft')) as IntakeStatus)
    setSuccessMessage(submit ? 'Intake is opgeslagen en beoordeeld.' : 'Concept is opgeslagen.')
    setSaving(false)
    return true
  }

  async function handleSubmitFinal() {
    if (requiredErrors.length > 0) {
      setError(requiredErrors[0])
      return
    }

    const ok = await saveIntake(true)
    if (!ok) return

    router.push(`/admin/clients/${id}?tab=training`)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="glass-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Intake invullen als admin</h1>
          <p className="text-white/50 text-sm mt-1">Klant: {clientName} · Status: {status}</p>
        </div>
        <button
          onClick={() => router.push(`/admin/clients/${id}?tab=training`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4" /> Terug naar klant
        </button>
      </div>

      {error ? <div className="glass-card border border-red-500/40 p-4 text-red-300 text-sm">{error}</div> : null}
      {successMessage ? <div className="glass-card border border-green-500/40 p-4 text-green-300 text-sm">{successMessage}</div> : null}

      {step === 1 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-brand-gold" />
            <h2 className="text-xl font-bold text-white">Training Intake</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Gewenste trainingsduur</label>
              <select className={INPUT_CLASS} value={training.training_duration} onChange={(e) => setTraining((prev) => ({ ...prev, training_duration: e.target.value as '2u' | '3u' | '' }))}>
                <option value="">Kies duur</option>
                <option value="2u">2 uur</option>
                <option value="3u">3 uur</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Voorkeursdatum/tijd</label>
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
            <label className="block text-sm text-white/60 mb-1.5">Focusgebied</label>
            <input className={INPUT_CLASS} value={training.focus_area} onChange={(e) => setTraining((prev) => ({ ...prev, focus_area: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Privacy/security randvoorwaarden</label>
            <textarea className={`${INPUT_CLASS} min-h-24`} value={training.privacy_constraints} onChange={(e) => setTraining((prev) => ({ ...prev, privacy_constraints: e.target.value }))} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <label className="block text-sm text-white/70">Communicatiekanaal</label>
            <select
              className={INPUT_CLASS}
              value={training.communication_channel}
              onChange={(e) => {
                const channel = e.target.value as CommunicationChannel
                setTraining((prev) => ({
                  ...prev,
                  communication_channel: channel,
                  communication_email: channel === 'email' ? prev.communication_email : '',
                  communication_whatsapp: channel === 'whatsapp' ? prev.communication_whatsapp : '',
                  portal_notifications_enabled: channel === 'portal',
                }))
              }}
            >
              <option value="">Geen voorkeur</option>
              <option value="portal">Portal</option>
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
            </select>

            {training.communication_channel === 'email' ? (
              <input
                type="email"
                className={INPUT_CLASS}
                value={training.communication_email}
                onChange={(e) => setTraining((prev) => ({ ...prev, communication_email: e.target.value }))}
                placeholder="E-mailadres voor communicatie"
              />
            ) : null}

            {training.communication_channel === 'whatsapp' ? (
              <input
                type="tel"
                className={INPUT_CLASS}
                value={training.communication_whatsapp}
                onChange={(e) => setTraining((prev) => ({ ...prev, communication_whatsapp: e.target.value }))}
                placeholder="WhatsApp-nummer"
              />
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => void saveIntake(false)} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold">Volgende: teamleden</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-brand-gold" />
              <h2 className="text-xl font-bold text-white">Teamlid intake</h2>
            </div>
            <button onClick={addMember} className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm">+ Teamlid</button>
          </div>

          {training.members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-white/60">
              Nog geen teamleden toegevoegd. Dit onderdeel is optioneel.
            </div>
          ) : null}

          <div className="space-y-4">
            {training.members.map((member, index) => (
              <div key={index} className="rounded-xl border border-white/10 p-4 space-y-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/70">Teamlid {index + 1}</p>
                  <button onClick={() => removeMember(index)} className="text-xs text-red-300">Verwijderen</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className={INPUT_CLASS} placeholder="Naam" value={member.full_name} onChange={(e) => updateMember(index, { full_name: e.target.value })} />
                  <input className={INPUT_CLASS} placeholder="Rol" value={member.role} onChange={(e) => updateMember(index, { role: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {member.top_tasks.map((task, taskIndex) => (
                    <input key={taskIndex} className={INPUT_CLASS} placeholder={`Top taak ${taskIndex + 1}`} value={task} onChange={(e) => {
                      const nextTasks = [...member.top_tasks]
                      nextTasks[taskIndex] = e.target.value
                      updateMember(index, { top_tasks: nextTasks })
                    }} />
                  ))}
                </div>
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="Grootste knelpunt" value={member.bottleneck} onChange={(e) => updateMember(index, { bottleneck: e.target.value })} />
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="KPI/doelresultaat" value={member.kpi_goal} onChange={(e) => updateMember(index, { kpi_goal: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select className={INPUT_CLASS} value={member.digital_skill ?? ''} onChange={(e) => updateMember(index, { digital_skill: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Digitale vaardigheid (1-5)</option>
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                  <input className={INPUT_CLASS} placeholder="AI-ervaring" value={member.ai_experience} onChange={(e) => updateMember(index, { ai_experience: e.target.value })} />
                </div>
                <textarea className={`${INPUT_CLASS} min-h-20`} placeholder="Datagrens" value={member.prompt_data_boundary} onChange={(e) => updateMember(index, { prompt_data_boundary: e.target.value })} />
                <input className={INPUT_CLASS} placeholder="Beschikbaarheid trainingsdag" value={member.training_day_availability} onChange={(e) => updateMember(index, { training_day_availability: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20">Vorige</button>
            <button onClick={() => void saveIntake(false)} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold">Naar samenvatting</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="glass-card p-6 sm:p-8 space-y-5">
          <h2 className="text-xl font-bold text-white">Controleer en verzend</h2>

          <div className="rounded-xl border border-white/10 p-4 bg-white/5 text-sm text-white/80 space-y-2">
            <p><strong className="text-white">Trainingsduur:</strong> {training.training_duration || '-'}</p>
            <p><strong className="text-white">Voorkeursmoment:</strong> {training.preferred_datetime || '-'}</p>
            <p><strong className="text-white">Contact:</strong> {training.contact_person || '-'} ({training.contact_email || '-'})</p>
            <p><strong className="text-white">Focus:</strong> {training.focus_area || '-'}</p>
            <p><strong className="text-white">Teamleden:</strong> {training.members.length}</p>
          </div>

          {requiredErrors.length > 0 ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
              <p className="font-semibold">Definitief indienen vereist:</p>
              <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                {requiredErrors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20">Vorige</button>
            <button onClick={() => void saveIntake(false)} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Opslaan als concept
            </button>
            <button onClick={() => void handleSubmitFinal()} disabled={saving} className="px-4 py-2.5 rounded-xl bg-brand-gold text-black font-semibold disabled:opacity-60">
              Definitief indienen als beoordeeld
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="glass-card p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Intake opgeslagen</h2>
          <p className="text-white/60">De intake is namens de klant ingevuld en staat op beoordeeld.</p>
          <button onClick={() => router.push(`/admin/clients/${id}?tab=training`)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-semibold">
            Naar klantdetail <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
