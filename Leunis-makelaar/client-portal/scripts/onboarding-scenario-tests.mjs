import assert from 'node:assert/strict'
import {
  buildIntakeInvitationEmail,
  buildPortalReadyEmail,
  getTeamMemberEmailKind,
} from '../src/lib/onboardingEmails.mjs'

const intakeUrl = 'https://portal.brandiscode.com/intake/test-token'

const inviteNew = buildIntakeInvitationEmail({
  name: 'Arno Leunis',
  company: 'Leunis Makelaars',
  email: 'arno@leunismakelaars.nl',
  intakeUrl,
  isExistingUser: false,
  temporaryPassword: 'TempPass123!'
})

assert.equal(inviteNew.subject, 'Welkom bij het Brand is Code portal — Leunis Makelaars')
assert.ok(inviteNew.html.includes(intakeUrl), 'new invite should contain intake URL')
assert.ok(inviteNew.html.includes('TempPass123!'), 'new invite should contain temporary password')

const inviteExisting = buildIntakeInvitationEmail({
  name: 'Arno Leunis',
  company: 'Leunis Makelaars',
  email: 'arno@leunismakelaars.nl',
  intakeUrl,
  isExistingUser: true,
})

assert.equal(inviteExisting.subject, 'Je intake-link staat klaar — Leunis Makelaars')
assert.ok(inviteExisting.html.includes(intakeUrl), 'existing invite should contain intake URL')
assert.ok(inviteExisting.html.includes('/login/wachtwoord-vergeten'), 'existing invite should point to password reset')

const portalReady = buildPortalReadyEmail({
  name: 'Arno Leunis',
  company: 'Leunis Makelaars',
  email: 'arno@leunismakelaars.nl',
})

assert.equal(portalReady.subject, 'Je portal-account staat klaar — Leunis Makelaars')
assert.ok(portalReady.html.includes('/login/wachtwoord-vergeten'), 'portal ready email should include password reset')

assert.equal(getTeamMemberEmailKind(false), 'welcome')
assert.equal(getTeamMemberEmailKind(true), 'existing-user')

console.log('Onboarding scenario tests passed')