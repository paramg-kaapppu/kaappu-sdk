'use client'

import React, { useContext, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuUser, LoginPanelProps } from '../types'
import {
  buildCssVars, cardStyle, inputStyle, primaryButtonStyle,
  ghostButtonStyle, labelStyle, errorStyle
} from './styles'

type Tab = 'password' | 'otp' | 'magic-link'

const OAUTH_PROVIDERS = [
  { id: 'google',    label: 'Google',    logo: 'G' },
  { id: 'github',    label: 'GitHub',    logo: '⌥' },
  { id: 'microsoft', label: 'Microsoft', logo: 'M' },
]

export function LoginPanel({ onSuccess, redirectUrl, appearance, className }: LoginPanelProps) {
  const ctx = useContext(KaappuContext) as any
  if (!ctx) throw new Error('[Kaappu] <LoginPanel> must be inside <KaappuProvider>')

  const config = ctx.tenantConfig
  const baseUrl: string = ctx._baseUrl ?? 'http://localhost:9091'

  const [tab, setTab] = useState<Tab>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const accountId = config?.accountId ?? 'default'

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Sign in failed')
        return
      }
      const { accessToken, refreshToken, user } = data.data
      ctx._onAuthSuccess?.(accessToken, refreshToken, mapUser(user, accountId))
      onSuccess?.(accessToken, mapUser(user, accountId))
      if (redirectUrl) window.location.href = redirectUrl
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/otp/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accountId, purpose: 'sign_in' }),
      })
      if (res.ok) {
        setOtpStep('code')
        setInfo(`A 6-digit code was sent to ${email}`)
      } else {
        const d = await res.json()
        setError(d.error ?? 'Could not send code')
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, accountId, purpose: 'sign_in' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid code'); return }
      const { accessToken, refreshToken, user } = data.data
      ctx._onAuthSuccess?.(accessToken, refreshToken, mapUser(user, accountId))
      onSuccess?.(accessToken, mapUser(user, accountId))
      if (redirectUrl) window.location.href = redirectUrl
    } catch {
      setError('Unable to connect.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Magic link uses same OTP generate with purpose=magic_link
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/otp/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accountId, purpose: 'magic_link' }),
      })
      if (res.ok) {
        setInfo(`Magic link sent to ${email}. Check your inbox.`)
      } else {
        const d = await res.json()
        setError(d.error ?? 'Could not send magic link')
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setLoading(false)
    }
  }

  function handleOAuth(provider: string) {
    const redirect = redirectUrl ?? window.location.href
    // OAuth flow goes through the app's own API routes (set up by @kaappu/next)
    window.location.href =
      `/api/auth/oauth/${provider}?redirect=${encodeURIComponent(redirect)}`
  }

  const cssVars = buildCssVars(appearance, config?.branding?.primaryColor)

  const activeTabStyle: React.CSSProperties = {
    color: 'var(--k-text)',
    fontWeight: 600,
    paddingBottom: '0.5rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid var(--k-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'var(--k-font)',
  }

  const inactiveTabStyle: React.CSSProperties = {
    paddingBottom: '0.5rem',
    color: 'var(--k-muted)',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontFamily: 'var(--k-font)',
  }

  return (
    <div
      style={{ ...cssVars, ...cardStyle }}
      className={className}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        {config?.branding?.logoUrl && (
          <img src={config.branding.logoUrl} alt={config.branding.name} style={{ height: '40px', marginBottom: '0.75rem' }} />
        )}
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--k-text)' }}>
          Sign in{config?.branding?.name ? ` to ${config.branding.name}` : ''}
        </h2>
      </div>

      {/* OAuth buttons */}
      {OAUTH_PROVIDERS.some(p => config?.authMethods?.[p.id as keyof typeof config.authMethods]) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {OAUTH_PROVIDERS.filter(p => config?.authMethods?.[p.id as keyof typeof config.authMethods] !== false).map(p => (
            <button key={p.id} style={ghostButtonStyle} onClick={() => handleOAuth(p.id)}>
              <span style={{ marginRight: '0.5rem' }}>{p.logo}</span> Continue with {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--k-border)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--k-muted)' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--k-border)' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--k-border)' }}>
        <button style={tab === 'password' ? activeTabStyle : inactiveTabStyle} onClick={() => { setTab('password'); setError(null); setInfo(null) }}>
          Password
        </button>
        {config?.authMethods?.emailOtp !== false && (
          <button style={tab === 'otp' ? activeTabStyle : inactiveTabStyle} onClick={() => { setTab('otp'); setError(null); setInfo(null); setOtpStep('email') }}>
            Email code
          </button>
        )}
        {config?.authMethods?.magicLink !== false && (
          <button style={tab === 'magic-link' ? activeTabStyle : inactiveTabStyle} onClick={() => { setTab('magic-link'); setError(null); setInfo(null) }}>
            Magic link
          </button>
        )}
      </div>

      {/* Error / Info */}
      {error && <p style={{ ...errorStyle, marginBottom: '0.75rem' }}>{error}</p>}
      {info && <p style={{ fontSize: '0.8125rem', color: '#34d399', marginBottom: '0.75rem' }}>{info}</p>}

      {/* Password tab */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
          </div>
          <button style={primaryButtonStyle} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {/* Email OTP tab */}
      {tab === 'otp' && otpStep === 'email' && (
        <form onSubmit={handleOtpRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <button style={primaryButtonStyle} type="submit" disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}
      {tab === 'otp' && otpStep === 'code' && (
        <form onSubmit={handleOtpVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>6-digit code</label>
            <input style={{ ...inputStyle, letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.25rem' }} type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
          </div>
          <button style={primaryButtonStyle} type="submit" disabled={loading || otpCode.length < 6}>
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
          <button type="button" style={{ ...ghostButtonStyle, fontSize: '0.8125rem' }} onClick={() => { setOtpStep('email'); setOtpCode(''); setInfo(null) }}>
            ← Use different email
          </button>
        </form>
      )}

      {/* Magic link tab */}
      {tab === 'magic-link' && (
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <button style={primaryButtonStyle} type="submit" disabled={loading || !!info}>
            {loading ? 'Sending…' : info ? 'Link sent ✓' : 'Send magic link'}
          </button>
        </form>
      )}

      {/* Kaappu branding */}
      <div style={{
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--k-border)',
        textAlign: 'center',
      }}>
        <a
          href="https://kaappu.dev"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.75rem',
            color: 'var(--k-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <svg width="14" height="16" viewBox="0 0 20 22" fill="none" style={{ opacity: 0.8 }}>
            <path d="M10 1L2 4.5V10c0 5.25 3.4 10.2 8 11.5 4.6-1.3 8-6.25 8-11.5V4.5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="7" y="9" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8.5 9V7a1.5 1.5 0 0 1 3 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Secured by <strong style={{ fontWeight: 600, color: 'var(--k-text)', opacity: 0.6 }}>Kaappu</strong>
        </a>
      </div>
    </div>
  )
}

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
