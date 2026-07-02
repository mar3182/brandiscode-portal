export type OfferteStatus = 'concept' | 'verstuurd' | 'bekeken' | 'getekend' | 'afgewezen' | 'afgerond'
export type SprintStatus = 'gepland' | 'actief' | 'review' | 'afgerond' | 'afgewezen'
export type DeliverableStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type FactuurStatus = 'concept' | 'verstuurd' | 'betaald' | 'herinnering'
export type TrainingIntakeStatus = 'draft' | 'submitted' | 'reviewed' | 'planned'
export type TrainingSessionStatus = 'proposed' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'
export type CommunicationChannel = 'portal' | 'email' | 'whatsapp'

export interface Client {
  id: string
  email: string
  name: string
  company: string | null
  phone: string | null
  contact_person: string | null
  kvk_number: string | null
  btw_number: string | null
  iban: string | null
  billing_email: string | null
  billing_address_line1: string | null
  billing_address_line2: string | null
  billing_postal_code: string | null
  billing_city: string | null
  billing_country: string | null
  onboarding_completed_at: string | null
  created_at: string
}

export interface Offerte {
  id: string
  client_id: string
  title: string
  description: string | null
  total_amount: number
  status: OfferteStatus
  pdf_path: string | null
  signed_at: string | null
  signature_data: string | null
  created_at: string
  updated_at: string
}

export interface Sprint {
  id: string
  offerte_id: string
  number: number
  title: string
  description: string | null
  amount: number
  status: SprintStatus
  start_date: string | null
  end_date: string | null
  created_at: string
  client_approved: boolean | null
  client_approved_at: string | null
  client_feedback: string | null
}

export interface Deliverable {
  id: string
  sprint_id: string
  title: string
  description: string | null
  status: DeliverableStatus
  completed_at: string | null
  created_at: string
}

export interface Feedback {
  id: string
  client_id: string
  sprint_id: string | null
  message: string
  rating: number | null
  is_read: boolean
  created_at: string
}

export interface ClientUser {
  id: string
  client_id: string
  email: string
  name: string
  role: 'owner' | 'member'
  created_at: string
}

export interface SprintMessage {
  id: string
  sprint_id: string
  sender_email: string
  sender_role: 'admin' | 'client'
  message: string
  created_at: string
}

export interface OnboardingQuestion {
  id: string
  offerte_id: string
  question: string
  hint: string | null
  answer_type: 'text' | 'choice' | 'yesno'
  options: string[] | null
  sort_order: number
  is_required: boolean
  created_at: string
  answer?: string | null
}

export interface OnboardingAnswer {
  id: string
  question_id: string
  client_id: string
  answer: string
  answered_at: string
}

export interface Factuur {
  id: string
  client_id: string
  sprint_id: string | null
  factuur_nummer: string
  title: string
  description: string | null
  amount: number
  btw_percentage: number
  status: FactuurStatus
  issue_date: string
  due_date: string | null
  paid_at: string | null
  pdf_path: string | null
  created_at: string
  updated_at: string
  btw_amount: number
  total_amount: number
  sprint?: Sprint | null
}

export interface TrainingIntake {
  id: string
  client_id: string
  status: TrainingIntakeStatus
  training_duration: '2u' | '3u' | null
  preferred_datetime: string | null
  preferred_time_note: string | null
  contact_person: string | null
  contact_email: string | null
  focus_area: string
  privacy_constraints: string | null
  data_usage_consent: boolean
  communication_channel: CommunicationChannel | null
  communication_email: string | null
  communication_whatsapp: string | null
  communication_consent: boolean
  communication_notes: string | null
  portal_notifications_enabled: boolean
  trainer_notes: string | null
  submitted_at: string | null
  reviewed_at: string | null
  planned_at: string | null
  created_at: string
  updated_at: string
}

export interface TrainingIntakeMember {
  id: string
  intake_id: string
  client_id: string
  full_name: string | null
  role: string | null
  top_tasks: string[]
  bottleneck: string | null
  kpi_goal: string | null
  digital_skill: number | null
  ai_experience: string | null
  prompt_data_boundary: string | null
  training_day_availability: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TrainingSession {
  id: string
  intake_id: string
  client_id: string
  status: TrainingSessionStatus
  session_start: string | null
  session_end: string | null
  proposed_duration_hours: number | null
  location_or_link: string | null
  agenda: string | null
  admin_notes: string | null
  google_calendar_id: string | null
  google_event_id: string | null
  google_attendee_email: string | null
  created_at: string
  updated_at: string
}

export function computeFactuurBedragen(factuur: Pick<Factuur, 'amount' | 'btw_percentage'>) {
  const btw_amount = Math.round(factuur.amount * factuur.btw_percentage) / 100
  const total_amount = factuur.amount + btw_amount
  return { btw_amount, total_amount }
}

// Extended types with relations
export interface OfferteWithSprints extends Offerte {
  sprints: SprintWithDeliverables[]
}

export interface SprintWithDeliverables extends Sprint {
  deliverables: Deliverable[]
}
