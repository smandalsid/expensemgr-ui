const BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const BYPASS_KEY = import.meta.env.VITE_VERCEL_BYPASS_KEY as string | undefined

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Auth callbacks ───────────────────────────────────────────────────────────
// Injected by AuthContext so that apiClient stays framework-agnostic.
let _refreshFn: (() => Promise<string | null>) | null = null
let _clearFn: (() => void) | null = null

/**
 * Wire up automatic token-refresh behaviour.
 * Call this once from AuthContext (via useEffect) after the user logs in.
 *
 * @param refreshFn  Re-fetches a fresh access-token; returns null on failure.
 * @param clearFn    Clears the session (called when refresh also fails).
 */
export function configureAuth(
  refreshFn: () => Promise<string | null>,
  clearFn: () => void,
): void {
  _refreshFn = refreshFn
  _clearFn = clearFn
}
// ────────────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | URLSearchParams | string
  /** When true the body is sent as application/x-www-form-urlencoded */
  formEncoded?: boolean
}

async function request<T>(
  path: string,
  { formEncoded, body, headers: extraHeaders, ...init }: RequestOptions = {},
  _isRetry = false,
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(BYPASS_KEY ? { 'x-vercel-protection-bypass': BYPASS_KEY } : {}),
    ...(extraHeaders as Record<string, string>),
  }

  let fetchBody: BodyInit | undefined

  if (body !== undefined) {
    if (formEncoded) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      fetchBody =
        body instanceof URLSearchParams
          ? body
          : new URLSearchParams(body as Record<string, string>)
    } else {
      headers['Content-Type'] = 'application/json'
      fetchBody = typeof body === 'string' ? body : JSON.stringify(body)
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    body: fetchBody,
  })

  // ── Automatic token refresh on 401 ────────────────────────────────────────
  // Only attempt once (_isRetry guard) and only when a refresh function has
  // been configured (i.e. the user is actively logged in with credentials in
  // memory). If refresh succeeds the original request is retried with the new
  // token. If it fails the session is cleared and a descriptive error is thrown.
  if (response.status === 401 && !_isRetry && _refreshFn) {
    let newToken: string | null = null
    try {
      newToken = await _refreshFn()
    } catch {
      // refresh request itself failed — fall through to sign-out
    }

    if (newToken) {
      // getToken() will now return the new token written by _refreshFn
      return request<T>(
        path,
        { formEncoded, body, headers: extraHeaders, ...init },
        true,
      )
    }

    // Refresh failed (no credentials in memory or server rejected them)
    _clearFn?.()
    throw new ApiError(401, 'Session expired. Please log in again.')
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`
    try {
      const err = await response.json()
      if (err?.detail) {
        message =
          typeof err.detail === 'string'
            ? err.detail
            : (err.detail as Array<{ msg: string }>)
                .map((d) => d.msg)
                .join(', ')
      }
    } catch {
      // ignore parse errors — keep the default message above
    }
    throw new ApiError(response.status, message)
  }

  // 204 No Content
  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: RequestOptions['body'], opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  postForm: <T>(path: string, body: Record<string, string>, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body, formEncoded: true }),

  put: <T>(path: string, body?: RequestOptions['body'], opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body?: RequestOptions['body'], opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
}
