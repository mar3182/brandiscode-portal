import { createAdminClient } from '@/lib/supabase/admin'
import { sendRecurringInvoiceEmail } from '@/lib/email'

type ClientRow = {
  id: string
  name: string | null
  company: string | null
  email: string | null
  billing_email: string | null
  contact_person: string | null
}

type PlanRow = {
  id: string
  client_id: string
  enabled: boolean
  title: string | null
  description: string | null
  amount: number | string | null
  btw_percentage: number | string | null
  due_days: number | null
  send_to: string | null
  last_generated_month: string | null
}

export interface RecurringRunOptions {
  now?: Date
  force?: boolean
  clientId?: string
}

export interface RecurringRunResult {
  ok: boolean
  skippedReason?: string
  processed: number
  created: number
  emailed: number
  failed: number
  details: Array<{
    client_id: string
    status: 'created' | 'skipped' | 'failed'
    reason?: string
    factuur_nummer?: string
  }>
}

function asNumber(value: number | string | null, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function isLastDayOfMonth(date: Date): boolean {
  const probe = new Date(date)
  probe.setDate(probe.getDate() + 1)
  return probe.getDate() === 1
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function invoiceNumberForMonth(clientId: string, date: Date): string {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  return `SUB-${yyyymm}-${clientId.slice(0, 6).toUpperCase()}`
}

export async function runRecurringInvoiceGeneration(options: RecurringRunOptions = {}): Promise<RecurringRunResult> {
  const now = options.now ?? new Date()
  const force = options.force === true

  if (!force && !isLastDayOfMonth(now)) {
    return {
      ok: true,
      skippedReason: 'Vandaag is geen laatste dag van de maand.',
      processed: 0,
      created: 0,
      emailed: 0,
      failed: 0,
      details: [],
    }
  }

  const admin = createAdminClient()

  let plansQuery = admin
    .from('recurring_invoice_plans')
    .select('id, client_id, enabled, title, description, amount, btw_percentage, due_days, send_to, last_generated_month')
    .eq('enabled', true)

  if (options.clientId) {
    plansQuery = plansQuery.eq('client_id', options.clientId)
  }

  const { data: plans, error: plansError } = await plansQuery
  if (plansError) {
    return {
      ok: false,
      processed: 0,
      created: 0,
      emailed: 0,
      failed: 1,
      details: [{ client_id: options.clientId ?? 'unknown', status: 'failed', reason: plansError.message }],
    }
  }

  const items = (plans ?? []) as PlanRow[]
  const mk = monthKey(now)

  let processed = 0
  let created = 0
  let emailed = 0
  let failed = 0
  const details: RecurringRunResult['details'] = []

  for (const plan of items) {
    processed += 1

    if (plan.last_generated_month === mk) {
      details.push({ client_id: plan.client_id, status: 'skipped', reason: 'Deze maand al verwerkt.' })
      continue
    }

    const amount = asNumber(plan.amount, NaN)
    const btw = asNumber(plan.btw_percentage, 21)
    const dueDays = Number.isFinite(plan.due_days ?? NaN) ? Math.max(0, Number(plan.due_days)) : 14

    if (!Number.isFinite(amount) || amount <= 0 || !plan.title?.trim()) {
      failed += 1
      details.push({ client_id: plan.client_id, status: 'failed', reason: 'Abonnement onvolledig: titel/bedrag ontbreekt.' })
      continue
    }

    const { data: client } = await admin
      .from('clients')
      .select('id, name, company, email, billing_email, contact_person')
      .eq('id', plan.client_id)
      .maybeSingle()

    const c = client as ClientRow | null
    if (!c) {
      failed += 1
      details.push({ client_id: plan.client_id, status: 'failed', reason: 'Klant niet gevonden.' })
      continue
    }

    const factuurNummer = invoiceNumberForMonth(plan.client_id, now)

    const { data: existing } = await admin
      .from('facturen')
      .select('id')
      .eq('factuur_nummer', factuurNummer)
      .maybeSingle()

    if (existing?.id) {
      await admin
        .from('recurring_invoice_plans')
        .update({
          last_generated_month: mk,
          last_generated_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', plan.id)

      details.push({
        client_id: plan.client_id,
        status: 'skipped',
        reason: 'Factuur voor deze maand bestond al.',
        factuur_nummer: factuurNummer,
      })
      continue
    }

    const issueDate = ymd(now)
    const dueDate = ymd(addDays(now, dueDays))

    const { data: createdRow, error: createError } = await admin
      .from('facturen')
      .insert({
        client_id: plan.client_id,
        factuur_nummer: factuurNummer,
        title: plan.title.trim(),
        description: plan.description?.trim() || null,
        amount,
        btw_percentage: btw,
        issue_date: issueDate,
        due_date: dueDate,
        status: 'concept',
      })
      .select('id, factuur_nummer, amount, btw_percentage')
      .single()

    if (createError || !createdRow) {
      failed += 1
      details.push({ client_id: plan.client_id, status: 'failed', reason: createError?.message || 'Factuur aanmaken mislukt.' })
      continue
    }

    created += 1

    const sendTo = plan.send_to || c.billing_email || c.email
    const totalAmount = Number(createdRow.amount) + (Number(createdRow.amount) * Number(createdRow.btw_percentage)) / 100

    if (sendTo) {
      try {
        await sendRecurringInvoiceEmail({
          to: sendTo,
          contactName: c.contact_person || c.name || 'klant',
          companyName: c.company || c.name || 'uw bedrijf',
          factuurNummer,
          title: plan.title.trim(),
          issueDate,
          dueDate,
          totalAmount,
        })

        emailed += 1

        await admin
          .from('facturen')
          .update({ status: 'verstuurd', updated_at: now.toISOString() })
          .eq('id', createdRow.id)
      } catch (mailError) {
        failed += 1
        details.push({
          client_id: plan.client_id,
          status: 'failed',
          factuur_nummer: factuurNummer,
          reason: mailError instanceof Error ? mailError.message : 'E-mail versturen mislukt.',
        })
      }
    }

    await admin
      .from('recurring_invoice_plans')
      .update({
        last_generated_month: mk,
        last_generated_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', plan.id)

    details.push({ client_id: plan.client_id, status: 'created', factuur_nummer: factuurNummer })
  }

  return {
    ok: failed === 0,
    processed,
    created,
    emailed,
    failed,
    details,
  }
}
