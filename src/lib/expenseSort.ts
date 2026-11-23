import { useCallback, useState } from 'react'
import { ORDER_BY } from '../services/expenseService'
import type { ExpenseOrderBy } from '../services/expenseService'

const STORAGE_KEY = 'expenseSort:v1'

function readStored(): ExpenseOrderBy {
  try {
    return localStorage.getItem(STORAGE_KEY) === String(ORDER_BY.LAST_UPDATED)
      ? ORDER_BY.LAST_UPDATED
      : ORDER_BY.EXPENSE_DT
  } catch {
    return ORDER_BY.EXPENSE_DT
  }
}

// Sort choice shared by Home and History; defaults to expense date until the user changes it.
export function useExpenseSort() {
  const [orderBy, setOrderByState] = useState<ExpenseOrderBy>(readStored)

  const setOrderBy = useCallback((next: ExpenseOrderBy) => {
    setOrderByState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this page only.
    }
  }, [])

  return [orderBy, setOrderBy] as const
}
