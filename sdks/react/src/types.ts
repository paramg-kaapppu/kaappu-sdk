/** Tenant config returned by GET /api/v1/accounts/config?pk=... */
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

/** Authenticated user shape */
export interface KaappuUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  emailVerified?: boolean
  mfaEnabled?: boolean
  accountId: string
  sessionId: string
  roles?: string[]
  permissions?: string[]
}

/** Auth state exposed via useKaappu() */
export interface KaappuContextValue {
  /** Whether the provider has finished loading (config + session check) */
  isLoaded: boolean
  /** Whether a user is signed in */
  isSignedIn: boolean
  /** The signed-in user, or null */
  user: KaappuUser | null
  /** Current access token (may be refreshed transparently) */
  accessToken: string | null
  /** Tenant configuration fetched at init */
  tenantConfig: KaappuTenantConfig | null
  /** Sign out — clears session + tokens */
  signOut: () => Promise<void>
  /** Get the current access token (refreshes if needed) */
  getToken: () => Promise<string | null>
  /** Check if user has a permission (client-side, from token claims) */
  hasPermission: (permission: string) => boolean
}

/** KaappuProvider props */
export interface KaappuProviderProps {
  /** The publishable key for your Kaappu account (pk_live_xxx) */
  publishableKey: string
  /** Base URL of the Kaappu API (e.g. https://api.kaappu.com or http://localhost:9091) */
  baseUrl?: string
  /** Default: '/sign-in' */
  signInUrl?: string
  /** Default: '/sign-up' */
  signUpUrl?: string
  children: React.ReactNode
}

/** Appearance customization — passed to any SDK component */
export interface KaappuAppearance {
  /**
   * Color scheme. 'auto' follows the OS prefers-color-scheme setting.
   * Default: 'dark'
   */
  colorScheme?: 'dark' | 'light' | 'auto'
  /** Override CSS custom properties */
  variables?: {
    primaryColor?: string
    primaryForeground?: string
    backgroundColor?: string
    cardBackground?: string
    textColor?: string
    mutedColor?: string
    borderColor?: string
    borderRadius?: string
    fontFamily?: string
  }
  /** Class names for individual elements (slots) */
  elements?: {
    card?: string
    title?: string
    subtitle?: string
    input?: string
    button?: string
    divider?: string
    oauthButton?: string
    footer?: string
    badge?: string
    dropdown?: string
    dropdownItem?: string
  }
}

/** ProfileBadge props */
export interface ProfileBadgeProps {
  afterSignOutUrl?: string
  userProfileUrl?: string
  appearance?: KaappuAppearance
  className?: string
}

/** AccountView props */
export interface AccountViewProps {
  appearance?: KaappuAppearance
  className?: string
}

/** LoginPanel props */
export interface LoginPanelProps {
  /** Called with accessToken on successful sign-in */
  onSuccess?: (token: string, user: KaappuUser) => void
  /** Redirect URL after sign-in (used by kaappuPipeline integration) */
  redirectUrl?: string
  /** Override the logo displayed inside the card (URL or React node) */
  logoUrl?: string
  /** Appearance overrides */
  appearance?: KaappuAppearance
  /** Custom CSS class for the card wrapper */
  className?: string
  /** Override OAuth redirect base URL (e.g., for WordPress proxy). If set, OAuth goes to {oauthProxyUrl}/{provider} instead of {baseUrl}/oauth/{provider} */
  oauthProxyUrl?: string
  /** List of OAuth providers to show (e.g., ['google']). If set, only these are shown. */
  allowedProviders?: string[]
}

/** RegisterPanel props */
export interface RegisterPanelProps {
  /** Called with accessToken on successful registration */
  onSuccess?: (token: string, user: KaappuUser) => void
  /** Redirect URL after registration */
  redirectUrl?: string
  /** Override the logo displayed inside the card (URL or data URI) */
  logoUrl?: string
  /** Appearance overrides */
  appearance?: KaappuAppearance
  className?: string
}
