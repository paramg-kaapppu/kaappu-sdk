'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { KaappuContextValue, KaappuProviderProps, KaappuTenantConfig, KaappuUser } from '../types'
import { KaappuContext } from './KaappuContext'

const TOKEN_KEY = 'kaappu_token'
const REFRESH_KEY = 'kaappu_refresh'
const USER_KEY = 'kaappu_user'

// Refresh the access token 60 seconds before it expires (tokens are 15 min = 900s)
const REFRESH_BEFORE_EXPIRY_MS = 60_000

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return Date.now() >= payload.exp * 1000
}

function getTokenExpiryMs(token: string): number {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return 0
  return payload.exp * 1000 - Date.now()
}

export function KaappuProvider({
  publishableKey,
  baseUrl = 'http://localhost:9091',
  signInUrl = '/sign-in',
  signUpUrl = '/sign-up',
  children,
}: KaappuProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<KaappuUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tenantConfig, setTenantConfig] = useState<KaappuTenantConfig | null>(null)

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch tenant config on mount
  useEffect(() => {
    fetch(`${baseUrl}/api/v1/accounts/config?pk=${publishableKey}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.data) setTenantConfig(data.data) })
      .catch(() => {})
  }, [publishableKey, baseUrl])

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = getStoredToken()
    const storedUser = localStorage.getItem(USER_KEY)

    if (storedToken && !isTokenExpired(storedToken)) {
      setAccessToken(storedToken)
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)) } catch {}
      }
      setIsSignedIn(true)
      scheduleRefresh(storedToken)
    } else if (storedToken && isTokenExpired(storedToken)) {
      // Attempt silent refresh
      silentRefresh().finally(() => setIsLoaded(true))
      return
    }
    setIsLoaded(true)
  }, [])

  function scheduleRefresh(token: string) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const msUntilRefresh = Math.max(getTokenExpiryMs(token) - REFRESH_BEFORE_EXPIRY_MS, 0)
    refreshTimerRef.current = setTimeout(() => silentRefresh(), msUntilRefresh)
  }

  async function silentRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) {
      clearSession()
      return null
    }
    try {
      const res = await fetch(`${baseUrl}/api/v1/idm/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) { clearSession(); return null }
      const data = await res.json()
      const newToken = data.data?.accessToken
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken)
        setAccessToken(newToken)
        scheduleRefresh(newToken)
        return newToken
      }
      clearSession()
      return null
    } catch {
      clearSession()
      return null
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    setAccessToken(null)
    setUser(null)
    setIsSignedIn(false)
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
  }

  const signOut = useCallback(async () => {
    const token = getStoredToken()
    if (token) {
      await fetch(`${baseUrl}/api/v1/idm/auth/sign-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    clearSession()
  }, [baseUrl])

  const getToken = useCallback(async (): Promise<string | null> => {
    const stored = getStoredToken()
    if (stored && !isTokenExpired(stored)) return stored
    return silentRefresh()
  }, [baseUrl])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user?.permissions) return false
    return user.permissions.includes('*') || user.permissions.includes(permission)
  }, [user])

  /** Called by LoginPanel/RegisterPanel on successful auth */
  function onAuthSuccess(token: string, refreshToken: string, userData: KaappuUser) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REFRESH_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
    setAccessToken(token)
    setUser(userData)
    setIsSignedIn(true)
    scheduleRefresh(token)
  }

  const contextValue: KaappuContextValue & { _onAuthSuccess?: typeof onAuthSuccess; _baseUrl?: string } = {
    isLoaded,
    isSignedIn,
    user,
    accessToken,
    tenantConfig,
    signOut,
    getToken,
    hasPermission,
    // Internal — used by LoginPanel/RegisterPanel without exposing in public types
    _onAuthSuccess: onAuthSuccess,
    _baseUrl: baseUrl,
  }

  return (
    <KaappuContext.Provider value={contextValue}>
      {children}
    </KaappuContext.Provider>
  )
}
