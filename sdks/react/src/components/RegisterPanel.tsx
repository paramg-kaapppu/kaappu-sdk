'use client'

import React, { useContext, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuUser, RegisterPanelProps } from '../types'
import {
  buildCssVars, cardStyle, inputStyle, primaryButtonStyle, labelStyle, errorStyle
} from './styles'

export function RegisterPanel({ onSuccess, redirectUrl, logoUrl, appearance, className }: RegisterPanelProps) {
  const ctx = useContext(KaappuContext) as any
  if (!ctx) throw new Error('[Kaappu] <RegisterPanel> must be inside <KaappuProvider>')

  const config = ctx.tenantConfig
  const baseUrl: string = ctx._baseUrl ?? 'http://localhost:9091'
  const accountId = config?.accountId ?? 'default'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'verify'>('form')

  const cssVars = buildCssVars(appearance, config?.branding?.primaryColor)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, accountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(friendlyError(data.error ?? data.code))
        return
      }

      const { accessToken, refreshToken, user } = data.data
      if (accessToken) {
        // Auto sign-in after registration
        ctx._onAuthSuccess?.(accessToken, refreshToken, mapUser(user, accountId))
        onSuccess?.(accessToken, mapUser(user, accountId))
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

  const cssVarsAndCard = { ...cssVars, ...cardStyle }

  if (step === 'verify') {
    return (
      <div style={cssVarsAndCard} className={className}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✉️</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--k-text)' }}>Check your inbox</h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--k-muted)', lineHeight: 1.6 }}>
            We sent a verification link to <strong style={{ color: 'var(--k-text)' }}>{email}</strong>.
            Click the link to activate your account.
          </p>
        </div>
        <KaappuBadge />
      </div>
    )
  }

  return (
    <div style={cssVarsAndCard} className={className}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        {(logoUrl || config?.branding?.logoUrl) && (
          <img src={logoUrl || config?.branding?.logoUrl} alt={config?.branding?.name || ''} style={{ height: '56px', marginBottom: '0.75rem', borderRadius: '0.625rem', display: 'block', margin: '0 auto 0.75rem' }} />
        )}
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: 'var(--k-text)' }}>
          Create your account
        </h2>
      </div>

      {error && <p style={{ ...errorStyle, marginBottom: '0.75rem' }}>{error}</p>}

      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>First name</label>
            <input style={inputStyle} type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" autoComplete="given-name" />
          </div>
          <div>
            <label style={labelStyle}>Last name</label>
            <input style={inputStyle} type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" autoComplete="family-name" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password" />
        </div>
        <button style={primaryButtonStyle} type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.8125rem', color: 'var(--k-muted)' }}>
          By continuing, you agree to the Terms of Service and Privacy Policy.
        </p>
      </form>
      <KaappuBadge />
    </div>
  )
}

function KaappuBadge() {
  return (
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
          gap: '0.4rem',
        }}
      >
        Secured by
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
          <svg width="14" height="16" viewBox="0 0 20 22" fill="none" style={{ opacity: 0.7 }}>
            <path d="M10 1L2 4.5V10c0 5.25 3.4 10.2 8 11.5 4.6-1.3 8-6.25 8-11.5V4.5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <rect x="7" y="9" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8.5 9V7a1.5 1.5 0 0 1 3 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <strong style={{ fontWeight: 700, color: 'var(--k-text)', opacity: 0.5, fontFamily: 'Georgia, "Palatino Linotype", "Book Antiqua", serif', fontSize: '0.8125rem', letterSpacing: '0.03em' }}>Kaappu</strong>
        </span>
      </a>
    </div>
  )
}

function mapUser(raw: any, accountId: string): KaappuUser {
  return {
    id: raw.id ?? raw.userId,
    email: raw.email,
    firstName: raw.firstName,
    lastName: raw.lastName,
    accountId: raw.accountId ?? accountId,
    sessionId: raw.sessionId ?? '',
    roles: raw.roles ?? [],
    permissions: raw.permissions ?? [],
  }
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    email_already_exists: 'An account with this email already exists.',
    password_breached: 'This password was found in a data breach. Please choose a different one.',
    email_domain_not_allowed: 'Sign-ups from this email domain are not allowed.',
    email_blocked: 'This email address cannot be used.',
    bot_protection_failed: 'Bot protection check failed. Please try again.',
    weak_password: 'Password is too weak. Use at least 8 characters.',
  }
  return map[code] ?? code ?? 'Registration failed. Please try again.'
}
