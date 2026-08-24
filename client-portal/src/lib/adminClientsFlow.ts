import type { Client } from '@/lib/types'
import {
  type ProfileFieldErrors,
  validateCompanyProfileFields,
} from '@/lib/companyProfileValidation'

export interface ClientForm {
  id?: string
  owner_name: string
  name: string
  email: string
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
  sector_raw: string
  mark_completed: boolean
}

export const initialClientForm: ClientForm = {
  owner_name: '',
  name: '',
  email: '',
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
  sector_raw: '',
  mark_completed: false,
}

export interface EmailValidationErrors {
  email?: string
  billing_email?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRequiredEmail(value: string, label: string) {
  const trimmed = value.trim()
  if (!trimmed) return `${label} is verplicht.`
  if (!EMAIL_REGEX.test(trimmed)) return `Vul een geldig ${label.toLowerCase()} in.`
  return ''
}

export function validateCreateEmails(source: Pick<ClientForm, 'email' | 'billing_email'>) {
  const errors: EmailValidationErrors = {}
  const emailError = validateRequiredEmail(source.email, 'E-mailadres')
  const billingError = validateRequiredEmail(source.billing_email, 'Factuur e-mailadres')
  if (emailError) errors.email = emailError
  if (billingError) errors.billing_email = billingError
  return errors
}

export function validateEditEmails(source: Pick<ClientForm, 'email' | 'billing_email'>) {
  return validateCreateEmails(source)
}

export function toClientPayload(source: ClientForm) {
  return {
    id: source.id,
    owner_name: source.owner_name,
    name: source.name,
    email: source.email,
    company: source.company,
    phone: source.phone,
    contact_person: source.contact_person,
    kvk_number: source.kvk_number,
    btw_number: source.btw_number,
    iban: source.iban,
    billing_email: source.billing_email,
    billing_address_line1: source.billing_address_line1,
    billing_address_line2: source.billing_address_line2,
    billing_postal_code: source.billing_postal_code,
    billing_city: source.billing_city,
    billing_country: source.billing_country,
    sector_raw: source.sector_raw,
    mark_completed: source.mark_completed,
  }
}

export function toEditForm(client: Client): ClientForm {
  return {
    id: client.id,
    owner_name: client.name || '',
    name: client.name || '',
    email: client.email || '',
    company: client.company || '',
    phone: client.phone || '',
    billing_email: client.billing_email || client.email || '',
    contact_person: client.contact_person || '',
    kvk_number: client.kvk_number || '',
    btw_number: client.btw_number || '',
    iban: client.iban || '',
    billing_address_line1: client.billing_address_line1 || '',
    billing_address_line2: client.billing_address_line2 || '',
    billing_postal_code: client.billing_postal_code || '',
    billing_city: client.billing_city || '',
    billing_country: client.billing_country || 'Nederland',
    sector_raw: client.sector_raw || client.sector || '',
    mark_completed: Boolean(client.onboarding_completed_at),
  }
}

export function validateClientProfile(source: Pick<ClientForm, 'email' | 'billing_email' | 'kvk_number' | 'btw_number' | 'iban'>) {
  return validateCompanyProfileFields({
    email: source.email,
    billing_email: source.billing_email,
    kvk_number: source.kvk_number,
    btw_number: source.btw_number,
    iban: source.iban,
  })
}

export function getClientSectorLabel(sector: string | null) {
  if (sector === 'real_estate') return 'Makelaardij'
  if (sector === 'professional_services') return 'Zakelijke dienstverlening'
  return 'Algemeen'
}

export function getClientValidationErrors(source: ClientForm, fieldErrors: ProfileFieldErrors, emailErrors: EmailValidationErrors) {
  const errors: ProfileFieldErrors = { ...fieldErrors }
  const emailValidation = validateCreateEmails(source)
  if (Object.keys(emailValidation).length > 0) {
    errors.email = emailValidation.email
    errors.billing_email = emailValidation.billing_email
  }
  return errors
}
