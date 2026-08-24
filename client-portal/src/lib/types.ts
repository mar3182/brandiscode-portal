/**
 * Core TypeScript types for the Brand is Code portal
 */

export interface Deliverable {
  id: string
  sprint_id: string
  title: string
  description: string
  status: 'concept' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface Sprint {
  id: string
  offerte_id: string
  sprint_number: number
  title: string
  duration_weeks: number
  description: string
  start_date?: string
  end_date?: string
  status: 'proposed' | 'approved' | 'in_progress' | 'completed'
  deliverables?: Deliverable[]
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  company: string
  email: string
  contact_person?: string
  kvk_number?: string
  btw_number?: string
  iban?: string
  billing_email?: string
  billing_address_line1?: string
  billing_address_line2?: string
  billing_postal_code?: string
  billing_city?: string
  billing_country?: string
  onboarding_completed_at?: string
  created_at: string
  updated_at: string
}

export interface Offerte {
  id: string
  client_id: string
  title: string
  description: string
  total_price: number
  currency: string
  status: 'concept' | 'verstuurd' | 'bekeken' | 'getekend' | 'afgewezen' | 'afgerond'
  pdf_path?: string
  adobe_sign_agreement_id?: string
  adobe_sign_status?: string
  signed_pdf_url?: string
  signed_by_email?: string
  signed_at?: string
  created_at: string
  updated_at: string
}

export interface OfferteWithSprints extends Offerte {
  clients?: Client
  sprints?: Sprint[]
}

export interface OnboardingQuestion {
  id: string
  offerte_id: string
  question: string
  question_type: 'text' | 'select' | 'checkbox' | 'textarea'
  options?: string[]
  required: boolean
  order: number
  created_at: string
}

export interface OnboardingAnswer {
  id: string
  offerte_id: string
  client_id: string
  question_id: string
  answer: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'client' | 'viewer'
  created_at: string
}

export interface ClientUser {
  id: string
  client_id: string
  user_id: string
  role: 'admin' | 'user'
  created_at: string
}
