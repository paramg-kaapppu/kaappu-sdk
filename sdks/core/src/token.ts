/**
 * Framework-agnostic JWT token utilities.
 * Works in any JavaScript environment (browser, Node.js, Deno, etc.)
 */

/** Decode JWT payload without verification (client-side claims inspection) */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(
      typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString()
    )
  } catch {
    return null
  }
}

/** Check if a JWT token is expired based on the exp claim */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return Date.now() >= payload.exp * 1000
}

/** Get milliseconds until a token expires (0 if already expired) */
export function getTokenExpiryMs(token: string): number {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return 0
  return Math.max(payload.exp * 1000 - Date.now(), 0)
}

/** Extract a KaappuUser from JWT claims */
export function extractUserFromToken(token: string): import('./types').KaappuUser | null {
  const payload = parseJwtPayload(token)
  if (!payload || !payload.sub) return null
  return {
    id: payload.sub as string,
    email: (payload.email as string) || '',
    accountId: (payload.tid as string) || 'default',
    sessionId: (payload.sid as string) || '',
    permissions: Array.isArray(payload.permissions) ? payload.permissions as string[] : [],
  }
}
