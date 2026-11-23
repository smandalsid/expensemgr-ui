import { ORDER_BY } from '../services/expenseService'
import type { ExpenseOrderBy } from '../services/expenseService'

const OPTIONS: { value: ExpenseOrderBy; label: string }[] = [
  { value: ORDER_BY.EXPENSE_DT, label: 'Expense date' },
  { value: ORDER_BY.LAST_UPDATED, label: 'Last updated' },
]

export default function ExpenseSortToggle({ value, onChange }: {
  value: ExpenseOrderBy
  onChange: (next: ExpenseOrderBy) => void
}) {
  return (
    <div className="sort-toggle" role="group" aria-label="Sort expenses by">
      <span className="sort-toggle-label">Sort by</span>
      <div className="hist-filters">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`hist-chip${value === opt.value ? ' active' : ''}`}
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
