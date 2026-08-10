import { describe, expect, jest, test } from '@jest/globals'
import {
  linkIntakeClientUser,
  type IntakeClientUserAdapter,
  type IntakeClientUserPayload,
} from './clientUsersFlow'

function createAdapter(overrides: Partial<IntakeClientUserAdapter> = {}) {
  const upserted: IntakeClientUserPayload[] = []
  const adapter: IntakeClientUserAdapter = {
    createAuthUser: jest.fn(async () => ({
      data: { user: { id: 'new-auth-user-id', email: 'test+arno@testdomain.nl' } },
      error: null,
    })),
    listAuthUsers: jest.fn(async () => ({ data: { users: [] }, error: null })),
    upsertClientUser: async (payload: IntakeClientUserPayload) => {
      upserted.push(payload)
      return { error: null }
    },
    ...overrides,
  }

  return { adapter, upserted }
}

const input = {
  clientId: 'test-client-id',
  email: ' Test+Arno@TestDomain.nl ',
  name: 'TEST_Arno',
  role: 'owner' as const,
  temporaryPassword: 'TEST-password-123',
}

describe('linkIntakeClientUser', () => {
  test('maakt een ontbrekende client_users-koppeling met de nieuwe Auth-ID', async () => {
    const { adapter, upserted } = createAdapter()

    const result = await linkIntakeClientUser(adapter, input)

    expect(result).toEqual({ alreadyRegistered: false, error: null })
    expect(upserted).toEqual([expect.objectContaining({
      client_id: 'test-client-id',
      email: 'test+arno@testdomain.nl',
      user_id: 'new-auth-user-id',
      role: 'owner',
    })])
  })

  test('herstelt een bestaand client_users-record zonder user_id met de bestaande Auth-ID', async () => {
    const { adapter, upserted } = createAdapter({
      createAuthUser: jest.fn(async () => ({
        data: { user: null },
        error: { message: 'User with this email already been registered' },
      })),
      listAuthUsers: jest.fn(async () => ({
        data: {
          users: [{ id: 'existing-auth-user-id', email: 'TEST+ARNO@TESTDOMAIN.NL' }],
        },
        error: null,
      })),
    })

    const result = await linkIntakeClientUser(adapter, input)

    expect(result).toEqual({ alreadyRegistered: true, error: null })
    expect(upserted).toHaveLength(1)
    expect(upserted[0].user_id).toBe('existing-auth-user-id')
  })

  test('schrijft nooit client_users wanneer de bestaande Auth-ID niet gevonden wordt', async () => {
    const { adapter, upserted } = createAdapter({
      createAuthUser: jest.fn(async () => ({
        data: { user: null },
        error: { message: 'User with this email already been registered' },
      })),
    })

    const result = await linkIntakeClientUser(adapter, input)

    expect(result.error).toContain('Geen auth-gebruiker gevonden')
    expect(upserted).toHaveLength(0)
  })

  test('rapporteert een upsertfout zonder deze te verbergen', async () => {
    const { adapter } = createAdapter({
      upsertClientUser: jest.fn(async () => ({ error: { message: 'duplicate conflict' } })),
    })

    const result = await linkIntakeClientUser(adapter, input)

    expect(result.error).toBe(
      'Gebruikersrecord opslaan mislukt voor test+arno@testdomain.nl: duplicate conflict'
    )
  })
})