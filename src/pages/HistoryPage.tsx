import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllExpenses, ORDER_BY } from '../services/expenseService'
import type { ExpenseOrderBy } from '../services/expenseService'
import { useExpenseSort } from '../lib/expenseSort'
import ExpenseSortToggle from '../components/ExpenseSortToggle'
import { getMyFinancials, getExpenseTimestamps, deriveUserName } from '../lib/expenseUtils'
import { avatarStyle, formatAmount, formatDate, formatDateTime, initials, parseBackendDate, parseDateOnly } from '../lib/format'
import AppShell from '../components/AppShell'
import type { AppView } from '../components/AppShell'
import type { Expense } from '../types/expense'

type StatusFilter = 'all' | 'pending' | 'settled'

interface HistoryEntry {
  expense: Expense
  created: string | null
  updated: string | null
  createdMs: number
  dateMs: number
  updatedMs: number
  /** Timestamp the list is currently sorted and grouped by. */
  sortMs: number
  isPayer: boolean
  amount: number
  settled: boolean
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'settled', label: 'Settled' },
]

const MONTH_FORMAT = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const DAY_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' })

function monthLabel(ms: number) {
  return ms > 0 ? MONTH_FORMAT.format(new Date(ms)) : 'Undated'
}

// ─── Row ───────────────────────────────────────────────────────────────────

