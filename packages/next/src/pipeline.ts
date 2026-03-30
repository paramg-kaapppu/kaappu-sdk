import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwks-cache'
import type { KaappuPipelineConfig } from './types'

// Header names injected for downstream use
export const HEADER_USER_ID = 'x-kaappu-user-id'
export const HEADER_ACCOUNT_ID = 'x-kaappu-account-id'
export const HEADER_EMAIL = 'x-kaappu-email'
export const HEADER_SESSION_ID = 'x-kaappu-session-id'

function matchesPublicRoute(pathname: string, publicRoutes: string[]): boolean {
  return publicRoutes.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1))
    }
    return pathname === pattern
  })
}

function extractToken(req: NextRequest): string | null {
  // 1. Authorization header
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  // 2. Cookie (kaappu_token)
  const cookie = req.cookies.get('kaappu_token')
  if (cookie) return cookie.value
  return null
}

/**
 * kaappuPipeline() — Next.js middleware factory.
 *
 * Usage in middleware.ts:
 * ```ts
 * import { kaappuPipeline } from '@kaappu/next'
 * export default kaappuPipeline({
 *   publishableKey: process.env.NEXT_PUBLIC_KAAPPU_PK!,
 *   baseUrl: process.env.KAAPPU_BASE_URL!,
 *   publicRoutes: ['/sign-in', '/sign-up', '/api/public/*'],
 * })
 * export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
 * ```
 */
export function kaappuPipeline(pipelineConfig: KaappuPipelineConfig) {
  const {
    baseUrl = 'http://localhost:9091',
    publicRoutes = [],
    signInUrl = '/sign-in',
    debug = false,
  } = pipelineConfig

  // Always public
  const alwaysPublic = [signInUrl, '/sign-up', '/unauthorized', '/api/public/*', '/favicon.ico']
  const allPublic = [...alwaysPublic, ...publicRoutes]

  return async function middleware(req: NextRequest): Promise<NextResponse> {
    const { pathname } = req.nextUrl

    // Skip Next.js internals
    if (pathname.startsWith('/_next')) return NextResponse.next()

    // Public routes — pass through
    if (matchesPublicRoute(pathname, allPublic)) return NextResponse.next()

    const token = extractToken(req)

    if (!token) {
      // No token — redirect to sign-in for page routes, 401 for API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
      }
      const signInPage = new URL(signInUrl, req.url)
      signInPage.searchParams.set('redirectUrl', pathname)
      return NextResponse.redirect(signInPage)
    }

    // Verify JWT via JWKS
    if (debug) {
      // Debug mode: skip JWKS verification, decode payload only
      const auth = decodeTokenUnsafe(token)
      if (!auth) {
        return NextResponse.json({ success: false, error: 'Invalid token', code: 'token_invalid' }, { status: 401 })
      }
      return injectHeaders(NextResponse.next(), auth)
    }

    const auth = await verifyToken(token, baseUrl)
    if (!auth) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Token invalid or expired', code: 'token_invalid' }, { status: 401 })
      }
      const signInPage = new URL(signInUrl, req.url)
      signInPage.searchParams.set('redirectUrl', pathname)
      return NextResponse.redirect(signInPage)
    }

    return injectHeaders(NextResponse.next(), auth)
  }
}

function injectHeaders(res: NextResponse, auth: { userId: string; accountId: string; email: string; sessionId: string }): NextResponse {
  const next = NextResponse.next({ request: { headers: new Headers(res.headers) } })
  next.headers.set(HEADER_USER_ID, auth.userId)
  next.headers.set(HEADER_ACCOUNT_ID, auth.accountId)
  next.headers.set(HEADER_EMAIL, auth.email)
  next.headers.set(HEADER_SESSION_ID, auth.sessionId)
  return next
}

function decodeTokenUnsafe(token: string): { userId: string; accountId: string; email: string; sessionId: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) return null
    return {
      userId: payload.sub,
      accountId: payload.tid ?? '',
      email: payload.email ?? '',
      sessionId: payload.sid ?? '',
    }
  } catch {
    return null
  }
}
