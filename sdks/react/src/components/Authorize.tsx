'use client'

import React from 'react'
import { useKaappu } from '../context/KaappuContext'

// ── <LoggedIn> ───────────────────────────────────────────────────────────────

interface LoggedInProps {
  children: React.ReactNode
  /** Rendered while auth state is loading */
  fallback?: React.ReactNode
}

/**
 * Renders children only when the user is signed in.
 *
 * @example
 * <LoggedIn fallback={<Spinner />}>
 *   <UserMenu />
 * </LoggedIn>
 */
export function LoggedIn({ children, fallback = null }: LoggedInProps) {
  const { isLoaded, isSignedIn } = useKaappu()
  if (!isLoaded) return <>{fallback}</>
  if (!isSignedIn) return null
  return <>{children}</>
}

// ── <LoggedOut> ──────────────────────────────────────────────────────────────

interface LoggedOutProps {
  children: React.ReactNode
  /** Rendered while auth state is loading */
  fallback?: React.ReactNode
}

/**
 * Renders children only when the user is NOT signed in.
 *
 * @example
 * <LoggedOut>
 *   <a href="/sign-in">Sign in</a>
 * </LoggedOut>
 */
export function LoggedOut({ children, fallback = null }: LoggedOutProps) {
  const { isLoaded, isSignedIn } = useKaappu()
  if (!isLoaded) return <>{fallback}</>
  if (isSignedIn) return null
  return <>{children}</>
}

// ── <Authorize> ──────────────────────────────────────────────────────────────

interface AuthorizeProps {
  children: React.ReactNode
  /**
   * Required permission string (e.g. "billing:manage", "users:read").
   * Uses client-side permission list from the user's session.
   * The wildcard permission "*" grants access to everything.
   */
  permission?: string
  /**
   * Required role name (e.g. "admin", "owner").
   * Checked against user.roles[].
   */
  role?: string
  /** Rendered when the user lacks the required permission/role */
  fallback?: React.ReactNode
  /** Rendered while auth state is loading */
  loading?: React.ReactNode
}

/**
 * Conditionally renders children based on the user's permissions or role.
 * Combines with <LoggedIn> semantics — unauthenticated users see fallback.
 *
 * @example
 * // Permission-gated
 * <Authorize permission="billing:manage" fallback={<p>Upgrade to access billing.</p>}>
 *   <BillingPanel />
 * </Authorize>
 *
 * // Role-gated
 * <Authorize role="admin">
 *   <AdminTools />
 * </Authorize>
 *
 * // Combine both (user must have BOTH)
 * <Authorize role="admin" permission="users:delete">
 *   <DangerZone />
 * </Authorize>
 */
export function Authorize({
  children,
  permission,
  role,
  fallback = null,
  loading = null,
}: AuthorizeProps) {
  const { isLoaded, isSignedIn, user, hasPermission } = useKaappu()

  if (!isLoaded) return <>{loading}</>
  if (!isSignedIn || !user) return <>{fallback}</>

  // Permission check
  if (permission && !hasPermission(permission)) return <>{fallback}</>

  // Role check
  if (role) {
    const userRoles = user.roles ?? []
    if (!userRoles.includes(role) && !userRoles.includes('super_admin')) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
