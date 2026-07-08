'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  User,
  AlertCircle,
} from 'lucide-react'
import {
  formatKvkInput,
  formatBtwInput,
  formatIbanInput,
} from '@/lib/companyProfileValidation'
import type { IntakeSubmitBody, IntakeTeamMember, IntakeTeamMemberProfile, MicrosoftSubscription } from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const INPUT_CLASS =
  'w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-gold/50 transition-all'

type IntakeSector = 'generic' | 'real_estate' | 'professional_services'

const GENERIC_SOFTWARE_OPTIONS = [
  'Outlook',
  'Word',
  'Excel',
  'WhatsApp Business',
  'Google Workspace',
  'Andere',
]

const REAL_ESTATE_SOFTWARE_OPTIONS = [
  'Realworks',
  ...GENERIC_SOFTWARE_OPTIONS,
]

const PROFESSIONAL_SERVICES_SOFTWARE_OPTIONS = [
  'Microsoft Teams',
  'SharePoint',
  'Notion',
  ...GENERIC_SOFTWARE_OPTIONS,
]

const MICROSOFT_OPTIONS: { value: MicrosoftSubscription; label: string }[] = [
  { value: 'none', label: 'Geen' },
  { value: 'basic', label: 'Microsoft 365 Basic' },
  { value: 'business', label: 'Microsoft 365 Business' },
  { value: 'enterprise', label: 'Microsoft 365 Enterprise' },
]

const DIGITAL_SKILL_OPTIONS: { value: NonNullable<IntakeTeamMemberProfile['digital_skill']>; label: string }[] = [
  { value: 'basis', label: 'Basis (e-mail en internet)' },
  { value: 'gemiddeld', label: 'Gemiddeld (meerdere programma\'s)' },
  { value: 'gevorderd', label: 'Gevorderd (leer snel nieuwe software)' },
  { value: 'expert', label: 'Expert' },
]

const AI_EXPERIENCE_OPTIONS: { value: NonNullable<IntakeTeamMemberProfile['ai_experience']>; label: string }[] = [
  { value: 'nooit', label: 'Nooit gebruikt' },
  { value: 'geprobeerd', label: 'Wel eens geprobeerd' },
  { value: 'soms', label: 'Gebruik het soms' },
  { value: 'regelmatig', label: 'Gebruik het regelmatig' },
  { value: 'dagelijks', label: 'Gebruik het dagelijks' },
]

const AI_TOOLS_OPTIONS = ['ChatGPT', 'Microsoft Copilot', 'Google Gemini', 'Siri / Alexa', 'Geen', 'Anders']

const AI_ATTITUDE_OPTIONS: { value: NonNullable<IntakeTeamMemberProfile['ai_attitude']>; label: string }[] = [
  { value: 'enthousiast', label: 'Enthousiast 🚀' },
  { value: 'nieuwsgierig', label: 'Nieuwsgierig' },
  { value: 'neutraal', label: 'Neutraal' },
  { value: 'sceptisch', label: 'Sceptisch' },
  { value: 'bezorgd', label: 'Bezorgd' },
]

const GENERIC_DAILY_TASKS_OPTIONS = [
  'E-mails beantwoorden',
  'Klantcontact',
  'Documenten opstellen',
  'Data invoeren',
  'Afspraken plannen',
  'Rapporten maken',
  'Anders',
]

const REAL_ESTATE_DAILY_TASKS_OPTIONS = [
  ...GENERIC_DAILY_TASKS_OPTIONS,
  'Woningbeschrijvingen schrijven',
]

const PROFESSIONAL_SERVICES_DAILY_TASKS_OPTIONS = [
  ...GENERIC_DAILY_TASKS_OPTIONS,
  'Adviesvoorstellen maken',
  'Klantdossiers bijwerken',
]

const WEEKLY_REPETITIVE_OPTIONS: { value: NonNullable<IntakeTeamMemberProfile['weekly_repetitive_hours']>; label: string }[] = [
  { value: 'minder-dan-2', label: 'Minder dan 2 uur' },
  { value: '2-tot-5', label: '2 tot 5 uur' },
  { value: '5-tot-10', label: '5 tot 10 uur' },
  { value: 'meer-dan-10', label: 'Meer dan 10 uur' },
]

const TRAINING_PREFERENCE_OPTIONS: { value: NonNullable<IntakeTeamMemberProfile['training_preference']>; label: string }[] = [
  { value: 'zelf-uitproberen', label: 'Zelf uitproberen' },
  { value: 'stap-voor-stap', label: 'Stap-voor-stap begeleiding' },
  { value: 'video', label: 'Video tutorials' },
  { value: 'handleiding', label: 'Schriftelijke handleiding' },
]

