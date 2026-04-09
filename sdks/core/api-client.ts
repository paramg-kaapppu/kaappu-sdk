/**
 * Framework-agnostic API client for Kaappu Identity.
 * Works with any HTTP environment — browser fetch, Node.js fetch, etc.
 */

import type { KaappuClientConfig, KaappuTenantConfig, AuthResponse, KaappuUser } from './types'

export class KaappuApiClient {
  private readonly baseUrl: string
  private readonly publishableKey: string

  constructor(config: KaappuClientConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:9091'
    this.publishableKey = config.publishableKey
  }

  /** Fetch tenant config (auth methods, branding, bot protection) */
  async getTenantConfig(): Promise<KaappuTenantConfig | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/accounts/config?pk=${this.publishableKey}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ?? null
    } catch {
      return null
    }
  }

  /** Sign in with email + password */
  async signIn(email: string, password: string, accountId?: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/idm/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, accountId: accountId || 'default' }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Sign in failed')
    return data.data
  }

  /** Sign up with email + password */
  async signUp(params: {
    email: string
    password: string
    firstName?: string
    lastName?: string
    accountId?: string
  }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/idm/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, accountId: params.accountId || 'default' }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Sign up failed')
    return data.data
  }

  /** Refresh an access token using a refresh token */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/idm/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.data ?? null
    } catch {
      return null
    }
  }

  /** Sign out — invalidate session on the server */
  async signOut(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/idm/auth/sign-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {})
  }

  /** Get current user profile */
  async getMe(accessToken: string): Promise<KaappuUser | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/idm/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.data?.user ?? null
    } catch {
      return null
    }
  }

  /** Verify MFA challenge */
  async verifyMfa(challengeId: string, code: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/idm/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, code }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'MFA verification failed')
    return data.data
  }

  /** Request magic link */
  async requestMagicLink(email: string, accountId?: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/idm/auth/magic-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, accountId: accountId || 'default' }),
    })
  }

  /** Get OAuth authorization URL */
  async getOAuthUrl(provider: string, redirectUri: string, accountId?: string): Promise<string> {
    const res = await fetch(
      `${this.baseUrl}/api/v1/idm/auth/oauth/${provider}?accountId=${accountId || 'default'}&redirectUri=${encodeURIComponent(redirectUri)}`
    )
    const data = await res.json()
    return data?.data?.url || data?.url || ''
  }
}
