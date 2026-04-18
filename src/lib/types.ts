export type OfferteStatus = 'concept' | 'verstuurd' | 'bekeken' | 'getekend' | 'afgewezen' | 'afgerond'
export type SprintStatus = 'gepland' | 'actief' | 'review' | 'afgerond' | 'afgewezen'
export type DeliverableStatus = 'todo' | 'in_progress' | 'review' | 'done'

export interface Client {
  id: string
  email: string
  name: string
  company: string | null
  phone: string | null
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

// Extended types with relations
export interface OfferteWithSprints extends Offerte {
  sprints: SprintWithDeliverables[]
}

export interface SprintWithDeliverables extends Sprint {
  deliverables: Deliverable[]
}
