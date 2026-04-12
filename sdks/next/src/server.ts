import { headers } from 'next/headers'
import type { AuthorizeResult, KaappuAuthContext } from './types'
import { KaappuAuthError } from './types'
import {
  HEADER_USER_ID, HEADER_ACCOUNT_ID, HEADER_EMAIL, HEADER_SESSION_ID, HEADER_PERMISSIONS
} from './pipeline'

/**
 * authorize() — Read the auth context injected by kaappuPipeline() in Server Components or API routes.
 *
 * Usage in a Server Component:
 * ```ts
 * import { authorize } from '@kaappu/next/server'
 * export default async function Page() {
 *   const { auth } = authorize()
 *   // auth is null if user is not signed in
 * }
 * ```
 *
 * Usage with required():
 * ```ts
 * const ctx = authorize().required()
 * // throws KaappuAuthError (401) if not signed in
 * console.log(ctx.userId)
 * ```
 */
export function authorize(): AuthorizeResult {
  const headersList = headers()
  const userId = headersList.get(HEADER_USER_ID)

  const permissionsRaw = headersList.get(HEADER_PERMISSIONS) ?? ''
  const permissions = permissionsRaw ? permissionsRaw.split(',') : []

  const auth: KaappuAuthContext | null = userId
    ? {
        userId,
        accountId: headersList.get(HEADER_ACCOUNT_ID) ?? '',
        email: headersList.get(HEADER_EMAIL) ?? '',
        sessionId: headersList.get(HEADER_SESSION_ID) ?? '',
        permissions,
      }
    : null

  return {
    auth,
    required: () => {
      if (!auth) {
        throw new KaappuAuthError(
          'Authentication required. Wrap this route with kaappuPipeline().',
          'unauthorized',
          401
        )
      }
      return auth
    },
  }
}

/**
 * currentAuthorizedUser() — Fetch the full user object for the signed-in user.
 * Reads auth context from headers (injected by pipeline), then calls igai-connector.
 *
 * Usage in a Server Component:
 * ```ts
 * import { currentAuthorizedUser } from '@kaappu/next/server'
 * export default async function Page() {
 *   const user = await currentAuthorizedUser()
 *   if (!user) return <div>Not signed in</div>
 * }
 * ```
 */
export async function currentAuthorizedUser(
  baseUrl = process.env.KAAPPU_BASE_URL ?? 'http://localhost:9091'
): Promise<Record<string, unknown> | null> {
  const { auth } = authorize()
  if (!auth) return null

  const headersList = headers()
  const token = headersList.get('authorization')?.slice(7) ?? ''

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/idm/users/${auth.userId}?accountId=${auth.accountId}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        // React cache — deduplicated per request in Server Components
        next: { revalidate: 0 },
      } as RequestInit
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.data ?? null
  } catch {
    return null
  }
}