const HistoryRow = memo(function HistoryRow({ entry, userKey, expanded, onToggle, dateTitle }: {
  entry: HistoryEntry
  userKey: number
  expanded: boolean
  onToggle: (expenseKey: number) => void
  dateTitle: string
}) {
  const { expense, isPayer, amount, settled, sortMs } = entry
  const currency = expense.currency_code
  const tone = settled ? 'settled' : isPayer ? 'green' : 'red'
  const panelId = `hist-panel-${expense.expense_key}`
  const divisionLabel = expense.division_by_code === 'AMOUNT' ? 'Split by amount' : expense.division_by_code

  return (
    <article className={`hist-row ${tone}${expanded ? ' open' : ''}`}>
      <button
        type="button"
        className="hist-row-head"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onToggle(expense.expense_key)}
      >
        <span className="hist-row-date" title={dateTitle}>
          {sortMs > 0 ? DAY_FORMAT.format(new Date(sortMs)) : '—'}
        </span>
        <span className="hist-row-main">
          <span className="hist-row-desc">{expense.expense_desc}</span>
          <span className="hist-row-sub">
            {isPayer ? 'You paid' : `Paid by ${expense.primary_user_name}`}
          </span>
        </span>
        <span className="hist-row-figures">
          <span className="hist-row-total">{formatAmount(expense.total_amount, currency)}</span>
          <span className={`hist-pill ${tone}`}>
            {settled
              ? 'Settled'
              : isPayer
                ? `You're owed ${formatAmount(amount, currency)}`
                : `You owe ${formatAmount(amount, currency)}`}
          </span>
        </span>
        <svg className="hist-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="hist-detail" id={panelId}>
          <div className="expense-meta-row">
            <span className="expense-badge currency">{currency}</span>
            <span className="expense-badge currency">{divisionLabel}</span>
          </div>
          <div className="expense-timestamps-row">
            <span className="expense-timestamp">Expense date: {formatDate(expense.expense_dt)}</span>
            <span className="expense-timestamp">Created: {formatDateTime(entry.created)}</span>
            <span className="expense-timestamp">Updated: {formatDateTime(entry.updated)}</span>
          </div>
          <hr className="expense-divider" />
          <p className="expense-participants-label">Participants</p>
          {expense.expense_share.map(share => {
            const av = avatarStyle(share.secondary_user_key)
            const isMe = share.secondary_user_key === userKey
            return (
              <div className="participant-row" key={share.expense_ver_key}>
                <div className="participant-avatar" style={{ background: av.bg, color: av.color }}>
                  {initials(share.secondary_user_name)}
                </div>
                <span className="participant-name" style={isMe ? { color: '#c9a96e' } : undefined}>
                  {isMe ? 'You' : share.secondary_user_name}
                </span>
                <span className="participant-share">{formatAmount(share.expense_share, currency)}</span>
                <span className={`participant-status ${share.expense_ver_status ? 'settled' : 'pending'}`}>
                  {share.expense_ver_status ? 'Settled' : 'Pending'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
})

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HistoryPage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { user, tokenUserKey } = useAuth()
  const myKey = user?.user_key ?? tokenUserKey

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [orderBy, setOrderBy] = useExpenseSort()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<number>>(() => new Set())

  const deferredQuery = useDeferredValue(query)

  const fetchHistory = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey(k => k + 1)
  }, [])

  const handleSortChange = useCallback((next: ExpenseOrderBy) => {
    setOrderBy(next)
    setLoading(true)
  }, [setOrderBy])

  useEffect(() => {
    let cancelled = false
    getAllExpenses(orderBy)
      .then(data => { if (!cancelled) setExpenses(data ?? []) })
      .catch(() => { if (!cancelled) setError('Could not load your expense history.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey, orderBy])

  const entries = useMemo<HistoryEntry[]>(() => {
    if (myKey === null) return []
    return expenses
      .map(expense => {
        const { created, updated } = getExpenseTimestamps(expense)
        const { isPayer, amount } = getMyFinancials(expense, myKey)
        const createdMs = parseBackendDate(created)?.getTime() ?? 0
        const updatedMs = parseBackendDate(updated)?.getTime() ?? 0
        const dateMs = parseDateOnly(expense.expense_dt)?.getTime() ?? 0
        return {
          expense,
          created,
          updated,
          createdMs,
          dateMs,
          updatedMs,
          sortMs: orderBy === ORDER_BY.LAST_UPDATED ? updatedMs : dateMs,
          isPayer,
          amount,
          settled: amount === 0,
        }
      })
      .sort((a, b) =>
        orderBy === ORDER_BY.LAST_UPDATED
          ? b.updatedMs - a.updatedMs || b.dateMs - a.dateMs
          : b.dateMs - a.dateMs || b.createdMs - a.createdMs,
      )
  }, [expenses, myKey, orderBy])

  const counts = useMemo(() => {
    let settled = 0
    for (const e of entries) if (e.settled) settled++
    return { all: entries.length, settled, pending: entries.length - settled }
  }, [entries])

  const groups = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const result: { label: string; items: HistoryEntry[] }[] = []
    for (const entry of entries) {
      if (filter === 'pending' && entry.settled) continue
      if (filter === 'settled' && !entry.settled) continue
      if (needle && !entry.expense.expense_desc.toLowerCase().includes(needle)) continue
      const label = monthLabel(entry.sortMs)
      const last = result[result.length - 1]
      if (last && last.label === label) last.items.push(entry)
      else result.push({ label, items: [entry] })
    }
    return result
  }, [entries, filter, deferredQuery])

  const visibleCount = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])

  const toggleExpanded = useCallback((expenseKey: number) => {
    setExpandedKeys(curr => {
      const next = new Set(curr)
      if (!next.delete(expenseKey)) next.add(expenseKey)
      return next
    })
  }, [])

  const fallbackName = useMemo(() => deriveUserName(expenses, myKey), [expenses, myKey])
  const showSkeleton = (loading && expenses.length === 0) || (myKey === null && !error)
  const isRefreshing = loading && expenses.length > 0
  const dateTitle = orderBy === ORDER_BY.LAST_UPDATED ? 'Last updated' : 'Expense date'
  const isFiltering = filter !== 'all' || query.trim() !== ''

  return (
    <AppShell activeView="history" onViewChange={onNavigate} fallbackName={fallbackName}>
      <div className="home-content">

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 300, letterSpacing: '-0.02em',
            color: '#e8e5f0', margin: '0 0 6px 0', lineHeight: 1.1,
          }}>
            Expense <em style={{ fontStyle: 'italic', color: '#c9a96e' }}>history.</em>
          </h1>
          <p className="hist-subtitle">
            Every expense you have paid for or shared in, settled or not.
          </p>
        </div>

        {!showSkeleton && !error && entries.length > 0 && (
          <div className="hist-sortrow">
            <ExpenseSortToggle value={orderBy} onChange={handleSortChange} />
          </div>
        )}

        {!showSkeleton && !error && entries.length > 0 && (
          <div className="hist-toolbar">
            <div className="hist-filters" role="group" aria-label="Filter by status">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  className={`hist-chip${filter === f.value ? ' active' : ''}`}
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                  <span className="hist-chip-count">{counts[f.value]}</span>
                </button>
              ))}
            </div>
            <div className="hist-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by description"
                aria-label="Search expenses by description"
              />
            </div>
          </div>
        )}

        {showSkeleton && (
          <div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-card" style={{ height: '74px', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {!showSkeleton && error && (
          <div className="hist-message">
            <p style={{ color: '#f87171', margin: '0 0 14px' }}>{error}</p>
            <button type="button" className="hist-retry-btn" onClick={fetchHistory}>Try again</button>
          </div>
        )}

        {!showSkeleton && !error && entries.length === 0 && (
          <div className="hist-message">
            <p className="hist-message-title">No expenses yet</p>
            <p className="hist-message-desc">Expenses you create or share in will show up here.</p>
            <button type="button" className="hist-retry-btn" onClick={() => onNavigate('home')}>Go to Home</button>
          </div>
        )}

        {!showSkeleton && !error && entries.length > 0 && visibleCount === 0 && (
          <div className="hist-message">
            <p className="hist-message-title">No matching expenses</p>
            <p className="hist-message-desc">Try a different search or status filter.</p>
            {isFiltering && (
              <button
                type="button"
                className="hist-retry-btn"
                onClick={() => { setFilter('all'); setQuery('') }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!showSkeleton && !error && myKey !== null && groups.map(group => (
          <section key={group.label} className={`hist-group${isRefreshing ? ' is-refreshing' : ''}`} aria-label={group.label} aria-busy={isRefreshing}>
            <p className="home-section-title hist-group-title">
              {group.label} <span>({group.items.length})</span>
            </p>
            <div className="expense-list">
              {group.items.map(entry => (
                <HistoryRow
                  key={entry.expense.expense_key}
                  entry={entry}
                  userKey={myKey}
                  expanded={expandedKeys.has(entry.expense.expense_key)}
                  dateTitle={dateTitle}
                  onToggle={toggleExpanded}
                />
              ))}
            </div>
          </section>
        ))}

      </div>
    </AppShell>
  )
}
