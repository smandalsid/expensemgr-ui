import { apiClient } from '../lib/apiClient'

export interface TokenResponse {
  access_token: string
  token_type: string
}

/**
 * POST /auth/token
 *
 * The backend expects OAuth2 password-flow form-encoded credentials.
 */
export async function login(username: string, password: string): Promise<TokenResponse> {
  return apiClient.postForm<TokenResponse>('/auth/token', {
    username,
    password,
    grant_type: 'password',
  })
}

export interface RegisterPayload {
  username: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  password: string
  retyped_password: string
}

/**
 * POST /auth
 *
 * Creates a new user account.
 */
export async function register(payload: RegisterPayload): Promise<void> {
  return apiClient.post<void>('/auth', payload as unknown as Record<string, unknown>)
}
