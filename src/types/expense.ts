export interface ExpenseShare {
  secondary_user_key: number
  secondary_user_name: string
  expense_ver_key: number
  expense_share: number
  expense_ver_status: boolean
  version_active_ind: boolean
}

export interface Expense {
  expense_key: number
  primary_user_key: number
  primary_user_name: string
  expense_desc: string
  currency_code: string
  division_by_code: string
  expense_share: ExpenseShare[]
  total_amount: number
}
