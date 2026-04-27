'use client'

import React, { useCallback, useContext, useEffect, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuAppearance } from '../types'
import {
  buildThemeVars, cardStyle, inputStyle, primaryButtonStyle,
  ghostButtonStyle, labelStyle, errorStyle,
} from '../theme'

export interface AccountViewProps {
  /** Appearance overrides */
  appearance?: KaappuAppearance
  /** Custom CSS class for the wrapper */
  className?: string
}

type Tab = 'profile' | 'security' | 'sessions' | 'passkeys'

interface Session {
  id: string
  ipAddress?: string
  userAgent?: string
  createdAt?: string
  current?: boolean
}

interface Passkey {
  id: string
  credentialId: string
  name?: string
  createdAt?: string
  aaguid?: string
}

/**
 * <AccountView /> — full embeddable profile + security management component.
 *
 * Tabs:
 * - Profile   — display name editing
 * - Security  — TOTP MFA enrollment/status, password change
 * - Sessions  — active session list with individual revoke
 * - Passkeys  — registered passkey list with delete
 *
 * @example
 * // app/account/page.tsx
 * import { AccountView } from '@kaappu/react'
 * export default function AccountPage() {
 *   return <AccountView />
 * }
 */
export function AccountView({ appearance, className }: AccountViewProps) {
  const ctx = useContext(KaappuContext) as any
  if (!ctx) throw new Error('[Kaappu] <AccountView> must be inside <KaappuProvider>')

  const { user, isLoaded, isSignedIn, tenantConfig, getToken } = ctx
  const baseUrl: string = ctx._baseUrl ?? 'http://localhost:9091'

  const [tab, setTab] = useState<Tab>('profile')

  if (!isLoaded) return <Skeleton />
  if (!isSignedIn || !user) return null

  const themeVars = buildThemeVars(appearance, tenantConfig?.branding?.primaryColor)
  const accountId = user.accountId ?? 'default'

  return (
    <div style={{ ...themeVars, fontFamily: 'var(--k-font)', color: 'var(--k-text)', width: '100%' }} className={className}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--k-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {(['profile', 'security', 'sessions', 'passkeys'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.625rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--k-primary)' : '2px solid transparent',
              color: tab === t ? 'var(--k-text)' : 'var(--k-muted)',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'var(--k-font)',
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile'  && <ProfileTab user={user} baseUrl={baseUrl} accountId={accountId} getToken={getToken} />}
      {tab === 'security' && <SecurityTab user={user} baseUrl={baseUrl} accountId={accountId} getToken={getToken} />}
      {tab === 'sessions' && <SessionsTab baseUrl={baseUrl} accountId={accountId} getToken={getToken} currentSessionId={user.sessionId} />}
      {tab === 'passkeys' && <PasskeysTab baseUrl={baseUrl} accountId={accountId} getToken={getToken} />}
    </div>
  )
}

// ── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user, baseUrl, accountId, getToken }: any) {
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName]   = useState(user.lastName ?? '')
  const [phoneNumber, setPhoneNumber] = useState((user as any).phoneNumber ?? '')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}/api/v1/idm/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstName, lastName }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Failed to save changes')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setError('Unable to connect.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <SectionTitle>Personal information</SectionTitle>

      {/* Read-only email */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Email address</label>
        <div style={{ ...inputStyle, color: 'var(--k-muted)', cursor: 'default', userSelect: 'text' as const }}>
          {user.email}
          {user.emailVerified && (
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>✓ Verified</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>First name</label>
            <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
          </div>
          <div>
            <label style={labelStyle}>Last name</label>
            <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Phone number</label>
          <input style={inputStyle} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1 (555) 000-0000" type="tel" />
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <button style={{ ...primaryButtonStyle, maxWidth: '160px' }} type="submit" disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

// ── Security tab ─────────────────────────────────────────────────────────────

function SecurityTab({ user, baseUrl, accountId, getToken }: any) {
  const [pwOld, setPwOld]       = useState('')
  const [pwNew, setPwNew]       = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError]   = useState<string | null>(null)
  const [pwDone, setPwDone]     = useState(false)

  // TOTP
  const [totpUri, setTotpUri]   = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpStep, setTotpStep] = useState<'idle' | 'enroll' | 'confirm' | 'done'>('idle')
  const [totpError, setTotpError] = useState<string | null>(null)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: pwOld, newPassword: pwNew, accountId }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setPwError(d.error ?? 'Failed to change password') }
      else { setPwDone(true); setPwOld(''); setPwNew('') }
    } catch {
      setPwError('Unable to connect.')
    } finally {
      setPwSaving(false)
    }
  }

  async function startTotpEnroll() {
    setTotpError(null)
    const token = await getToken()
    const res = await fetch(`${baseUrl}/api/v1/idm/auth/totp/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ accountId }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok && d.data?.uri) {
      setTotpUri(d.data.uri)
      setTotpStep('enroll')
    } else {
      setTotpError(d.error ?? 'Failed to start TOTP enrollment')
    }
  }

  async function confirmTotp(e: React.FormEvent) {
    e.preventDefault()
    setTotpError(null)
    const token = await getToken()
    const res = await fetch(`${baseUrl}/api/v1/idm/auth/totp/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ code: totpCode, accountId }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { setTotpStep('done') }
    else { setTotpError(d.error ?? 'Invalid code') }
  }

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Password change */}
      <section>
        <SectionTitle>Change password</SectionTitle>
        {pwDone ? (
          <p style={{ color: '#34d399', fontSize: '0.875rem' }}>Password updated successfully.</p>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Current password</label>
              <input style={inputStyle} type="password" value={pwOld} onChange={e => setPwOld(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div>
              <label style={labelStyle}>New password</label>
              <input style={inputStyle} type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} required minLength={8} placeholder="Min. 8 characters" autoComplete="new-password" />
            </div>
            {pwError && <p style={errorStyle}>{pwError}</p>}
            <button style={{ ...primaryButtonStyle, maxWidth: '180px' }} type="submit" disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </section>

      {/* TOTP MFA */}
      <section>
        <SectionTitle>Authenticator app (TOTP)</SectionTitle>

        {user.mfaEnabled && totpStep !== 'done' && (
          <StatusBadge color="#34d399">MFA enabled</StatusBadge>
        )}

        {!user.mfaEnabled && totpStep === 'idle' && (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
              Add an extra layer of security by requiring a code from your authenticator app at sign-in.
            </p>
            {totpError && <p style={errorStyle}>{totpError}</p>}
            <button style={{ ...ghostButtonStyle, maxWidth: '200px' }} onClick={startTotpEnroll}>
              Set up authenticator
            </button>
          </>
        )}

        {totpStep === 'enroll' && totpUri && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)', lineHeight: 1.6 }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.),
              then enter the 6-digit code to confirm.
            </p>
            <QrCode uri={totpUri} />
            <form onSubmit={confirmTotp} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '240px' }}>
              <div>
                <label style={labelStyle}>Verification code</label>
                <input
                  style={{ ...inputStyle, letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.125rem' }}
                  type="text" inputMode="numeric" maxLength={6}
                  value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000" required
                />
              </div>
              {totpError && <p style={errorStyle}>{totpError}</p>}
              <button style={primaryButtonStyle} type="submit" disabled={totpCode.length < 6}>
                Verify &amp; enable
              </button>
            </form>
          </div>
        )}

        {totpStep === 'done' && (
          <StatusBadge color="#34d399">Authenticator app enabled ✓</StatusBadge>
        )}
      </section>
    </div>
  )
}

// ── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ baseUrl, accountId, getToken, currentSessionId }: any) {
  const [sessions, setSessions]   = useState<Session[]>([])
  const [loading, setLoading]     = useState(true)
  const [revoking, setRevoking]   = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}/api/v1/idm/sessions?accountId=${accountId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const d = await res.json().catch(() => ({}))
      setSessions(Array.isArray(d.data) ? d.data : [])
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [baseUrl, accountId, getToken])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function handleRevoke(sessionId: string) {
    setRevoking(sessionId)
    try {
      const token = await getToken()
      await fetch(`${baseUrl}/api/v1/idm/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setSessions(s => s.filter(x => x.id !== sessionId))
    } finally {
      setRevoking(null)
    }
  }

  if (loading) return <Skeleton rows={3} />

  return (
    <div style={{ maxWidth: '560px' }}>
      <SectionTitle>Active sessions</SectionTitle>
      <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        These devices are currently signed into your account.
      </p>

      {sessions.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)' }}>No active sessions found.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {sessions.map(s => {
          const isCurrent = s.id === currentSessionId
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.875rem 1rem',
                background: 'var(--k-hover)',
                border: `1px solid ${isCurrent ? 'var(--k-primary)' : 'var(--k-border)'}`,
                borderRadius: 'calc(var(--k-radius) * 0.6)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--k-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.ipAddress ?? 'Unknown IP'}
                  </span>
                  {isCurrent && <StatusBadge color="var(--k-primary)" inline>Current</StatusBadge>}
                </div>
                {s.userAgent && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--k-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {parseUserAgent(s.userAgent)}
                  </div>
                )}
                {s.createdAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--k-muted)', marginTop: '0.125rem' }}>
                    Started {formatDate(s.createdAt)}
                  </div>
                )}
              </div>

              {!isCurrent && (
                <button
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.35)',
                    borderRadius: 'calc(var(--k-radius) * 0.5)',
                    color: '#ef4444',
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--k-font)',
                    flexShrink: 0,
                  }}
                  disabled={revoking === s.id}
                  onClick={() => handleRevoke(s.id)}
                >
                  {revoking === s.id ? 'Revoking…' : 'Revoke'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Passkeys tab ─────────────────────────────────────────────────────────────

function PasskeysTab({ baseUrl, accountId, getToken }: any) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [regStatus, setRegStatus] = useState<string | null>(null)

  const loadPasskeys = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/passkey/credentials?accountId=${accountId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const d = await res.json().catch(() => ({}))
      setPasskeys(Array.isArray(d.data) ? d.data : [])
    } catch {
      setPasskeys([])
    } finally {
      setLoading(false)
    }
  }, [baseUrl, accountId, getToken])

  useEffect(() => { loadPasskeys() }, [loadPasskeys])

  async function handleDelete(passkeyId: string) {
    setDeleting(passkeyId)
    try {
      const token = await getToken()
      await fetch(`${baseUrl}/api/v1/idm/auth/passkey/credentials/${passkeyId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setPasskeys(p => p.filter(x => x.id !== passkeyId))
    } finally {
      setDeleting(null)
    }
  }

  async function handleRegister() {
    setRegistering(true)
    setRegStatus(null)
    try {
      const { base64urlToBuffer, bufferToBase64url, isWebAuthnSupported } = await import('@kaappu/core')
      if (!isWebAuthnSupported()) throw new Error('WebAuthn is not supported in this browser')

      const token = await getToken()
      const beginRes = await fetch(`${baseUrl}/api/v1/idm/auth/passkey/register/begin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ accountId }),
      })
      const beginData = await beginRes.json()
      if (!beginRes.ok) throw new Error(beginData.error || 'Registration failed')

      const d = beginData.data || beginData
      const challengeId = d.challengeId
      const options = d.options || d

      const pubKeyOptions: PublicKeyCredentialCreationOptions = {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: { ...options.user, id: base64urlToBuffer(options.user.id) },
        excludeCredentials: options.excludeCredentials?.map((c: any) => ({ ...c, id: base64urlToBuffer(c.id) })),
      }

      const credential = await navigator.credentials.create({ publicKey: pubKeyOptions }) as PublicKeyCredential | null
      if (!credential) throw new Error('Registration cancelled')

      const attestation = credential.response as AuthenticatorAttestationResponse
      const completeRes = await fetch(`${baseUrl}/api/v1/idm/auth/passkey/register/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          challengeId,
          credentialId: credential.id,
          attestationObject: bufferToBase64url(attestation.attestationObject),
          clientDataJSON: bufferToBase64url(attestation.clientDataJSON),
        }),
      })
      const completeData = await completeRes.json()
      if (!completeRes.ok) throw new Error(completeData.error || 'Registration failed')

      setRegStatus('Passkey registered successfully!')
      loadPasskeys()
    } catch (err: any) {
      setRegStatus(err.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <Skeleton rows={2} />

  return (
    <div style={{ maxWidth: '560px' }}>
      <SectionTitle>Passkeys</SectionTitle>
      <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Passkeys let you sign in with your device's biometrics or PIN — no password needed.
      </p>

      {passkeys.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--k-muted)' }}>No passkeys registered.</p>
      )}

      <button
        onClick={handleRegister}
        disabled={registering}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1rem', marginBottom: '1rem',
          background: 'var(--k-primary, #6366f1)', color: 'var(--k-primary-fg, #fff)',
          border: 'none', borderRadius: 'calc(var(--k-radius) * 0.6)',
          fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--k-font)', opacity: registering ? 0.7 : 1,
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>🔑</span>
        {registering ? 'Registering…' : 'Add passkey'}
      </button>

      {regStatus && (
        <p style={{
          fontSize: '0.8125rem', marginBottom: '1rem', padding: '0.5rem 0.75rem',
          borderRadius: 'calc(var(--k-radius) * 0.4)',
          background: regStatus.includes('success') ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
          color: regStatus.includes('success') ? '#34d399' : '#ef4444',
          border: `1px solid ${regStatus.includes('success') ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          {regStatus}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {passkeys.map(pk => (
          <div
            key={pk.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '0.875rem 1rem',
              background: 'var(--k-hover)',
              border: '1px solid var(--k-border)',
              borderRadius: 'calc(var(--k-radius) * 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '1.25rem' }}>🔑</span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--k-text)' }}>
                  {pk.name ?? 'Passkey'}
                </div>
                {pk.createdAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--k-muted)', marginTop: '0.125rem' }}>
                    Added {formatDate(pk.createdAt)}
                  </div>
                )}
              </div>
            </div>
            <button
              style={{
                padding: '0.375rem 0.75rem',
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: 'calc(var(--k-radius) * 0.5)',
                color: '#ef4444',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                fontFamily: 'var(--k-font)',
                flexShrink: 0,
              }}
              disabled={deleting === pk.id}
              onClick={() => handleDelete(pk.id)}
            >
              {deleting === pk.id ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--k-text)' }}>
      {children}
    </h3>
  )
}

function StatusBadge({ children, color, inline = false }: { children: React.ReactNode; color: string; inline?: boolean }) {
  return (
    <span style={{
      display: inline ? 'inline-flex' : 'inline-flex',
      alignItems: 'center',
      padding: '0.125rem 0.5rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: 600,
      color,
      background: `${color}22`,
      border: `1px solid ${color}44`,
      marginBottom: inline ? 0 : '0.75rem',
    }}>
      {children}
    </span>
  )
}

function Skeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: '52px', background: 'var(--k-hover)', borderRadius: 'calc(var(--k-radius) * 0.6)', border: '1px solid var(--k-border)' }} />
      ))}
    </div>
  )
}

/** Minimal inline QR code using a data URL via a free API — no npm dep required */
function QrCode({ uri }: { uri: string }) {
  const encoded = encodeURIComponent(uri)
  return (
    <div style={{
      padding: '0.75rem',
      background: '#ffffff',
      borderRadius: 'calc(var(--k-radius) * 0.6)',
      display: 'inline-block',
      lineHeight: 0,
    }}>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encoded}`}
        alt="TOTP QR code"
        width={160}
        height={160}
        style={{ display: 'block' }}
      />
    </div>
  )
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome'))  return `Chrome · ${extractOS(ua)}`
  if (ua.includes('Firefox')) return `Firefox · ${extractOS(ua)}`
  if (ua.includes('Safari'))  return `Safari · ${extractOS(ua)}`
  return ua.slice(0, 60)
}

function extractOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac'))     return 'macOS'
  if (ua.includes('Linux'))   return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown OS'
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}
