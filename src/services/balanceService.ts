import { apiClient } from '../lib/apiClient'
import type { UserBalance } from '../types/balance'

export function getAllBalances(): Promise<UserBalance[]> {
  return apiClient.get<UserBalance[]>('/aggregate/get_all')
}

// Settles every open expense share the current user has with the given user in one call.
export function settleWithUser(userKey: number): Promise<void> {
  return apiClient.put<void>(`/aggregate/settle?settle_with_user_key=${userKey}`)
}