const TRAINING_DAYS_OPTIONS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag']
const TRAINING_TIME_OPTIONS = ['Ochtend', 'Middag']

function resolveSector(raw?: string | null): IntakeSector {
  if (raw === 'real_estate') return 'real_estate'
  if (raw === 'professional_services') return 'professional_services'
  return 'generic'
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step1Form {
  contact_person: string
  kvk_number: string
  btw_number: string
  iban: string
  billing_email: string
  billing_address_line1: string
  billing_postal_code: string
  billing_city: string
  microsoft_subscription: MicrosoftSubscription
  software_inventory: string[]
  software_other: string
  ai_goals: string
}

interface TeamMemberForm {
  name: string
  email: string
  function_title: string
  role: 'owner' | 'member'
  profile: IntakeTeamMemberProfile
}

type MemberErrorKey = keyof TeamMemberForm | 'digital_skill' | 'ai_experience'

const emptyTeamMember = (): TeamMemberForm => ({
  name: '',
  email: '',
  function_title: '',
  role: 'member',
  profile: {},
})

const emptyStep1: Step1Form = {
  contact_person: '',
  kvk_number: '',
  btw_number: '',
  iban: '',
  billing_email: '',
  billing_address_line1: '',
  billing_postal_code: '',
  billing_city: '',
  microsoft_subscription: 'none',
  software_inventory: [],
  software_other: '',
  ai_goals: '',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IntakePage() {
  const params = useParams()
  const token = typeof params.token === 'string' ? params.token : ''

  // Page state
  const [pageState, setPageState] = useState<'loading' | 'error' | 'wizard' | 'success'>('loading')
  const [tokenError, setTokenError] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [sector, setSector] = useState<IntakeSector>('generic')

  // Wizard state
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitWarnings, setSubmitWarnings] = useState<string[]>([])
  const [teamCount, setTeamCount] = useState(0)

  // Forms
  const [form, setForm] = useState<Step1Form>(emptyStep1)
  const [step1Errors, setStep1Errors] = useState<Partial<Record<keyof Step1Form, string>>>({})
  const [teamMembers, setTeamMembers] = useState<IntakeTeamMember[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [memberForm, setMemberForm] = useState<TeamMemberForm>(emptyTeamMember())
  const [memberErrors, setMemberErrors] = useState<Partial<Record<MemberErrorKey, string>>>({})
  const [teamError, setTeamError] = useState('')

  const softwareOptions =
    sector === 'real_estate'
      ? REAL_ESTATE_SOFTWARE_OPTIONS
      : sector === 'professional_services'
        ? PROFESSIONAL_SERVICES_SOFTWARE_OPTIONS
        : GENERIC_SOFTWARE_OPTIONS
  const dailyTasksOptions =
    sector === 'real_estate'
      ? REAL_ESTATE_DAILY_TASKS_OPTIONS
      : sector === 'professional_services'
        ? PROFESSIONAL_SERVICES_DAILY_TASKS_OPTIONS
        : GENERIC_DAILY_TASKS_OPTIONS

  // ── Token validation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setTokenError('Ongeldige link. Controleer de link in je e-mail.')
      setPageState('error')
      return
    }

    const validate = async () => {
      try {
        const res = await fetch(`/api/intake/${token}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string }
          setTokenError(
            data.error === 'expired'
              ? 'Deze intake link is verlopen. Neem contact op met Brand is Code voor een nieuwe link.'
              : data.error === 'used'
              ? 'Deze intake is al eerder ingevuld. Neem contact op als je iets wilt wijzigen.'
              : 'Deze link is niet (meer) geldig. Neem contact op met Brand is Code.',
          )
          setPageState('error')
          return
        }
        const data = await res.json() as { client: { id: string; company: string; sector?: string | null }; valid: boolean }
        setCompanyName(data.client.company ?? '')
        setSector(resolveSector(data.client.sector))
        setPageState('wizard')
      } catch {
        setTokenError('Er is een fout opgetreden bij het laden van de pagina. Probeer het opnieuw.')
        setPageState('error')
      }
    }

    validate()
  }, [token])

  // ── Step 1 logic ──────────────────────────────────────────────────────────

  function handleFieldChange(field: keyof Step1Form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (step1Errors[field]) {
      setStep1Errors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function handleKvkChange(value: string) {
    handleFieldChange('kvk_number', formatKvkInput(value))
  }

  function handleBtwChange(value: string) {
    handleFieldChange('btw_number', formatBtwInput(value))
  }

  function handleIbanChange(value: string) {
    handleFieldChange('iban', formatIbanInput(value))
  }

  function toggleSoftware(option: string) {
    setForm((prev) => {
      const has = prev.software_inventory.includes(option)
      return {
        ...prev,
        software_inventory: has
          ? prev.software_inventory.filter((s) => s !== option)
          : [...prev.software_inventory, option],
      }
    })
  }

  function validateStep1(): boolean {
    const errors: Partial<Record<keyof Step1Form, string>> = {}

    if (!form.contact_person.trim()) {
      errors.contact_person = 'Contactpersoon is verplicht.'
    }

    if (form.billing_email && !EMAIL_REGEX.test(form.billing_email)) {
      errors.billing_email = 'Voer een geldig e-mailadres in.'
    }

    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }

  function handleNextStep() {
    if (validateStep1()) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ── Team member logic ────────────────────────────────────────────────────

  function validateMember(): boolean {
    const errors: Partial<Record<MemberErrorKey, string>> = {}

    if (!memberForm.name.trim()) errors.name = 'Naam is verplicht.'
    if (!memberForm.email.trim()) {
      errors.email = 'E-mailadres is verplicht.'
    } else if (!EMAIL_REGEX.test(memberForm.email)) {
      errors.email = 'Voer een geldig e-mailadres in.'
    }
    if (!memberForm.profile.digital_skill) {
      errors.digital_skill = 'Kies het niveau van computer/tech vaardigheid.'
    }
    if (!memberForm.profile.ai_experience) {
      errors.ai_experience = 'Kies de ervaring met AI.'
    }

    setMemberErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleAddMember() {
    if (!validateMember()) return

    const profile: IntakeTeamMemberProfile = {
      digital_skill: memberForm.profile.digital_skill,
      ai_experience: memberForm.profile.ai_experience,
      ...(memberForm.profile.ai_tools_known?.length ? { ai_tools_known: memberForm.profile.ai_tools_known } : {}),
      ...(memberForm.profile.ai_attitude ? { ai_attitude: memberForm.profile.ai_attitude } : {}),
      ...(memberForm.profile.daily_tasks?.length ? { daily_tasks: memberForm.profile.daily_tasks } : {}),
      ...(memberForm.profile.weekly_repetitive_hours ? { weekly_repetitive_hours: memberForm.profile.weekly_repetitive_hours } : {}),
      ...(memberForm.profile.automation_wish?.trim() ? { automation_wish: memberForm.profile.automation_wish.trim() } : {}),
      ...(memberForm.profile.training_preference ? { training_preference: memberForm.profile.training_preference } : {}),
      ...(memberForm.profile.training_availability_days?.length
        ? { training_availability_days: memberForm.profile.training_availability_days }
        : {}),
      ...(memberForm.profile.training_availability_time?.length
        ? { training_availability_time: memberForm.profile.training_availability_time }
        : {}),
    }

    const member: IntakeTeamMember = {
      name: memberForm.name.trim(),
      email: memberForm.email.trim().toLowerCase(),
      role: memberForm.role,
      ...(memberForm.function_title.trim() ? { function_title: memberForm.function_title.trim() } : {}),
      profile,
    }

    setTeamMembers((prev) => [...prev, member])
    setMemberForm(emptyTeamMember())
    setMemberErrors({})
    setAddingMember(false)
    setTeamError('')
  }

  function handleRemoveMember(index: number) {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index))
  }

  function handleMemberProfileChange(updates: Partial<IntakeTeamMemberProfile>) {
    setMemberForm((prev) => ({ ...prev, profile: { ...prev.profile, ...updates } }))
    if (updates.digital_skill && memberErrors.digital_skill) {
      setMemberErrors((prev) => ({ ...prev, digital_skill: undefined }))
    }
    if (updates.ai_experience && memberErrors.ai_experience) {
      setMemberErrors((prev) => ({ ...prev, ai_experience: undefined }))
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (teamMembers.length === 0) {
      setTeamError('Voeg minimaal één teamlid toe.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    setSubmitWarnings([])

    const software = [
      ...form.software_inventory.filter((s) => s !== 'Andere'),
      ...(form.software_inventory.includes('Andere') && form.software_other.trim()
        ? [form.software_other.trim()]
        : []),
    ]

    const body: IntakeSubmitBody = {
      ...(form.contact_person.trim() ? { contact_person: form.contact_person.trim() } : {}),
      ...(form.kvk_number.trim() ? { kvk_number: form.kvk_number.trim() } : {}),
      ...(form.btw_number.trim() ? { btw_number: form.btw_number.trim() } : {}),
      ...(form.iban.trim() ? { iban: form.iban.trim() } : {}),
      ...(form.billing_email.trim() ? { billing_email: form.billing_email.trim() } : {}),
      ...(form.billing_address_line1.trim() ? { billing_address_line1: form.billing_address_line1.trim() } : {}),
      ...(form.billing_postal_code.trim() ? { billing_postal_code: form.billing_postal_code.trim() } : {}),
      ...(form.billing_city.trim() ? { billing_city: form.billing_city.trim() } : {}),
      microsoft_subscription: form.microsoft_subscription,
      ...(software.length > 0 ? { software_inventory: software } : {}),
      ...(form.ai_goals.trim() ? { ai_goals: form.ai_goals.trim() } : {}),
      team_members: teamMembers,
    }

    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setSubmitError(data.error ?? 'Er is een fout opgetreden. Probeer het opnieuw.')
        return
      }

      const data = await res.json() as { success: boolean; team_count: number; warnings?: string[] }
      setTeamCount(data.team_count)
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setSubmitWarnings(data.warnings)
      }
      setPageState('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError('Er is een netwerkfout opgetreden. Controleer je verbinding en probeer opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
          <p className="text-white/50 text-sm">Link wordt gevalideerd…</p>
        </div>
      </PageShell>
    )
  }

  if (pageState === 'error') {
    return (
      <PageShell>
        <div className="glass-card p-8 max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Link niet geldig</h2>
          <p className="text-white/60 text-sm leading-relaxed">{tokenError}</p>
          <p className="text-white/40 text-xs mt-6">
            Vragen? Stuur een e-mail naar{' '}
            <a href="mailto:info@brandiscode.com" className="text-brand-gold hover:underline">
              info@brandiscode.com
            </a>
          </p>
        </div>
      </PageShell>
    )
  }

  if (pageState === 'success') {
    return (
      <PageShell>
        <div className="glass-card p-8 max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">Intake ontvangen!</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Bedankt voor het invullen van de intake voor <span className="text-brand-gold font-medium">{companyName}</span>.
          </p>
          {teamCount > 0 && (
            <p className="text-white/60 text-sm mt-3 leading-relaxed">
              Je {teamCount === 1 ? 'teamlid ontvangt' : `${teamCount} teamleden ontvangen`} een loginmail voor het portal.
            </p>
          )}
          {submitWarnings.length > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Let op</p>
              <ul className="text-amber-200/90 text-xs space-y-1">
                {submitWarnings.map((warning, idx) => (
                  <li key={`${warning}-${idx}`}>- {warning}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8 p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/20">
            <p className="text-brand-gold/90 text-xs">
              We nemen binnen 1 werkdag contact met je op om de onboarding te bespreken.
            </p>
          </div>
        </div>
      </PageShell>
    )
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  return (
    <PageShell companyName={companyName}>
      {/* Progress bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-3">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-all ${
                  s < step
                    ? 'bg-brand-gold text-brand-dark'
                    : s === step
                    ? 'bg-brand-gold/20 border-2 border-brand-gold text-brand-gold'
                    : 'bg-white/5 border border-white/10 text-white/40'
                }`}
              >
                {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span
                className={`text-sm hidden sm:block ${
                  s === step ? 'text-white font-medium' : 'text-white/40'
                }`}
              >
                {s === 1 ? 'Bedrijfsgegevens' : 'Teamleden'}
              </span>
              {s < 2 && <div className="flex-1 h-px bg-white/10 hidden sm:block" />}
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-brand-gold/70 rounded-full transition-all duration-500"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2">Stap {step} van 2</p>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto">
        {step === 1 ? (
          <Step1
            form={form}
            errors={step1Errors}
            softwareOptions={softwareOptions}
            onFieldChange={handleFieldChange}
            onKvkChange={handleKvkChange}
            onBtwChange={handleBtwChange}
            onIbanChange={handleIbanChange}
            onToggleSoftware={toggleSoftware}
            onNext={handleNextStep}
          />
        ) : (
          <Step2
            teamMembers={teamMembers}
            addingMember={addingMember}
            memberForm={memberForm}
            memberErrors={memberErrors}
            teamError={teamError}
            submitting={submitting}
            submitError={submitError}
            onSetAddingMember={setAddingMember}
            onMemberFormChange={(field, value) => {
              setMemberForm((prev) => ({ ...prev, [field]: value }))
              if (memberErrors[field as keyof typeof memberErrors]) setMemberErrors((prev) => ({ ...prev, [field]: undefined }))
            }}
            onMemberProfileChange={handleMemberProfileChange}
            dailyTasksOptions={dailyTasksOptions}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onBack={() => {
              setStep(1)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </PageShell>
  )
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

function PageShell({
  children,
  companyName,
}: {
  children: React.ReactNode
  companyName?: string
}) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background accents */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-[#E84393]/8 rounded-full blur-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-[#D4A843]/8 rounded-full blur-[140px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-small.png"
            alt="Brand is Code"
            width={80}
            height={80}
            priority
            className="mb-4 w-auto h-auto"
          />
          <p className="text-white/40 text-xs tracking-widest uppercase mb-1">Client Portal</p>
          {companyName && (
            <p className="text-brand-gold text-sm font-medium mt-1">{companyName}</p>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  form: Step1Form
  errors: Partial<Record<keyof Step1Form, string>>
  softwareOptions: string[]
  onFieldChange: (field: keyof Step1Form, value: string) => void
  onKvkChange: (value: string) => void
  onBtwChange: (value: string) => void
  onIbanChange: (value: string) => void
  onToggleSoftware: (option: string) => void
  onNext: () => void
}

function Step1({
  form,
  errors,
  softwareOptions,
  onFieldChange,
  onKvkChange,
  onBtwChange,
  onIbanChange,
  onToggleSoftware,
  onNext,
}: Step1Props) {
  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Bedrijfsgegevens</h2>
        <p className="text-white/50 text-sm mt-1">
          Vul je bedrijfsgegevens in. Alleen contactpersoon is verplicht.
        </p>
      </div>

      {/* Contact person */}
      <FormField label="Contactpersoon" required error={errors.contact_person}>
        <input
          type="text"
          className={`${INPUT_CLASS} ${errors.contact_person ? 'border-red-500/50' : ''}`}
          placeholder="Voor- en achternaam"
          value={form.contact_person}
          onChange={(e) => onFieldChange('contact_person', e.target.value)}
          autoComplete="name"
        />
      </FormField>

      {/* KvK / BTW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="KvK nummer" error={errors.kvk_number}>
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="12345678"
            value={form.kvk_number}
            onChange={(e) => onKvkChange(e.target.value)}
            autoComplete="off"
          />
        </FormField>
        <FormField label="BTW nummer" error={errors.btw_number}>
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="NL123456789B01"
            value={form.btw_number}
            onChange={(e) => onBtwChange(e.target.value)}
            autoComplete="off"
          />
        </FormField>
      </div>

      {/* IBAN */}
      <FormField label="IBAN" error={errors.iban}>
        <input
          type="text"
          className={INPUT_CLASS}
          placeholder="NL00 BANK 0000 0000 00"
          value={form.iban}
          onChange={(e) => onIbanChange(e.target.value)}
          autoComplete="off"
        />
      </FormField>

      {/* Billing email */}
      <FormField label="Factuur e-mailadres" error={errors.billing_email}>
        <input
          type="email"
          className={`${INPUT_CLASS} ${errors.billing_email ? 'border-red-500/50' : ''}`}
          placeholder="facturen@bedrijf.nl"
          value={form.billing_email}
          onChange={(e) => onFieldChange('billing_email', e.target.value)}
          autoComplete="email"
        />
      </FormField>

      {/* Address */}
      <FormField label="Adresregel 1">
        <input
          type="text"
          className={INPUT_CLASS}
          placeholder="Straatnaam en huisnummer"
          value={form.billing_address_line1}
          onChange={(e) => onFieldChange('billing_address_line1', e.target.value)}
          autoComplete="address-line1"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Postcode">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="1234 AB"
            value={form.billing_postal_code}
            onChange={(e) => onFieldChange('billing_postal_code', e.target.value)}
            autoComplete="postal-code"
          />
        </FormField>
        <FormField label="Plaats">
          <input
            type="text"
            className={INPUT_CLASS}
            placeholder="Amsterdam"
            value={form.billing_city}
            onChange={(e) => onFieldChange('billing_city', e.target.value)}
            autoComplete="address-level2"
          />
        </FormField>
      </div>

      {/* Microsoft subscription */}
      <FormField label="Microsoft-abonnement">
        <select
          className={`${INPUT_CLASS} cursor-pointer`}
          value={form.microsoft_subscription}
          onChange={(e) =>
            onFieldChange('microsoft_subscription', e.target.value as MicrosoftSubscription)
          }
        >
          {MICROSOFT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1B2A4A] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {/* Software inventory */}
      <div>
        <label className="block text-sm text-white/60 mb-3">
          Software die jullie gebruiken
        </label>
        <div className="flex flex-wrap gap-2">
          {softwareOptions.map((opt) => {
            const selected = form.software_inventory.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggleSoftware(opt)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selected
                    ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold'
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {form.software_inventory.includes('Andere') && (
          <input
            type="text"
            className={`${INPUT_CLASS} mt-3`}
            placeholder="Welke software? (bijv. Pricewise, Nedasco)"
            value={form.software_other}
            onChange={(e) => onFieldChange('software_other', e.target.value)}
          />
        )}
      </div>

      {/* AI goals */}
      <FormField label="Wat willen jullie bereiken met AI?">
        <textarea
          className={`${INPUT_CLASS} resize-none`}
          rows={4}
          placeholder="Bijv. tijdwinst bij offertes opstellen, automatisch beantwoorden van vragen, ..."
          value={form.ai_goals}
          onChange={(e) => onFieldChange('ai_goals', e.target.value)}
        />
      </FormField>

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:bg-brand-gold/90 transition-all"
        >
          Volgende
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  teamMembers: IntakeTeamMember[]
  addingMember: boolean
  memberForm: TeamMemberForm
  memberErrors: Partial<Record<MemberErrorKey, string>>
  teamError: string
  submitting: boolean
  submitError: string
  onSetAddingMember: (val: boolean) => void
  onMemberFormChange: (field: 'name' | 'email' | 'function_title' | 'role', value: string) => void
  onMemberProfileChange: (updates: Partial<IntakeTeamMemberProfile>) => void
  dailyTasksOptions: string[]
  onAddMember: () => void
  onRemoveMember: (index: number) => void
  onBack: () => void
  onSubmit: () => void
}

function Step2({
  teamMembers,
  addingMember,
  memberForm,
  memberErrors,
  teamError,
  submitting,
  submitError,
  onSetAddingMember,
  onMemberFormChange,
  onMemberProfileChange,
  dailyTasksOptions,
  onAddMember,
  onRemoveMember,
  onBack,
  onSubmit,
}: Step2Props) {
  return (
    <div className="space-y-4">
      <div className="glass-card p-6 md:p-8">
        <h2 className="text-xl font-semibold text-white mb-1">Teamleden</h2>
        <p className="text-white/50 text-sm mb-6">
          Voeg de teamleden toe die toegang krijgen tot het portal. Minimaal 1 vereist. Computer/tech vaardigheid en AI-ervaring zijn verplicht per teamlid.
        </p>
        <p className="text-white/35 text-xs mb-4">
          De keuzelijsten in deze intake worden afgestemd op de sector van jullie bedrijf.
        </p>

        {/* Member list */}
        {teamMembers.length > 0 && (
          <div className="space-y-3 mb-6">
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-9 h-9 rounded-full bg-brand-gold/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{member.name}</p>
                  <p className="text-white/50 text-xs truncate">{member.email}</p>
                  {member.function_title && (
                    <p className="text-white/40 text-xs truncate">{member.function_title}</p>
                  )}
                  {member.profile && (member.profile.digital_skill || member.profile.ai_experience || member.profile.ai_attitude) && (
                    <p className="text-white/30 text-xs mt-0.5 truncate">
                      {[
                        member.profile.digital_skill ? { basis: 'Basis', gemiddeld: 'Gemiddeld', gevorderd: 'Gevorderd', expert: 'Expert' }[member.profile.digital_skill] : null,
                        member.profile.ai_experience ? { nooit: 'Geen AI', geprobeerd: 'AI geprobeerd', soms: 'Soms AI', regelmatig: 'Regelmatig AI', dagelijks: 'Dagelijks AI' }[member.profile.ai_experience] : null,
                        member.profile.ai_attitude ? { enthousiast: 'Enthousiast 🚀', nieuwsgierig: 'Nieuwsgierig', neutraal: 'Neutraal', sceptisch: 'Sceptisch', bezorgd: 'Bezorgd' }[member.profile.ai_attitude] : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    member.role === 'owner'
                      ? 'bg-brand-gold/20 border-brand-gold/40 text-brand-gold'
                      : 'bg-white/5 border-white/20 text-white/60'
                  }`}
                >
                  {member.role === 'owner' ? 'Eigenaar' : 'Medewerker'}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveMember(idx)}
                  aria-label={`Verwijder ${member.name}`}
                  className="flex-shrink-0 p-1.5 text-white/30 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {teamMembers.length === 0 && !addingMember && (
          <div className="text-center py-8 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/40 text-sm">Nog geen teamleden toegevoegd.</p>
          </div>
        )}

        {/* Team error */}
        {teamError && (
          <p className="text-red-400 text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {teamError}
          </p>
        )}

        {/* Add member form */}
        {addingMember ? (
          <div className="p-4 rounded-xl bg-white/5 border border-brand-gold/20 space-y-4">
            <h3 className="text-white text-sm font-semibold">Nieuw teamlid</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Naam" required error={memberErrors.name}>
                <input
                  type="text"
                  className={`${INPUT_CLASS} ${memberErrors.name ? 'border-red-500/50' : ''}`}
                  placeholder="Voor- en achternaam"
                  value={memberForm.name}
                  onChange={(e) => onMemberFormChange('name', e.target.value)}
                  autoFocus
                />
              </FormField>
              <FormField label="E-mailadres" required error={memberErrors.email}>
                <input
                  type="email"
                  className={`${INPUT_CLASS} ${memberErrors.email ? 'border-red-500/50' : ''}`}
                  placeholder="naam@bedrijf.nl"
                  value={memberForm.email}
                  onChange={(e) => onMemberFormChange('email', e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Functietitel">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Makelaar / Administratie / ..."
                value={memberForm.function_title}
                onChange={(e) => onMemberFormChange('function_title', e.target.value)}
              />
            </FormField>

            {/* Role */}
            <div>
              <label className="block text-sm text-white/60 mb-3">Rol</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    { value: 'owner', label: 'Eigenaar', desc: 'Volledige toegang' },
                    { value: 'member', label: 'Medewerker', desc: 'Beperkte toegang' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      memberForm.role === opt.value
                        ? 'bg-brand-gold/10 border-brand-gold/40'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="member-role"
                      value={opt.value}
                      checked={memberForm.role === opt.value}
                      onChange={() => onMemberFormChange('role', opt.value)}
                      className="mt-0.5 accent-brand-gold"
                    />
                    <div>
                      <p className="text-white text-sm font-medium">{opt.label}</p>
                      <p className="text-white/40 text-xs">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Profile section */}
            <div className="border-t border-white/10 pt-4">
              <div className="space-y-5 mt-2">

                {/* Digitale vaardigheid */}
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Digitale vaardigheid</p>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Computer/tech vaardigheid
                    <span className="text-brand-gold ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DIGITAL_SKILL_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          memberForm.profile.digital_skill === opt.value
                            ? 'bg-brand-gold/10 border-brand-gold/40'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="member-digital-skill"
                          value={opt.value}
                          checked={memberForm.profile.digital_skill === opt.value}
                          onChange={() => onMemberProfileChange({ digital_skill: opt.value })}
                          className="accent-brand-gold flex-shrink-0"
                        />
                        <span className="text-white text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {memberErrors.digital_skill && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {memberErrors.digital_skill}
                    </p>
                  )}
                </div>

                {/* AI & Automatisering */}
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-4">AI &amp; Automatisering</p>
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Ervaring met AI tools
                    <span className="text-brand-gold ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AI_EXPERIENCE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          memberForm.profile.ai_experience === opt.value
                            ? 'bg-brand-gold/10 border-brand-gold/40'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="member-ai-experience"
                          value={opt.value}
                          checked={memberForm.profile.ai_experience === opt.value}
                          onChange={() => onMemberProfileChange({ ai_experience: opt.value })}
                          className="accent-brand-gold flex-shrink-0"
                        />
                        <span className="text-white text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  {memberErrors.ai_experience && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {memberErrors.ai_experience}
                    </p>
                  )}
                </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Welke AI tools ken/gebruik je?</label>
                    <div className="flex flex-wrap gap-2">
                      {AI_TOOLS_OPTIONS.map((tool) => {
                        const selected = (memberForm.profile.ai_tools_known ?? []).includes(tool)
                        return (
                          <button
                            key={tool}
                            type="button"
                            onClick={() => {
                              const current = memberForm.profile.ai_tools_known ?? []
                              onMemberProfileChange({ ai_tools_known: selected ? current.filter((t) => t !== tool) : [...current, tool] })
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selected ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {tool}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Houding tegenover AI</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AI_ATTITUDE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            memberForm.profile.ai_attitude === opt.value
                              ? 'bg-brand-gold/10 border-brand-gold/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="member-ai-attitude"
                            value={opt.value}
                            checked={memberForm.profile.ai_attitude === opt.value}
                            onChange={() => onMemberProfileChange({ ai_attitude: opt.value })}
                            className="accent-brand-gold flex-shrink-0"
                          />
                          <span className="text-white text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Werkpatronen */}
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-4">Werkpatronen</p>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Dagelijkse taken</label>
                    <div className="flex flex-wrap gap-2">
                      {dailyTasksOptions.map((task) => {
                        const selected = (memberForm.profile.daily_tasks ?? []).includes(task)
                        return (
                          <button
                            key={task}
                            type="button"
                            onClick={() => {
                              const current = memberForm.profile.daily_tasks ?? []
                              onMemberProfileChange({ daily_tasks: selected ? current.filter((t) => t !== task) : [...current, task] })
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selected ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {task}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Hoeveel uur per week ben je kwijt aan herhalend werk?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {WEEKLY_REPETITIVE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            memberForm.profile.weekly_repetitive_hours === opt.value
                              ? 'bg-brand-gold/10 border-brand-gold/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="member-weekly-hours"
                            value={opt.value}
                            checked={memberForm.profile.weekly_repetitive_hours === opt.value}
                            onChange={() => onMemberProfileChange({ weekly_repetitive_hours: opt.value })}
                            className="accent-brand-gold flex-shrink-0"
                          />
                          <span className="text-white text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <FormField label="Wat zou je het liefst nooit meer zelf doen?">
                    <textarea
                      className={`${INPUT_CLASS} resize-none`}
                      rows={3}
                      placeholder="bijv. altijd dezelfde e-mails typen..."
                      value={memberForm.profile.automation_wish ?? ''}
                      onChange={(e) => onMemberProfileChange({ automation_wish: e.target.value })}
                    />
                  </FormField>

                  {/* Training voorkeur */}
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-4">Training voorkeur</p>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Hoe leer jij het liefst?</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TRAINING_PREFERENCE_OPTIONS.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            memberForm.profile.training_preference === opt.value
                              ? 'bg-brand-gold/10 border-brand-gold/40'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <input
                            type="radio"
                            name="member-training-pref"
                            value={opt.value}
                            checked={memberForm.profile.training_preference === opt.value}
                            onChange={() => onMemberProfileChange({ training_preference: opt.value })}
                            className="accent-brand-gold flex-shrink-0"
                          />
                          <span className="text-white text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-2">Beschikbaarheid voor training</label>
                    <p className="text-xs text-white/40 mb-2">Dagen</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {TRAINING_DAYS_OPTIONS.map((day) => {
                        const selected = (memberForm.profile.training_availability_days ?? []).includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const current = memberForm.profile.training_availability_days ?? []
                              onMemberProfileChange({ training_availability_days: selected ? current.filter((d) => d !== day) : [...current, day] })
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selected ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-white/40 mb-2">Dagdeel</p>
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_TIME_OPTIONS.map((time) => {
                        const selected = (memberForm.profile.training_availability_time ?? []).includes(time)
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              const current = memberForm.profile.training_availability_time ?? []
                              onMemberProfileChange({ training_availability_time: selected ? current.filter((t) => t !== time) : [...current, time] })
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selected ? 'bg-brand-gold/20 border-brand-gold/60 text-brand-gold' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                            }`}
                          >
                            {time}
                          </button>
                        )
                      })}
                    </div>
                  </div>

              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  onSetAddingMember(false)
                }}
                className="flex-1 px-4 py-2 text-sm text-white/60 border border-white/10 rounded-xl hover:border-white/30 transition-all"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={onAddMember}
                className="flex-1 px-4 py-2 text-sm font-semibold bg-brand-gold/20 border border-brand-gold/40 text-brand-gold rounded-xl hover:bg-brand-gold/30 transition-all"
              >
                Toevoegen
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSetAddingMember(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:border-brand-gold/40 hover:text-brand-gold transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Teamlid toevoegen
          </button>
        )}
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{submitError}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-6 py-3 border border-white/10 text-white/70 font-medium rounded-xl hover:border-white/30 transition-all disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:bg-brand-gold/90 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verzenden…
            </>
          ) : (
            <>
              Intake verzenden
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-2">
        {label}
        {required && <span className="text-brand-gold ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
