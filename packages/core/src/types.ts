/** Tenant configuration returned by GET /api/v1/accounts/config?pk=... */
export interface KaappuTenantConfig {
  accountId: string
  authMethods: {
    password: boolean
    magicLink: boolean
    emailOtp: boolean
    phoneOtp: boolean
    passkeys: boolean
    google: boolean
    github: boolean
    microsoft: boolean
  }
  customProviders: Array<{
    id: string
    name: string
    discoveryUrl: string
  }>
  branding: {
    logoUrl: string
    primaryColor: string
    name: string
  }
  botProtection: {
    enabled: boolean
    siteKey: string
  }
  policy: {
    mfaRequired: boolean
    requireEmailVerification: boolean
  }
}

/** Authenticated user shape — framework-agnostic */
export interface KaappuUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  avatarUrl?: string
  emailVerified?: boolean
  mfaEnabled?: boolean
  accountId: string
  sessionId: string
  roles?: string[]
  permissions?: string[]
}

/** Auth session state — framework-agnostic */
export interface KaappuSession {
  isLoaded: boolean
  isSignedIn: boolean
  user: KaappuUser | null
  accessToken: string | null
  tenantConfig: KaappuTenantConfig | null
}

/** Configuration for the Kaappu client */
export interface KaappuClientConfig {
  /** The publishable key for your Kaappu account (pk_live_xxx) */
  publishableKey: string
  /** Base URL of the Kaappu API (e.g. https://api.kaappu.com or http://localhost:9091) */
  baseUrl?: string
}

/** Auth response from sign-in/sign-up */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: KaappuUser
  mfaRequired?: boolean
  challengeId?: string
}
