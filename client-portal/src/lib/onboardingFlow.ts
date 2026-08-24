import {
  DEFAULT_FOCUS_AREA,
  type TrainingIntakeInput,
  type TrainingIntakeMemberInput,
} from '@/lib/trainingIntake'

export interface BillingForm {
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

export interface OnboardingLoadResult {
  billing: BillingForm
  training: TrainingIntakeInput
  trainingEnabled: boolean
  status: 'draft' | 'submitted' | 'reviewed' | 'planned'
  error?: string
}

export interface SaveBillingResult {
  ok: boolean
  errors?: Record<string, string>
  error?: string
}

export interface SaveTrainingDraftResult {
  ok: boolean
  status?: 'draft' | 'submitted' | 'reviewed' | 'planned'
  error?: string
  validationErrors?: string[]
}

export const emptyBilling: BillingForm = {
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

export function createEmptyMember(index: number): TrainingIntakeMemberInput {
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

export async function loadOnboardingData(): Promise<OnboardingLoadResult> {
  const [billingRes, intakeRes] = await Promise.all([
    fetch('/api/onboarding/wizard'),
    fetch('/api/training-intake'),
  ])

  if (billingRes.status === 401 || intakeRes.status === 401) {
    return {
      billing: emptyBilling,
      training: createTrainingState(),
      trainingEnabled: false,
      status: 'draft',
      error: 'Je account is nog niet gekoppeld aan een bedrijf. Neem contact op met Brand is Code.',
    }
  }

  let billing = emptyBilling
  let profileContactPerson = ''
  let profileContactEmail = ''

  if (billingRes.ok) {
    const billingData = await billingRes.json()
    if (billingData.client) {
      profileContactPerson = billingData.client.contact_person ?? ''
      profileContactEmail = billingData.client.billing_email ?? billingData.client.email ?? ''

      billing = {
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
      }
    }
  }

  let training = createTrainingState()
  let trainingEnabled = false
  let status: OnboardingLoadResult['status'] = 'draft'

  if (intakeRes.ok) {
    const intakeData = await intakeRes.json()
    trainingEnabled = intakeData?.enabled === true

    if (!trainingEnabled) {
      return { billing, training, trainingEnabled, status }
    }

    if (intakeData.intake) {
      const intakeContactPerson = intakeData.intake.contact_person ?? ''
      const intakeContactEmail = intakeData.intake.contact_email ?? ''

      training = {
        training_duration: intakeData.intake.training_duration ?? '',
        preferred_datetime: intakeData.intake.preferred_datetime ?? '',
        preferred_time_note: intakeData.intake.preferred_time_note ?? '',
        contact_person: intakeContactPerson || profileContactPerson,
        contact_email: intakeContactEmail || profileContactEmail,
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
          ? intakeData.members.map((member: Record<string, unknown>, index: number) => {
            const topTasks = Array.isArray(member.top_tasks) ? member.top_tasks : []
            const topTasksArray = topTasks.length === 3
              ? topTasks.map((task) => String(task))
              : [String((member.top_tasks as unknown[] | undefined)?.[0] ?? ''), String((member.top_tasks as unknown[] | undefined)?.[1] ?? ''), String((member.top_tasks as unknown[] | undefined)?.[2] ?? '')]

            return {
              id: typeof member.id === 'string' ? member.id : undefined,
              full_name: typeof member.full_name === 'string' ? member.full_name : '',
              role: typeof member.role === 'string' ? member.role : '',
              top_tasks: topTasksArray,
              bottleneck: typeof member.bottleneck === 'string' ? member.bottleneck : '',
              kpi_goal: typeof member.kpi_goal === 'string' ? member.kpi_goal : '',
              digital_skill: typeof member.digital_skill === 'number' ? member.digital_skill : null,
              ai_experience: typeof member.ai_experience === 'string' ? member.ai_experience : '',
              prompt_data_boundary: typeof member.prompt_data_boundary === 'string' ? member.prompt_data_boundary : '',
              training_day_availability: typeof member.training_day_availability === 'string' ? member.training_day_availability : '',
              sort_order: typeof member.sort_order === 'number' ? member.sort_order : index,
            }
          })
          : [createEmptyMember(0)],
      }
      status = (intakeData.intake.status as OnboardingLoadResult['status']) ?? 'draft'
    } else {
      training = {
        ...training,
        contact_person: training.contact_person || profileContactPerson,
        contact_email: training.contact_email || profileContactEmail,
      }
    }
  }

  return { billing, training, trainingEnabled, status }
}

export async function saveBilling(payload: BillingForm): Promise<SaveBillingResult> {
  const res = await fetch('/api/onboarding/wizard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'billing', ...payload }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      errors: typeof data.errors === 'object' && data.errors ? data.errors : undefined,
      error: data.error ?? 'Bedrijfsgegevens opslaan is mislukt.',
    }
  }

  return { ok: true }
}

export async function saveTrainingDraft(input: TrainingIntakeInput, submit: boolean): Promise<SaveTrainingDraftResult> {
  const res = await fetch('/api/training-intake', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, submit }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? 'Opslaan mislukt.',
      validationErrors: Array.isArray(data.validationErrors) ? data.validationErrors : undefined,
    }
  }

  return {
    ok: true,
    status: data.status,
  }
}

export async function completeOnboardingStep(): Promise<void> {
  await fetch('/api/onboarding/wizard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'complete' }),
  })
}

function createTrainingState(): TrainingIntakeInput {
  return {
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
  }
}
