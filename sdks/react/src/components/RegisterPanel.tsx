'use client'

import React, { useContext, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuUser, RegisterPanelProps } from '../types'
import { buildThemeVars, resolveColorScheme } from '../theme'

/**
 * <RegisterPanel /> — Drop-in sign-up component.
 *
 * Renders the full Kaappu registration UI: OAuth providers, name/email/
 * password form with confirm-password and live password rule indicators,
 * friendly error messages, and an optional email-verification step.
 *
 * Designed for visual parity with <LoginPanel /> so apps can wire both
 * components into a single onboarding flow.
 *
 * @example
 * // Inside <KaappuProvider baseUrl="/api/auth">
 * <RegisterPanel onSuccess={(token, user) => router.push('/')} />
 *
 * // Standalone (no provider needed):
 * <RegisterPanel
 *   authUrl="https://myapp.com/api/auth"
 *   accountId="acme"
 *   onSuccess={(token, user) => { ... }}
 * />
 */
export function RegisterPanel({
  onSuccess,
  redirectUrl,
  logoUrl,
  appearance,
  className,
  // Standalone-mode props (no KaappuProvider required)
  authUrl: authUrlProp,
  accountId: accountIdProp,
  signInPath = '/sign-in',
  signInLabel = 'Sign in',
  signInPrompt = 'Already have an account?',
  // OAuth provider gating (mirrors LoginPanel)
  allowedProviders,
  oauthProxyUrl,
}: RegisterPanelProps & {
  authUrl?: string
  accountId?: string
  signInPath?: string
  signInLabel?: string
  signInPrompt?: string
  allowedProviders?: string[]
  oauthProxyUrl?: string
}) {
  // Try KaappuProvider context first; fall back to standalone props.
  const ctx = useContext(KaappuContext) as any
  const config = ctx?.tenantConfig

  // baseUrl resolution mirrors LoginPanel exactly so registrations and
  // sign-ins hit the same gateway.
  const rawBase: string = authUrlProp ?? ctx?._baseUrl ?? '/api/auth'
  const baseUrl: string = rawBase.includes('/api/auth') || rawBase.includes('/idm/auth')
    ? rawBase
    : rawBase.endsWith('/igai') || rawBase.includes(':9091')
      ? `${rawBase}/api/v1/idm/auth`
      : rawBase
  const accountId = accountIdProp ?? config?.accountId ?? 'default'

  // ── Form state ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'verify'>('form')

  // ── Password rule evaluation ──────────────────────────────────────────────
  const rules = {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordStrong = rules.length && rules.letter && rules.number
  const canSubmit = firstName && lastName && email && passwordStrong && passwordsMatch && !loading

  // ── Sign-up handler ───────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!passwordStrong) {
      setError('Password must be at least 8 characters and include letters and numbers.')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, accountId }),
      })
      const data = await res.json()
      if (!res.ok && !data.success) {
        setError(friendlyError(data.error ?? data.code))
        return
      }

      const payload = data.data ?? data
      const { accessToken, refreshToken, user } = payload
      if (accessToken) {
        // Auto sign-in after registration
        const mapped = mapUser(user, accountId)
        ctx?._onAuthSuccess?.(accessToken, refreshToken, mapped)
        onSuccess?.(accessToken, mapped)
        if (redirectUrl) window.location.href = redirectUrl
      } else {
        // Email verification required
        setStep('verify')
      }
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOAuth(provider: string) {
    if (oauthProxyUrl) {
      window.location.href = `${oauthProxyUrl}/${provider}`
    } else {
      const redirect = redirectUrl ?? window.location.href
      window.location.href = `${baseUrl}/oauth/${provider}?redirect=${encodeURIComponent(redirect)}`
    }
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const resolvedLogo = logoUrl ?? config?.branding?.logoUrl ?? '/kaappu-logo.png'
  const cssVars = buildThemeVars(appearance, config?.branding?.primaryColor)
  const isDark = resolveColorScheme(appearance?.colorScheme) === 'dark'

  // ── Email verification step ───────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div
        style={{
          ...cssVars,
          background: isDark ? '#030712' : 'var(--k-bg, #f5f5fa)',
          minHeight: isDark ? '100vh' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isDark ? undefined : '1rem 0',
        }}
        className={className}
      >
        <div style={CARD}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u2709\uFE0F'}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--k-text, #f0f6fc)' }}>
              Check your inbox
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--k-muted, #8b949e)', lineHeight: 1.6 }}>
              We sent a verification link to{' '}
              <strong style={{ color: 'var(--k-text, #f0f6fc)' }}>{email}</strong>.
              Click the link to activate your account.
            </p>
          </div>
          <ProtectedFooter />
        </div>
      </div>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        ...cssVars,
        background: isDark ? '#030712' : 'var(--k-bg, #f5f5fa)',
        minHeight: isDark ? '100vh' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: isDark ? '40px 16px' : '1rem 0',
      }}
      className={className}
    >
      {/* Background effects (dark mode only) */}
      {isDark && <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 60%)', zIndex: 0 }} />}
      {isDark && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 1 }} />}

      <div style={CARD}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <img src={resolvedLogo} alt="Logo"
            style={{ height: isDark ? 96 : 52, marginBottom: 6, filter: isDark ? 'drop-shadow(0 0 20px rgba(99,102,241,0.30))' : 'none' }} />
          <h2 style={{ color: 'var(--k-text, #f0f6fc)', fontSize: 22, fontWeight: 700, margin: '4px 0 6px 0' }}>
            Create your account
          </h2>
          <p style={{ color: 'var(--k-muted, #8b949e)', fontSize: 13, margin: 0, textAlign: 'center' }}>
            Join {config?.branding?.name ?? 'Kaappu'} to get started.
          </p>
        </div>

        {/* OAuth providers (gated by allowedProviders / tenant config) */}
        {(() => {
          const allProviders = [
            { id: 'google', label: 'Google', icon: <GoogleIcon /> },
            { id: 'github', label: 'GitHub', icon: <GithubIcon /> },
            { id: 'microsoft', label: 'Microsoft', icon: <MicrosoftIcon /> },
            { id: 'apple', label: 'Apple', icon: <AppleIcon /> },
          ]
          const visible = allProviders.filter(p => {
            if (allowedProviders && allowedProviders.length > 0) return allowedProviders.includes(p.id)
            return config?.authMethods?.[p.id as keyof typeof config.authMethods] !== false
          })
          if (visible.length === 0) return null

          if (visible.length === 1) {
            const p = visible[0]
            return (
              <button type="button" onClick={() => handleOAuth(p.id)} style={{
                ...OAUTH_BTN, gap: 10, padding: '12px 16px',
                width: '100%', marginBottom: 14, fontSize: 14, fontWeight: 500,
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--k-hover, rgba(255,255,255,0.08))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--k-hover, rgba(255,255,255,0.04))')}>
                {p.icon}<span>Continue with {p.label}</span>
              </button>
            )
          }

          const cols = Math.min(visible.length, 4)
          return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 14 }}>
              {visible.map(p => (
                <button key={p.id} type="button" onClick={() => handleOAuth(p.id)} style={OAUTH_BTN}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--k-hover, rgba(255,255,255,0.08))')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--k-hover, rgba(255,255,255,0.04))')}>
                  {p.icon}
                </button>
              ))}
            </div>
          )
        })()}

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginTop: 4, marginBottom: 18,
          color: 'var(--k-muted, #484f58)', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--k-border, rgba(255,255,255,0.06))' }} />
          or with email
          <div style={{ flex: 1, height: 1, background: 'var(--k-border, rgba(255,255,255,0.06))' }} />
        </div>

        {/* Error banner */}
        {error && (
          <div style={ERROR_BANNER}>
            <AlertIcon />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp}>
          {/* Name fields — min-width:0 forces grid columns to honor their width */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ minWidth: 0 }}>
              <label style={LABEL}>First name</label>
              <div style={INPUT_ROW}>
                <div style={ICON_BOX}><UserIcon /></div>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Jane" required autoComplete="given-name"
                  style={{ ...INPUT, minWidth: 0, width: '100%' }} />
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={LABEL}>Last name</label>
              <div style={INPUT_ROW}>
                <div style={ICON_BOX}><UserIcon /></div>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Doe" required autoComplete="family-name"
                  style={{ ...INPUT, minWidth: 0, width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Work email</label>
            <div style={INPUT_ROW}>
              <div style={ICON_BOX}><MailIcon /></div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required autoComplete="email" style={INPUT} />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 12 }}>
            <label style={LABEL}>Password</label>
            <div style={INPUT_ROW}>
              <div style={ICON_BOX}><LockIcon /></div>
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" required minLength={8}
                autoComplete="new-password"
                style={{ ...INPUT, paddingRight: 0 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ width: 44, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--k-muted, #6b7280)' }}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8, marginLeft: 4, fontSize: 11 }}>
                <RuleChip ok={rules.length} label="8+ characters" />
                <RuleChip ok={rules.letter} label="letter" />
                <RuleChip ok={rules.number} label="number" />
                <RuleChip ok={rules.symbol} label="symbol (recommended)" optional />
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Confirm password</label>
            <div style={{
              ...INPUT_ROW,
              ...(confirm.length > 0 && {
                borderColor: passwordsMatch ? 'rgba(52,211,153,0.40)' : 'rgba(248,81,73,0.40)',
              }),
            }}>
              <div style={ICON_BOX}><LockIcon /></div>
              <input type={showPassword ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password" required
                autoComplete="new-password" style={INPUT} />
              {confirm.length > 0 && (
                <div style={{ width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {passwordsMatch ? <CheckIcon /> : <XIcon />}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={!canSubmit} style={{
            ...PRIMARY_BTN,
            background: canSubmit ? PRIMARY_BTN.background : 'rgba(99,102,241,0.30)',
            boxShadow: canSubmit ? PRIMARY_BTN.boxShadow : 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}>
            {loading
              ? <><SpinnerIcon /> Creating account…</>
              : <>Create account <ArrowIcon /></>}
          </button>

          <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--k-muted, #8b949e)' }}>
            By continuing, you agree to the Terms of Service and Privacy Policy.
          </p>
        </form>

        {/* Sign in link */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--k-muted, #8b949e)', marginTop: 22 }}>
          {signInPrompt}{' '}
          <a href={signInPath} style={{ color: 'var(--k-primary, #818cf8)', textDecoration: 'none', fontWeight: 600 }}>{signInLabel}</a>
        </p>

        <ProtectedFooter />
      </div>

      <style>{`@keyframes kaappu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Password rule chip ─────────────────────────────────────────────────────
function RuleChip({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  const color = ok ? '#34d399' : (optional ? '#6b7280' : '#9ca3af')
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color, fontWeight: 500 }}>
      {ok
        ? <CheckIcon size={12} />
        : <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid ${color}`, display: 'inline-block' }} />}
      {label}
    </span>
  )
}

// ─── "Protected by Kaappu" footer ───────────────────────────────────────────
function ProtectedFooter() {
  return (
    <div style={{ marginTop: 26, borderTop: '1px solid var(--k-border, rgba(255,255,255,0.06))', paddingTop: 18, textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
        <ShieldIcon />
        <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.28em', color: 'var(--k-muted, #8b949e)' }}>
          Protected by Kaappu
        </span>
      </div>
    </div>
  )
}

// ─── Friendly error message map ─────────────────────────────────────────────
function friendlyError(code: string): string {
  const map: Record<string, string> = {
    email_already_exists: 'An account with this email already exists. Try signing in instead.',
    email_exists: 'An account with this email already exists. Try signing in instead.',
    password_breached: 'This password has appeared in a known data breach. Please choose a different one.',
    weak_password: 'Password is too weak. Use at least 8 characters with letters and numbers.',
    password_too_weak: 'Password is too weak. Use at least 8 characters with letters and numbers.',
    password_too_short: 'Password must be at least 8 characters.',
    invalid_email: 'Please enter a valid email address.',
    invalid_password: 'Password does not meet the requirements.',
    email_domain_not_allowed: 'Sign-ups from this email domain are not allowed.',
    email_blocked: 'This email address cannot be used.',
    bot_protection_failed: 'Bot protection check failed. Please try again.',
    rate_limited: 'Too many attempts. Please wait a minute and try again.',
  }
  return map[code] ?? code ?? 'Registration failed. Please try again.'
}

// ─── Helper: shape backend user into KaappuUser ─────────────────────────────
function mapUser(raw: any, accountId: string): KaappuUser {
  return {
    id: raw.id ?? raw.userId,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    avatarUrl: raw.avatarUrl,
    emailVerified: raw.emailVerified,
    mfaEnabled: raw.mfaEnabled,
    accountId: raw.accountId ?? accountId,
    sessionId: raw.sessionId ?? '',
    roles: raw.roles ?? [],
    permissions: raw.permissions ?? [],
  }
}

// ─── Style constants (mirror LoginPanel for visual parity) ──────────────────

const CARD: React.CSSProperties = {
  width: '100%', maxWidth: 460,
  background: 'var(--k-card-bg, rgba(13, 17, 23, 0.92))',
  border: '1px solid var(--k-border, rgba(255,255,255,0.10))',
  borderRadius: 24, padding: '40px 38px',
  position: 'relative', zIndex: 10,
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--k-shadow, 0 25px 80px rgba(0,0,0,0.5))',
}

const INPUT_ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  background: 'var(--k-hover, rgba(255,255,255,0.03))',
  border: '1px solid var(--k-border, rgba(255,255,255,0.10))',
  borderRadius: 12, height: 48, overflow: 'hidden',
  transition: 'border-color 0.15s ease',
}

const INPUT: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--k-text, #f0f6fc)', fontSize: 14, paddingRight: 14,
  WebkitTextFillColor: 'var(--k-text, #f0f6fc)' as any,
  minWidth: 0,
}

const ICON_BOX: React.CSSProperties = {
  width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--k-muted, #6b7280)',
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--k-muted, #9ca3af)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 6, marginLeft: 2,
}

const PRIMARY_BTN: React.CSSProperties = {
  width: '100%', height: 50, marginTop: 4,
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: 'white', border: 'none', borderRadius: 12,
  fontSize: 14, fontWeight: 700,
  boxShadow: '0 10px 25px rgba(99,102,241,0.30)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  transition: 'all 0.15s ease',
}

const OAUTH_BTN: React.CSSProperties = {
  padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--k-hover, rgba(255,255,255,0.04))',
  border: '1px solid var(--k-border, rgba(255,255,255,0.08))',
  borderRadius: 12, cursor: 'pointer',
  color: 'var(--k-text, #f0f6fc)', height: 46,
}

const ERROR_BANNER: React.CSSProperties = {
  background: 'rgba(248,81,73,0.10)',
  border: '1px solid rgba(248,81,73,0.25)',
  borderRadius: 10, padding: '10px 14px',
  fontSize: 13, color: '#f87171',
  display: 'flex', alignItems: 'flex-start', gap: 8,
  marginBottom: 14,
}

// ─── Inline SVG icons (no external deps) ────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
  </svg>
)
const MicrosoftIcon = () => (
  <svg viewBox="0 0 23 23" width="18" height="18">
    <path fill="#f3f3f3" d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
  </svg>
)
const AppleIcon = () => (
  <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)

const UserIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const MailIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
const LockIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const EyeIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
const ArrowIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
const ShieldIcon = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
const SpinnerIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'kaappu-spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
const AlertIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
const CheckIcon = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const XIcon = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
