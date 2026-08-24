export interface IntakeClientUserPayload {
  client_id: string
  email: string
  name: string
  role: 'owner' | 'member'
  function_title: string | null
  intake_profile: Record<string, unknown>
  user_id: string
}

interface AuthUser {
  id: string
  email?: string
}

interface OperationError {
  message: string
}

export interface IntakeClientUserAdapter {
  createAuthUser(input: {
    email: string
    password: string
    email_confirm: true
  }): Promise<{
    data: { user: AuthUser | null } | null
    error: OperationError | null
  }>
  listAuthUsers(options: { page: number; perPage: number }): Promise<{
    data: { users: AuthUser[] }
    error: OperationError | null
  }>
  upsertClientUser(payload: IntakeClientUserPayload): Promise<{
    error: OperationError | null
  }>
}

export interface LinkIntakeClientUserInput {
  clientId: string
  email: string
  name: string
  role: 'owner' | 'member'
  functionTitle?: string
  intakeProfile?: Record<string, unknown>
  temporaryPassword: string
}

export interface LinkIntakeClientUserResult {
  alreadyRegistered: boolean
  error: string | null
}

async function findAuthUserIdByEmail(
  adapter: IntakeClientUserAdapter,
  email: string
): Promise<{ userId: string | null; error: string | null }> {
  const perPage = 1000

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adapter.listAuthUsers({ page, perPage })
    if (error) return { userId: null, error: error.message }

    const authUser = data.users.find((user) => user.email?.trim().toLowerCase() === email)
    if (authUser) return { userId: authUser.id, error: null }
    if (data.users.length < perPage) break
  }

  return { userId: null, error: null }
}

export async function linkIntakeClientUser(
  adapter: IntakeClientUserAdapter,
  input: LinkIntakeClientUserInput
): Promise<LinkIntakeClientUserResult> {
  const email = input.email.trim().toLowerCase()
  const { data: authData, error: authError } = await adapter.createAuthUser({
    email,
    password: input.temporaryPassword,
    email_confirm: true,
  })
  const alreadyRegistered = Boolean(authError?.message.includes('already been registered'))

  if (authError && !alreadyRegistered) {
    return { alreadyRegistered, error: `Auth aanmaken mislukt voor ${email}: ${authError.message}` }
  }

  let authUserId = authData?.user?.id ?? null
  if (alreadyRegistered) {
    const existingAuthUser = await findAuthUserIdByEmail(adapter, email)
    if (existingAuthUser.error) {
      return {
        alreadyRegistered,
        error: `Bestaande auth-gebruiker opzoeken mislukt voor ${email}: ${existingAuthUser.error}`,
      }
    }
    authUserId = existingAuthUser.userId
  }

  if (!authUserId) {
    return {
      alreadyRegistered,
      error: `Geen auth-gebruiker gevonden voor ${email}; gebruikersrecord is niet opgeslagen`,
    }
  }

  const { error: upsertError } = await adapter.upsertClientUser({
    client_id: input.clientId,
    email,
    name: input.name.trim(),
    role: input.role,
    function_title: input.functionTitle?.trim() || null,
    intake_profile: input.intakeProfile ?? {},
    user_id: authUserId,
  })

  return {
    alreadyRegistered,
    error: upsertError
      ? `Gebruikersrecord opslaan mislukt voor ${email}: ${upsertError.message}`
      : null,
  }
}