import { apiClient } from '../lib/apiClient'
import type { Expense, CreateExpenseRequest } from '../types/expense'

export function getActiveExpenses(): Promise<Expense[]> {
  return apiClient.get<Expense[]>('/expense/get_active')
}

export function createExpense(payload: CreateExpenseRequest): Promise<Expense> {
  return apiClient.post<Expense>('/expense/create', payload as unknown as Record<string, unknown>)
}

export interface DivisionMethod {
  division_by_key: number
  division_by_code: string
}

export function getAllDivisionMethods(): Promise<DivisionMethod[]> {
  return apiClient.get<DivisionMethod[]>('/divide_by/get_all')
}
