import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const tokenRoute = readFileSync(new URL('../src/app/api/admin/clients/[id]/intake-token/route.ts', import.meta.url), 'utf8')
const intakeRoute = readFileSync(new URL('../src/app/api/intake/[token]/route.ts', import.meta.url), 'utf8')
const adminPage = readFileSync(new URL('../src/app/admin/clients/page.tsx', import.meta.url), 'utf8')

assert.match(tokenRoute, /invitation_sent:/, 'token route should expose invitation_sent')
assert.match(tokenRoute, /buildIntakeInvitationEmail/, 'token route should build the intake invitation email')
assert.match(tokenRoute, /select\('id, company, name, email'\)/, 'token route should load the client email for invitations')

assert.match(intakeRoute, /select\('id, company, name, email'\)/, 'intake route should load the client email for the portal-ready mail')
assert.match(intakeRoute, /buildPortalReadyEmail/, 'intake route should send portal-ready mail after intake')
assert.match(intakeRoute, /getTeamMemberEmailKind/, 'intake route should keep team-member mail scenarios explicit')

assert.match(adminPage, /intakeInviteNotice/, 'admin page should surface intake invitation status')
assert.match(adminPage, /invitation_sent/, 'admin page should read invitation_sent from the API response')

console.log('Intake route contract tests passed')