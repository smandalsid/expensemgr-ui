import { apiClient } from '../lib/apiClient'
import type { Expense } from '../types/expense'

export function getActiveExpenses(): Promise<Expense[]> {
  return apiClient.get<Expense[]>('/expense/get_active')
}
