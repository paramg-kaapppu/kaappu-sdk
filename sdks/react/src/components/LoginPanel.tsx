'use client'

import React, { useContext, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuUser, LoginPanelProps } from '../types'
import { buildThemeVars } from '../theme'

type Tab = 'password' | 'magic' | 'otp' | 'phone'

/**
 * <LoginPanel /> — Drop-in sign-in component.
 *
 * Renders the full Kaappu authentication UI: OAuth providers, passkey,
 * email/password, magic link, OTP, and phone tabs.
 *
 * All auth calls go through the configured middleware (Next.js API routes
 * at /api/auth/*) — never directly to igai-connector.
 *
 * @example
 * // Inside <KaappuProvider baseUrl="/api/auth">
 * <LoginPanel onSuccess={(token, user) => router.push('/')} />
 *
 * // Or standalone without KaappuProvider:
 * <LoginPanel
 *   authUrl="https://myapp.com/api/auth"
 *   accountId="kaappu_org"
 *   onSuccess={(token, user) => { ... }}
 * />
 */
export function LoginPanel({
  onSuccess,
  redirectUrl,
  logoUrl,
  appearance,
  className,
  // New props for standalone usage (without KaappuProvider)
  authUrl: authUrlProp,
  accountId: accountIdProp,
  signUpPath = '/sign-up',
  signUpLabel = 'Enroll Identity',
  signUpPrompt = 'New operator?',
}: LoginPanelProps & {
  authUrl?: string
  accountId?: string
  signUpPath?: string
  signUpLabel?: string
  signUpPrompt?: string
}) {
  // Try KaappuProvider context first, fall back to standalone props
  const ctx = useContext(KaappuContext) as any
  const config = ctx?.tenantConfig
  const baseUrl: string = authUrlProp ?? ctx?._baseUrl ?? '/api/auth'
  const accountId = accountIdProp ?? config?.accountId ?? 'default'

  const [tab, setTab] = useState<Tab>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  // ── Auth handlers ─────────────────────────────────────────────────────────

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountId }),
      })
      const data = await res.json()
      if (!data.success && !data.data) {
        setError(data.error ?? 'Sign in failed')
        return
      }
      const { accessToken, refreshToken, user } = data.data ?? data
      const mapped = mapUser(user, accountId)
      ctx?._onAuthSuccess?.(accessToken, refreshToken, mapped)
      onSuccess?.(accessToken, mapped)
      if (redirectUrl) window.location.href = redirectUrl
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accountId }),
      })
      if (res.ok) {
        setInfo(`Magic link sent to ${email}. Check your inbox.`)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Could not send magic link')
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accountId }),
      })
      if (res.ok) {
        setInfo(`A 6-digit code was sent to ${email}`)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Could not send code')
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setLoading(false)
    }
  }

  function handleOAuth(provider: string) {
    const redirect = redirectUrl ?? window.location.href
    window.location.href = `${baseUrl}/oauth/${provider}?redirect=${encodeURIComponent(redirect)}`
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  const resolvedLogo = logoUrl ?? config?.branding?.logoUrl ?? '/kaappu-logo.png'
  const cssVars = buildThemeVars(appearance, config?.branding?.primaryColor)

  return (
    <div
      style={{
        ...cssVars,
        background: '#030712',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
      className={className}
    >
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 30%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.08) 0%, transparent 60%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 1 }} />

      <div style={CARD}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src={resolvedLogo} alt="Logo" style={{ height: 120, marginBottom: 4, filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.3))' }} />
          <p style={{ color: '#8b949e', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
            Welcome back! Please sign in to continue.
          </p>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          {[
            { id: 'google', icon: <GoogleIcon /> },
            { id: 'github', icon: <GithubIcon /> },
            { id: 'microsoft', icon: <MicrosoftIcon /> },
            { id: 'apple', icon: <AppleIcon /> },
          ].map(p => (
            <button key={p.id} onClick={() => handleOAuth(p.id)} style={OAUTH_BTN}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
              {p.icon}
            </button>
          ))}
        </div>

        {/* Passkey */}
        <button style={PASSKEY_BTN}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}>
          <FingerprintIcon /> Sign in with Passkey
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: '#484f58', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          or use email
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {([
            { key: 'password' as Tab, label: '\uD83D\uDD11 Password' },
            { key: 'magic' as Tab, label: '\u2728 Magic Link' },
            { key: 'otp' as Tab, label: '\uD83D\uDCE7 Email OTP' },
            { key: 'phone' as Tab, label: '\uD83D\uDCF1 Phone' },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => { setTab(key); setError(null); setInfo(null) }}
              style={{
                flex: 1, padding: '7px 2px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                background: tab === key ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: tab === key ? '#818cf8' : '#8b949e',
                border: 'none', transition: 'all 0.15s ease',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Error / Info */}
        {error && <div style={ERROR_BANNER}>{error}</div>}
        {info && <p style={{ fontSize: 13, color: '#34d399', marginBottom: 12, textAlign: 'center' }}>{info}</p>}

        {/* Form */}
        <form onSubmit={tab === 'magic' ? handleMagicLink : tab === 'otp' ? handleOtpRequest : handlePasswordSignIn}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Work Email</label>
            <div style={INPUT_ROW}>
              <div style={ICON_BOX}><MailIcon /></div>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com" required
                style={INPUT} />
            </div>
          </div>

          {/* Password (password tab only) */}
          {tab === 'password' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginLeft: 4 }}>
                <label style={{ ...LABEL, marginBottom: 0 }}>Access Key</label>
                <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, cursor: 'pointer' }}>Recover</span>
              </div>
              <div style={INPUT_ROW}>
                <div style={ICON_BOX}><LockIcon /></div>
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  style={{ ...INPUT, paddingRight: 0 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ width: 48, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#484f58' }}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          )}

          {tab === 'magic' && <p style={HINT}>We'll send a one-click sign-in link to your email.</p>}
          {tab === 'otp' && <p style={HINT}>We'll send a 6-digit code to your email. No password needed.</p>}
          {tab === 'phone' && <p style={HINT}>We'll send a 6-digit code via SMS. No password needed.</p>}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            ...PRIMARY_BTN,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? <SpinnerIcon /> : null}
            {tab === 'password' && 'Authenticate'}
            {tab === 'magic' && 'Send Magic Link'}
            {tab === 'otp' && 'Send Code'}
            {tab === 'phone' && 'Send Code'}
            {!loading && <ArrowIcon />}
          </button>
        </form>

        {/* Sign up link */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#8b949e', marginTop: 28 }}>
          {signUpPrompt}{' '}
          <a href={signUpPath} style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 700 }}>{signUpLabel}</a>
        </p>

        {/* Protected by Kaappu */}
        <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.4 }}>
            <ShieldIcon />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.3em', color: '#8b949e' }}>Protected by Kaappu</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: 'rgba(13, 17, 23, 0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 24, padding: 40,
  position: 'relative', zIndex: 10,
  backdropFilter: 'blur(20px)',
  boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
}

const INPUT_ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, height: 52, overflow: 'hidden',
}

const INPUT: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: '#f0f6fc', fontSize: 15, paddingRight: 16,
}

const ICON_BOX: React.CSSProperties = {
  width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58',
}

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: '#484f58',
  textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6, marginLeft: 4,
}

