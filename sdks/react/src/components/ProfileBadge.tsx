'use client'

import React, { useContext, useEffect, useRef, useState } from 'react'
import { KaappuContext } from '../context/KaappuContext'
import type { KaappuAppearance } from '../types'
import { buildThemeVars } from '../theme'

export interface ProfileBadgeProps {
  /** URL to redirect after sign-out (default: '/sign-in') */
  afterSignOutUrl?: string
  /** URL for "Manage account" link (default: '/account') */
  userProfileUrl?: string
  /** Appearance overrides */
  appearance?: KaappuAppearance
  /** Custom CSS class for the trigger button */
  className?: string
}

/**
 * <ProfileBadge /> — compact avatar + dropdown menu.
 * Shows user's initials (or avatar image) and name.
 * Click opens a dropdown: Manage account, Sign out.
 *
 * @example
 * <ProfileBadge afterSignOutUrl="/sign-in" userProfileUrl="/dashboard/profile" />
 */
export function ProfileBadge({
  afterSignOutUrl = '/sign-in',
  userProfileUrl = '/account',
  appearance,
  className,
}: ProfileBadgeProps) {
  const ctx = useContext(KaappuContext) as any
  if (!ctx) throw new Error('[Kaappu] <ProfileBadge> must be inside <KaappuProvider>')

  const { user, isLoaded, isSignedIn, signOut, tenantConfig } = ctx
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!isLoaded || !isSignedIn || !user) return null

  const themeVars = buildThemeVars(appearance, tenantConfig?.branding?.primaryColor)

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n: string) => n[0].toUpperCase())
    .join('') || user.email[0].toUpperCase()

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    window.location.href = afterSignOutUrl
  }

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-block', ...themeVars, fontFamily: 'var(--k-font)' }}
    >
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={className}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.5rem 0.25rem 0.25rem',
          background: open ? 'var(--k-hover)' : 'transparent',
          border: '1px solid transparent',
          borderRadius: '2rem',
          cursor: 'pointer',
          color: 'var(--k-text)',
          fontFamily: 'var(--k-font)',
          transition: 'background 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget
          el.style.background = 'var(--k-hover)'
          el.style.borderColor = 'var(--k-border)'
        }}
        onMouseLeave={e => {
          if (!open) {
            const el = e.currentTarget
            el.style.background = 'transparent'
            el.style.borderColor = 'transparent'
          }
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: user.avatarUrl ? 'transparent' : 'var(--k-primary)',
            color: 'var(--k-primary-fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8125rem',
            fontWeight: 700,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {/* Name */}
        <span style={{ fontSize: '0.875rem', fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>

        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ color: 'var(--k-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            minWidth: '220px',
            background: 'var(--k-card-bg)',
            border: '1px solid var(--k-border)',
            borderRadius: 'var(--k-radius)',
            boxShadow: 'var(--k-shadow)',
            padding: '0.5rem',
            zIndex: 9999,
          }}
        >
          {/* User info header */}
          <div style={{
            padding: '0.5rem 0.75rem 0.75rem',
            borderBottom: '1px solid var(--k-border)',
            marginBottom: '0.375rem',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--k-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--k-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.125rem' }}>
              {user.email}
            </div>
          </div>

          {/* Menu items */}
          <DropdownItem
            href={userProfileUrl}
            icon="⚙️"
            label="Manage account"
            onClick={() => setOpen(false)}
          />

          <div style={{ height: '1px', background: 'var(--k-border)', margin: '0.375rem 0' }} />

          <DropdownItem
            icon="→"
            label="Sign out"
            onClick={handleSignOut}
            danger
          />
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  href,
  icon,
  label,
  onClick,
  danger = false,
}: {
  href?: string
  icon: string
  label: string
  onClick?: () => void
  danger?: boolean
}) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: 'calc(var(--k-radius) * 0.5)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: danger ? '#ef4444' : 'var(--k-text)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: 'var(--k-font)',
    textAlign: 'left',
    boxSizing: 'border-box',
  }

  const hoverStyle: React.CSSProperties = { background: 'var(--k-hover)' }

  const content = (
    <>
      <span style={{ fontSize: '0.875rem' }}>{icon}</span>
      {label}
    </>
  )

  if (href) {
    return (
      <a
        href={href}
        style={baseStyle}
        role="menuitem"
        onClick={onClick}
        onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      style={baseStyle}
      role="menuitem"
      onClick={onClick}
      onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyle)}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {content}
    </button>
  )
}
