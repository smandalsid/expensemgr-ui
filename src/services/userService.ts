import { apiClient } from '../lib/apiClient'
import type { User } from '../types/user'

export function getUser(): Promise<User> {
  return apiClient.get<User>('/users/')
}

export interface UserSummary {
  username: string
  user_key: number
}

export function getAllUsers(): Promise<UserSummary[]> {
  return apiClient.get<UserSummary[]>('/users/get_all')
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
  reenter_password: string
}

export function changePassword(payload: ChangePasswordPayload): Promise<{ detail: string }> {
  const params = new URLSearchParams({
    old_password: payload.old_password,
    new_password: payload.new_password,
    reenter_password: payload.reenter_password,
  })
  return apiClient.put<{ detail: string }>(`/users/change_password?${params.toString()}`)
}
