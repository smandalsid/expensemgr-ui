import { apiClient } from '../lib/apiClient'
import type { Expense, CreateExpenseRequest } from '../types/expense'

export function getActiveExpenses(): Promise<Expense[]> {
  return apiClient.get<Expense[]>('/expense/get_active')
}

export function createExpense(payload: CreateExpenseRequest): Promise<Expense> {
  return apiClient.post<Expense>('/expense/create', payload as unknown as Record<string, unknown>)
}
