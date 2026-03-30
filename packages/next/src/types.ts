import type { NextRequest, NextResponse } from 'next/server'

export interface KaappuPipelineConfig {
  /** The publishable key for your Kaappu account */
  publishableKey: string
  /** Base URL of the Kaappu API (default: http://localhost:9091) */
  baseUrl?: string
  /** Routes that do not require authentication. Supports exact paths and glob patterns */
  publicRoutes?: string[]
  /** Route to redirect unauthenticated users to (default: /sign-in) */
  signInUrl?: string
  /** Whether to skip JWT verification (useful if baseUrl is unreachable in dev) */
  debug?: boolean
}

export interface KaappuAuthContext {
  userId: string
  accountId: string
  email: string
  sessionId: string
}

export interface AuthorizeResult {
  /** The auth context if authenticated, null if not */
  auth: KaappuAuthContext | null
  /** Throws KaappuAuthError if not authenticated */
  required: () => KaappuAuthContext
}

export type AuthenticatedHandler = (
  req: NextRequest,
  ctx: { auth: KaappuAuthContext; params?: any }
) => Promise<NextResponse> | NextResponse

export class KaappuAuthError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(message: string, code = 'unauthorized', status = 401) {
    super(message)
    this.name = 'KaappuAuthError'
    this.code = code
    this.status = status
  }
}
