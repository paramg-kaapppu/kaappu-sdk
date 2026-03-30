import type { KaappuAppearance } from '../types'

/** Dark theme defaults (Kaappu's native aesthetic) */
const DARK_VARS: Record<string, string> = {
  '--k-primary':    '#6366f1',
  '--k-primary-fg': '#ffffff',
  '--k-bg':         '#0a0a0f',
  '--k-card-bg':    '#111118',
  '--k-text':       '#f0f6fc',
  '--k-muted':      '#8b949e',
  '--k-border':     'rgba(240,246,252,0.12)',
  '--k-hover':      'rgba(240,246,252,0.06)',
  '--k-radius':     '0.75rem',
  '--k-font':       '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--k-shadow':     '0 8px 32px rgba(0,0,0,0.4)',
}

/** Light theme defaults */
const LIGHT_VARS: Record<string, string> = {
  '--k-primary':    '#6366f1',
  '--k-primary-fg': '#ffffff',
  '--k-bg':         '#f5f5fa',
  '--k-card-bg':    '#ffffff',
  '--k-text':       '#111118',
  '--k-muted':      '#6b7280',
  '--k-border':     'rgba(0,0,0,0.10)',
  '--k-hover':      'rgba(0,0,0,0.04)',
  '--k-radius':     '0.75rem',
  '--k-font':       '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--k-shadow':     '0 8px 32px rgba(0,0,0,0.12)',
}

/**
 * Resolves the active color scheme.
 * 'auto' reads prefers-color-scheme at call time (SSR-safe — defaults to dark).
 */
export function resolveColorScheme(
  scheme: 'dark' | 'light' | 'auto' = 'dark'
): 'dark' | 'light' {
  if (scheme !== 'auto') return scheme
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Build the CSS variables object to apply as `style` on the root element.
 * Merges theme defaults → branding primaryColor → appearance overrides.
 */
export function buildThemeVars(
  appearance?: KaappuAppearance,
  brandingColor?: string
): React.CSSProperties {
  const scheme = resolveColorScheme(appearance?.colorScheme ?? 'dark')
  const base = scheme === 'light' ? { ...LIGHT_VARS } : { ...DARK_VARS }

  // Branding color from tenant config (lower priority than explicit appearance)
  if (brandingColor) base['--k-primary'] = brandingColor

  // Appearance variable overrides (highest priority)
  const v = appearance?.variables ?? {}
  if (v.primaryColor)     base['--k-primary']    = v.primaryColor
  if (v.primaryForeground) base['--k-primary-fg'] = v.primaryForeground
  if (v.backgroundColor)  base['--k-bg']         = v.backgroundColor
  if (v.cardBackground)   base['--k-card-bg']    = v.cardBackground
  if (v.textColor)        base['--k-text']       = v.textColor
  if (v.mutedColor)       base['--k-muted']      = v.mutedColor
  if (v.borderColor)      base['--k-border']     = v.borderColor
  if (v.borderRadius)     base['--k-radius']     = v.borderRadius
  if (v.fontFamily)       base['--k-font']       = v.fontFamily

  return base as React.CSSProperties
}

/**
 * createTheme() — convenience helper for customers who want to define a
 * theme object once and reuse it across multiple components.
 *
 * @example
 * const theme = createTheme({ colorScheme: 'light', variables: { primaryColor: '#0ea5e9' } })
 * <LoginPanel appearance={theme} />
 * <ProfileBadge appearance={theme} />
 */
export function createTheme(appearance: KaappuAppearance): KaappuAppearance {
  return appearance
}

// ── Shared inline style constants (used across all SDK components) ──────────

export const cardStyle: React.CSSProperties = {
  background:    'var(--k-card-bg)',
  border:        '1px solid var(--k-border)',
  borderRadius:  'var(--k-radius)',
  padding:       '2rem',
  width:         '100%',
  maxWidth:      '420px',
  fontFamily:    'var(--k-font)',
  color:         'var(--k-text)',
  boxSizing:     'border-box',
  boxShadow:     'var(--k-shadow)',
}

export const inputStyle: React.CSSProperties = {
  width:         '100%',
  padding:       '0.625rem 0.875rem',
  background:    'var(--k-hover)',
  border:        '1px solid var(--k-border)',
  borderRadius:  'calc(var(--k-radius) * 0.6)',
  color:         'var(--k-text)',
  fontSize:      '0.875rem',
  outline:       'none',
  boxSizing:     'border-box',
  fontFamily:    'var(--k-font)',
}

export const primaryButtonStyle: React.CSSProperties = {
  width:         '100%',
  padding:       '0.625rem 1rem',
  background:    'var(--k-primary)',
  color:         'var(--k-primary-fg)',
  border:        'none',
  borderRadius:  'calc(var(--k-radius) * 0.6)',
  fontSize:      '0.875rem',
  fontWeight:    600,
  cursor:        'pointer',
  fontFamily:    'var(--k-font)',
}

export const ghostButtonStyle: React.CSSProperties = {
  width:         '100%',
  padding:       '0.625rem 1rem',
  background:    'var(--k-hover)',
  color:         'var(--k-text)',
  border:        '1px solid var(--k-border)',
  borderRadius:  'calc(var(--k-radius) * 0.6)',
  fontSize:      '0.875rem',
  fontWeight:    500,
  cursor:        'pointer',
  fontFamily:    'var(--k-font)',
}

export const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      '0.8125rem',
  fontWeight:    500,
  color:         'var(--k-muted)',
  marginBottom:  '0.375rem',
}

export const errorStyle: React.CSSProperties = {
  fontSize:      '0.8125rem',
  color:         '#ef4444',
  marginTop:     '0.25rem',
}
