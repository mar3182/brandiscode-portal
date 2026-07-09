import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const previewUrl = process.env.PREVIEW_URL?.replace(/\/$/, '') ?? ''

if (previewUrl) {
	const expectStatus = async (path, expected, label) => {
		const response = await fetch(`${previewUrl}${path}`, { redirect: 'manual' })
		assert.equal(response.status, expected, `${label} should return ${expected}, got ${response.status}`)
	}

	await expectStatus('/login', 200, 'login page')
	await expectStatus('/api/health', 200, 'health endpoint')
	await expectStatus('/api/admin/clients', 401, 'admin clients endpoint without auth')
	await expectStatus('/api/intake/not-a-real-token', 404, 'invalid intake token endpoint')
	await expectStatus('/api/admin/clients/not-a-real-id/intake-token', 401, 'admin intake-token endpoint without auth')

	console.log(`Preview smoke tests passed against ${previewUrl}`)
} else {
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
}