export type TrainingIntakeStatus = 'draft' | 'submitted' | 'reviewed' | 'planned'
export type TrainingSessionStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled'

export interface TrainingIntakeMemberInput {
  id?: string
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

export interface TrainingIntakeInput {
  training_duration: '2u' | '3u' | ''
  preferred_datetime: string
  preferred_time_note: string
  contact_person: string
  contact_email: string
  focus_area: string
  privacy_constraints: string
  data_usage_consent: boolean
  trainer_notes: string
  members: TrainingIntakeMemberInput[]
}

export interface TrainingCompleteness {
  intakeFieldsComplete: boolean
  membersComplete: boolean
  missingRequiredFields: string[]
  readyForTraining: boolean
}

export const DEFAULT_FOCUS_AREA = 'huizenbeschrijvingen-agent'

function hasText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeTopTasks(tasks: string[]) {
  return (tasks || [])
    .map((task) => task.trim())
    .filter((task) => task.length > 0)
    .slice(0, 3)
}

export function validateMember(member: TrainingIntakeMemberInput, index: number) {
  const errors: string[] = []

  if (!hasText(member.full_name)) errors.push(`Teamlid ${index + 1}: naam is verplicht.`)
  if (!hasText(member.role)) errors.push(`Teamlid ${index + 1}: rol is verplicht.`)
  if (normalizeTopTasks(member.top_tasks).length !== 3) errors.push(`Teamlid ${index + 1}: vul precies 3 top-taken in.`)
  if (!hasText(member.bottleneck)) errors.push(`Teamlid ${index + 1}: grootste knelpunt is verplicht.`)
  if (!hasText(member.kpi_goal)) errors.push(`Teamlid ${index + 1}: KPI/doelresultaat is verplicht.`)
  if (typeof member.digital_skill !== 'number' || member.digital_skill < 1 || member.digital_skill > 5) {
    errors.push(`Teamlid ${index + 1}: digitale vaardigheid moet tussen 1 en 5 liggen.`)
  }
  if (!hasText(member.ai_experience)) errors.push(`Teamlid ${index + 1}: AI-ervaring is verplicht.`)
  if (!hasText(member.prompt_data_boundary)) errors.push(`Teamlid ${index + 1}: datagrens is verplicht.`)
  if (!hasText(member.training_day_availability)) errors.push(`Teamlid ${index + 1}: beschikbaarheid op trainingsdag is verplicht.`)

  return errors
}

export function computeTrainingCompleteness(input: TrainingIntakeInput): TrainingCompleteness {
  const missingRequiredFields: string[] = []

  if (!hasText(input.training_duration)) missingRequiredFields.push('Gewenste trainingsduur')
  if (!hasText(input.preferred_datetime)) missingRequiredFields.push('Voorkeursdatum en tijd')
  if (!hasText(input.contact_person)) missingRequiredFields.push('Contactpersoon')
  if (!hasText(input.contact_email)) missingRequiredFields.push('Contact e-mailadres')
  if (!hasText(input.focus_area)) missingRequiredFields.push('Focusgebied')
  if (!hasText(input.privacy_constraints)) missingRequiredFields.push('Privacy/security randvoorwaarden')
  if (!input.data_usage_consent) missingRequiredFields.push('Akkoord datagebruik')

  const memberErrors = input.members.flatMap((member, index) => validateMember(member, index))
  const membersComplete = input.members.length > 0 && memberErrors.length === 0
  if (!membersComplete) missingRequiredFields.push('Teamlidinformatie is niet volledig')

  return {
    intakeFieldsComplete: missingRequiredFields.length === 0 || (missingRequiredFields.length === 1 && missingRequiredFields[0] === 'Teamlidinformatie is niet volledig'),
    membersComplete,
    missingRequiredFields,
    readyForTraining: missingRequiredFields.length === 0,
  }
}

export function validateTrainingIntake(input: TrainingIntakeInput) {
  const errors: string[] = []

  if (!['2u', '3u'].includes(input.training_duration)) errors.push('Kies een trainingsduur van 2u of 3u.')
  if (!hasText(input.preferred_datetime)) errors.push('Voorkeursdatum en tijd is verplicht.')
  if (!hasText(input.contact_person)) errors.push('Contactpersoon is verplicht.')
  if (!hasText(input.contact_email) || !input.contact_email.includes('@')) errors.push('Een geldig contact e-mailadres is verplicht.')
  if (!hasText(input.focus_area)) errors.push('Focusgebied is verplicht.')
  if (!hasText(input.privacy_constraints)) errors.push('Privacy/security randvoorwaarden zijn verplicht.')
  if (!input.data_usage_consent) errors.push('Akkoord op datagebruik is verplicht.')
  if (input.members.length === 0) errors.push('Voeg minimaal 1 teamlid toe.')

  input.members.forEach((member, index) => {
    errors.push(...validateMember(member, index))
  })

  return errors
}
