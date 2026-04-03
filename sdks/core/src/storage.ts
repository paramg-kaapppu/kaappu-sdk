/**
 * Framework-agnostic token storage.
 * Uses localStorage in browser, can be replaced with custom storage for SSR/native.
 */

export interface TokenStorage {
  getToken(): string | null
  setToken(token: string): void
  getRefreshToken(): string | null
  setRefreshToken(token: string): void
  getUser<T>(): T | null
  setUser<T>(user: T): void
  clear(): void
}

const TOKEN_KEY = 'kaappu_token'
const REFRESH_KEY = 'kaappu_refresh'
const USER_KEY = 'kaappu_user'

/** Default browser localStorage-based token storage */
export class BrowserTokenStorage implements TokenStorage {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }
  setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_KEY, token)
  }
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_KEY)
  }
  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(REFRESH_KEY, token)
  }
  getUser<T>(): T | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    try { return JSON.parse(stored) } catch { return null }
  }
  setUser<T>(user: T): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
  clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

/** In-memory token storage — useful for testing or server-side */
export class MemoryTokenStorage implements TokenStorage {
  private token: string | null = null
  private refreshToken: string | null = null
  private user: unknown = null

  getToken() { return this.token }
  setToken(token: string) { this.token = token }
  getRefreshToken() { return this.refreshToken }
  setRefreshToken(token: string) { this.refreshToken = token }
  getUser<T>() { return this.user as T | null }
  setUser<T>(user: T) { this.user = user }
  clear() { this.token = null; this.refreshToken = null; this.user = null }
}
