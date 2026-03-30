// Context + hooks
export { KaappuProvider } from './context/KaappuProvider'
export { useKaappu } from './context/KaappuContext'

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

// Types
export type {
  KaappuContextValue,
  KaappuProviderProps,
  KaappuTenantConfig,
  KaappuUser,
  KaappuAppearance,
  LoginPanelProps,
  RegisterPanelProps,
  ProfileBadgeProps,
  AccountViewProps,
} from './types'
