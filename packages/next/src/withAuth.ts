import { NextRequest, NextResponse } from 'next/server'
import type { AuthenticatedHandler, KaappuAuthContext } from './types'
import { KaappuAuthError } from './types'
import {
  HEADER_USER_ID, HEADER_ACCOUNT_ID, HEADER_EMAIL, HEADER_SESSION_ID
} from './pipeline'

/**
 * withAuth() — Next.js Route Handler wrapper.
 * Extracts auth context injected by kaappuPipeline() and passes it to the handler.
 * Returns 401 if auth headers are missing (pipeline was not run).
 *
 * Usage:
 * ```ts
 * import { withAuth } from '@kaappu/next'
 * export const GET = withAuth(async (req, { auth }) => {
 *   return NextResponse.json({ userId: auth.userId })
 * })
 * ```
 *
 * With route params:
 * ```ts
 * export const GET = withAuth(async (req, { auth, params }) => {
 *   const id = params.id
 *   return NextResponse.json({ id, userId: auth.userId })
 * }, { params: Promise<{ id: string }> })
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options?: { permission?: string }
) {
  return async function routeHandler(
    req: NextRequest,
    context?: { params?: Promise<any> | any }
  ): Promise<NextResponse> {
    const userId = req.headers.get(HEADER_USER_ID)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'unauthorized' },
        { status: 401 }
      )
    }

    const auth: KaappuAuthContext = {
      userId,
      accountId: req.headers.get(HEADER_ACCOUNT_ID) ?? '',
      email: req.headers.get(HEADER_EMAIL) ?? '',
      sessionId: req.headers.get(HEADER_SESSION_ID) ?? '',
    }

    const resolvedParams = context?.params instanceof Promise
      ? await context.params
      : (context?.params ?? {})

    try {
      return await handler(req, { auth, params: resolvedParams })
    } catch (err) {
      if (err instanceof KaappuAuthError) {
        return NextResponse.json(
          { success: false, error: err.message, code: err.code },
          { status: err.status }
        )
      }
      const message = err instanceof Error ? err.message : 'Internal server error'
      return NextResponse.json(
        { success: false, error: message, code: 'internal_error' },
        { status: 500 }
      )
    }
  }
}