const HINT: React.CSSProperties = {
  fontSize: 12, color: '#8b949e', marginBottom: 12, marginLeft: 4,
}

const PRIMARY_BTN: React.CSSProperties = {
  width: '100%', height: 56, marginTop: 8,
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: 'white', border: 'none', borderRadius: 14,
  fontSize: 15, fontWeight: 700,
  boxShadow: '0 10px 25px rgba(99,102,241,0.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
}

const OAUTH_BTN: React.CSSProperties = {
  padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, cursor: 'pointer', color: '#f0f6fc',
}

const PASSKEY_BTN: React.CSSProperties = {
  width: '100%', marginBottom: 12, padding: '10px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
  borderRadius: 12, cursor: 'pointer', color: '#818cf8', fontSize: 13, fontWeight: 600,
}

const ERROR_BANNER: React.CSSProperties = {
  background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)',
  borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f85149',
  textAlign: 'center', fontWeight: 600, marginBottom: 16,
}

// ── Inline SVG icons (no external deps) ─────────────────────────────────────

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
  <svg viewBox="0 0 23 23" width="16" height="16">
    <path fill="#f3f3f3" d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
  </svg>
)
const AppleIcon = () => (
  <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
  </svg>
)
const FingerprintIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6 3 0 5.5 2 5.8 5"/><path d="M12 12v4s.9 3 3.3 5"/><path d="M8.5 18c.5-2 .5-4 .5-6 0-1.7 1.3-3 3-3s3 1.3 3 3c0 2-.5 4.5-1.5 6.5"/><path d="M14 21c.5-2 .5-4.5 0-7"/>
  </svg>
)
const MailIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
const LockIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const EyeIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
const EyeOffIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>
const ArrowIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
const ShieldIcon = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8b949e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
const SpinnerIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'kaappu-spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>

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
