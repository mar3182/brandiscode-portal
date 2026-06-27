export type ProfileFieldErrors = Partial<Record<'email' | 'billing_email' | 'kvk_number' | 'btw_number' | 'iban', string>>

type ValidationInput = {
  email?: string | null
  billing_email?: string | null
  kvk_number?: string | null
  btw_number?: string | null
  iban?: string | null
}

type ValidationNormalized = {
  email: string | null
  billing_email: string | null
  kvk_number: string | null
  btw_number: string | null
  iban: string | null
}

type ValidationResult = {
  errors: ProfileFieldErrors
  normalized: ValidationNormalized
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: string | null | undefined) {
  if (!value) return null
  return value.trim().toLowerCase() || null
}

function normalizeKvk(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.replace(/\D/g, '')
  return cleaned || null
}

function normalizeBtw(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.toUpperCase().replace(/\s+/g, '').replace(/[.-]/g, '')
  return cleaned || null
}

function normalizeIban(value: string | null | undefined) {
  if (!value) return null
  const cleaned = value.toUpperCase().replace(/\s+/g, '')
  return cleaned || null
}

function isValidIban(iban: string) {
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`
  const numeric = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String(code - 55)
      return char
    })
    .join('')

  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }

  return remainder === 1
}

export function validateCompanyProfileFields(input: ValidationInput): ValidationResult {
  const normalized: ValidationNormalized = {
    email: normalizeEmail(input.email),
    billing_email: normalizeEmail(input.billing_email),
    kvk_number: normalizeKvk(input.kvk_number),
    btw_number: normalizeBtw(input.btw_number),
    iban: normalizeIban(input.iban),
  }

  const errors: ProfileFieldErrors = {}

  if (normalized.email && !EMAIL_REGEX.test(normalized.email)) {
    errors.email = 'E-mailadres is ongeldig'
  }

  if (normalized.billing_email && !EMAIL_REGEX.test(normalized.billing_email)) {
    errors.billing_email = 'Factuur e-mailadres is ongeldig'
  }

  if (normalized.kvk_number && !/^\d{8}$/.test(normalized.kvk_number)) {
    errors.kvk_number = 'KvK moet uit 8 cijfers bestaan'
  }

  if (normalized.btw_number && !/^(NL)?\d{9}B\d{2}$/.test(normalized.btw_number)) {
    errors.btw_number = 'BTW nummer moet het formaat NL123456789B01 hebben'
  }

  if (normalized.iban && !isValidIban(normalized.iban)) {
    errors.iban = 'IBAN is ongeldig'
  }

  return { errors, normalized }
}

export function formatKvkInput(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.slice(0, 8)
}

export function formatBtwInput(value: string) {
  const raw = value.toUpperCase().replace(/\s+/g, '').replace(/[.-]/g, '')
  let prefixed = raw
  if (prefixed.length > 0 && !prefixed.startsWith('NL')) {
    prefixed = `NL${prefixed}`
  }
  return prefixed.slice(0, 14)
}

export function formatIbanInput(value: string) {
  const raw = value.toUpperCase().replace(/\s+/g, '')
  const limited = raw.slice(0, 34)
  const parts = limited.match(/.{1,4}/g)
  return parts ? parts.join(' ') : ''
}
