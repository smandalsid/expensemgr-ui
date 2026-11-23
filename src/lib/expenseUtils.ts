import type { Expense } from '../types/expense'

// For a given expense, compute how it relates to the current user.
// Settled shares (expense_ver_status === true) are excluded from outstanding amounts.
export function getMyFinancials(expense: Expense, userKey: number) {
  const isPayer = expense.primary_user_key === userKey
  const myEntry = expense.expense_share.find(s => s.secondary_user_key === userKey)

  if (isPayer) {
    const owedToMe = expense.expense_share.reduce((sum, s) => {
      if (s.secondary_user_key === userKey || s.expense_ver_status) return sum
      return sum + s.expense_share
    }, 0)
    return { isPayer: true, amount: owedToMe }
  }
  const amount = myEntry && !myEntry.expense_ver_status ? myEntry.expense_share : 0
  return { isPayer: false, amount }
}

// Fallback display name for when the /users profile call fails but expenses load fine.
export function deriveUserName(expenses: Expense[], userKey: number | null) {
  if (userKey === null) return ''
  for (const exp of expenses) {
    if (exp.primary_user_key === userKey) return exp.primary_user_name
    const share = exp.expense_share.find(s => s.secondary_user_key === userKey)
    if (share) return share.secondary_user_name
  }
  return ''
}

// Derives expense-level Created/Updated timestamps from the shares —
// earliest creation and latest change across all versions of the expense.
export function getExpenseTimestamps(expense: Expense) {
  const shares = expense.expense_share
  if (shares.length === 0) return { created: null, updated: null }
  let created = shares[0].meta_created_dttm
  let updated = shares[0].meta_changed_dttm
  for (const s of shares) {
    if (new Date(s.meta_created_dttm) < new Date(created)) created = s.meta_created_dttm
    if (new Date(s.meta_changed_dttm) > new Date(updated)) updated = s.meta_changed_dttm
  }
  return { created, updated }
}
