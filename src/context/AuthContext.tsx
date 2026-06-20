import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types/user'
import { getUser } from '../services/userService'
import { ApiError, configureAuth } from '../lib/apiClient'
import { login } from '../services/authService'

interface AuthContextValue {
  token: string | null
  user: User | null
  /** user_key decoded directly from the JWT — available immediately, no API round-trip */
  tokenUserKey: number | null
  userLoading: boolean
  isAuthenticated: boolean
  saveToken: (token: string) => void
  clearToken: () => void
  /**
   * Persist credentials in memory (never written to storage) so that the
   * apiClient can silently re-fetch a new access-token when the current one
   * expires.  Call this immediately after a successful login.
   */
  storeCredentials: (username: string, password: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'access_token'

/** Decode the JWT payload and return user_key without any signature verification. */
function parseUserKeyFromToken(token: string): number | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return typeof payload.user_key === 'number' ? payload.user_key : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  )
  const [user, setUser] = useState<User | null>(null)
  // Start as loading if a token already exists in storage (page refresh case)
  const [userLoading, setUserLoading] = useState<boolean>(
    () => !!localStorage.getItem(TOKEN_KEY),
  )
  // Credentials are kept in memory only — never written to any storage.
  // They are used to silently re-fetch a new token when the current one expires.
  // Lost on page refresh: if that happens the 401 handler will sign the user out.
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null)

  // Synchronously derived from the token — always available when logged in
  const tokenUserKey = useMemo(
    () => (token ? parseUserKeyFromToken(token) : null),
    [token],
  )

  // Whenever token changes, (re-)fetch the user profile
  useEffect(() => {
    if (!token) {
      setUser(null)
      setUserLoading(false)
      return
    }
    let cancelled = false
    setUserLoading(true)
    getUser()
      .then(u => { if (!cancelled) setUser(u) })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            // Token is genuinely expired or invalid — sign out
            localStorage.removeItem(TOKEN_KEY)
            setToken(null)
          } else {
            // Network error or other transient failure — keep the session
            // alive and just leave user as null; HomePage handles it.
            setUser(null)
          }
        }
      })
      .finally(() => { if (!cancelled) setUserLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const saveToken = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
  }, [])

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setCredentials(null)
  }, [])

  const storeCredentials = useCallback((username: string, password: string) => {
    setCredentials({ username, password })
  }, [])

  // Re-fetches a fresh access-token using the in-memory credentials.
  // Returns null (instead of throwing) so apiClient can decide how to proceed.
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!credentials) return null
    try {
      const resp = await login(credentials.username, credentials.password)
      localStorage.setItem(TOKEN_KEY, resp.access_token)
      setToken(resp.access_token)
      return resp.access_token
    } catch {
      return null
    }
  }, [credentials])

  // Keep apiClient in sync whenever the refresh / clear functions change.
  useEffect(() => {
    configureAuth(refreshToken, clearToken)
  }, [refreshToken, clearToken])

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, tokenUserKey, userLoading, isAuthenticated: token !== null, saveToken, clearToken, storeCredentials }),
    [token, user, tokenUserKey, userLoading, saveToken, clearToken, storeCredentials],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
