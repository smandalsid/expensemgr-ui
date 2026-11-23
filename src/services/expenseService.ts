import { apiClient } from '../lib/apiClient'
import type { Expense, CreateExpenseRequest, EditExpenseRequest } from '../types/expense'

// Values the API expects for the order_by query parameter.
export const ORDER_BY = { EXPENSE_DT: 0, LAST_UPDATED: 1 } as const
export type ExpenseOrderBy = (typeof ORDER_BY)[keyof typeof ORDER_BY]

export function getActiveExpenses(orderBy: ExpenseOrderBy = ORDER_BY.EXPENSE_DT): Promise<Expense[]> {
  return apiClient.get<Expense[]>(`/expense/get_active?order_by=${orderBy}`)
}

export function getAllExpenses(orderBy: ExpenseOrderBy = ORDER_BY.EXPENSE_DT): Promise<Expense[]> {
  return apiClient.get<Expense[]>(`/expense/get_all?order_by=${orderBy}`)
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

export function settleExpense(expenseVerKey: number): Promise<void> {
  return apiClient.put<void>(`/expense/settle?expense_ver_key=${expenseVerKey}`)
}

export function deleteExpense(expenseKey: number): Promise<void> {
  return apiClient.delete<void>(`/expense/delete?expense_key=${expenseKey}`)
}

export function editExpense(payload: EditExpenseRequest): Promise<Expense> {
  return apiClient.put<Expense>('/expense/edit', payload as unknown as Record<string, unknown>)
}
