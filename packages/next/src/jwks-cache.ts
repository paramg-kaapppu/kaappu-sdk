import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { KaappuAuthContext } from './types'

// Per-process JWKS cache: URL → RemoteJWKSet + last fetch time
const jwksCache = new Map<string, { jwks: ReturnType<typeof createRemoteJWKSet>; cachedAt: number }>()
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function getJwks(baseUrl: string): ReturnType<typeof createRemoteJWKSet> {
  const url = `${baseUrl}/api/v1/idm/auth/jwks`
  const cached = jwksCache.get(url)
  const now = Date.now()

  if (cached && now - cached.cachedAt < JWKS_CACHE_TTL_MS) {
    return cached.jwks
  }

  const jwks = createRemoteJWKSet(new URL(url))
  jwksCache.set(url, { jwks, cachedAt: now })
  return jwks
}

export async function verifyToken(token: string, baseUrl: string): Promise<KaappuAuthContext | null> {
  try {
    const jwks = getJwks(baseUrl)
    const { payload } = await jwtVerify(token, jwks, { algorithms: ['RS256'] })

    if (typeof payload.sub !== 'string') return null

    return {
      userId: payload.sub,
      accountId: (payload['tid'] as string) ?? '',
      email: (payload['email'] as string) ?? '',
      sessionId: (payload['sid'] as string) ?? '',
      permissions: Array.isArray(payload['permissions']) ? payload['permissions'] as string[] : [],
    }
  } catch {
    return null
  }
}
