// Context + hooks
export { KaappuProvider } from './context/KaappuProvider'
export { useKaappu, KaappuContext } from './context/KaappuContext'

// Auth components
export { LoginPanel } from './components/LoginPanel'
export { RegisterPanel } from './components/RegisterPanel'

// Profile components
export { ProfileBadge } from './components/ProfileBadge'
export { AccountView } from './components/AccountView'

// Conditional render helpers
export { Authorize, LoggedIn, LoggedOut } from './components/Authorize'

// Theming
export { createTheme, buildThemeVars, resolveColorScheme } from './theme'

// Re-export core types and utilities (so consumers don't need to install @kaappu/core separately)
export type { KaappuUser, KaappuTenantConfig, KaappuSession, AuthResponse } from '@kaappu/core'
export { checkPermission, checkAllPermissions, checkAnyPermission, isPermission } from '@kaappu/core'
export { KaappuApiClient } from '@kaappu/core'

// React-specific types
export type {
  KaappuContextValue,
  KaappuProviderProps,
  KaappuAppearance,
  LoginPanelProps,
  RegisterPanelProps,
  ProfileBadgeProps,
  AccountViewProps,
} from './types'
