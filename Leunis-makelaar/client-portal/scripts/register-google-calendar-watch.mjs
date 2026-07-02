import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import crypto from 'node:crypto'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

async function main() {
  const calendarId = requiredEnv('GOOGLE_CALENDAR_ID')
  const webhookUrl = requiredEnv('GOOGLE_CALENDAR_WEBHOOK_URL')
  const webhookSecret = requiredEnv('GOOGLE_CALENDAR_WEBHOOK_SECRET')
  const clientEmail = requiredEnv('GOOGLE_CALENDAR_CLIENT_EMAIL')
  const privateKey = requiredEnv('GOOGLE_CALENDAR_PRIVATE_KEY').replace(/\\n/g, '\n')
  const supabaseUrl = requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  await auth.authorize()

  const calendar = google.calendar({ version: 'v3', auth })
  const channelId = crypto.randomUUID()

  const watchResponse = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: webhookSecret,
    },
  })

  const expiration = watchResponse.data.expiration
    ? new Date(Number(watchResponse.data.expiration)).toISOString()
    : null

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { error } = await supabase
    .from('google_calendar_watch_state')
    .upsert({
      calendar_id: calendarId,
      channel_id: watchResponse.data.id ?? channelId,
      resource_id: watchResponse.data.resourceId ?? null,
      resource_uri: watchResponse.data.resourceUri ?? null,
      expiration,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'calendar_id' })

  if (error) {
    throw new Error(`Supabase watch-state opslaan mislukt: ${error.message}`)
  }

  console.log(JSON.stringify({
    ok: true,
    calendarId,
    channelId: watchResponse.data.id ?? channelId,
    resourceId: watchResponse.data.resourceId ?? null,
    expiration,
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
