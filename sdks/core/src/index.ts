// Types
export type {
  KaappuUser,
  KaappuTenantConfig,
  KaappuSession,
  KaappuClientConfig,
  AuthResponse,
  PasskeyCredential,
  PasskeyRegisterBeginResponse,
  PasskeyAuthenticateBeginResponse,
} from './types'

// Token utilities
export {
  parseJwtPayload,
  isTokenExpired,
  getTokenExpiryMs,
  extractUserFromToken,
} from './token'

// Permission checking
export {
  checkPermission,
  checkAllPermissions,
  checkAnyPermission,
  isPermission,
} from './permissions'

// API client
export { KaappuApiClient } from './api-client'

// Token storage
export type { TokenStorage } from './storage'
export { BrowserTokenStorage, MemoryTokenStorage } from './storage'

// WebAuthn / Passkey utilities
export { base64urlToBuffer, bufferToBase64url, isWebAuthnSupported } from './webauthn'
