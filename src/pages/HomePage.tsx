import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getActiveExpenses, settleExpense, deleteExpense } from '../services/expenseService'
import { getCurrencies } from '../services/currencyService'
import { getAllBalances } from '../services/balanceService'
import type { Expense, ExpenseShare } from '../types/expense'
import type { Currency } from '../types/currency'
import type { UserBalance } from '../types/balance'
import { formatAmount, initials, avatarStyle, formatDateTime, formatDate } from '../lib/format'
import { getMyFinancials, getExpenseTimestamps, deriveUserName } from '../lib/expenseUtils'
import CreateExpenseModal from '../components/CreateExpenseModal'
import ConfirmationBar from '../components/ConfirmationBar'
import BalanceOverview from '../components/BalanceOverview'
import ExpenseSortToggle from '../components/ExpenseSortToggle'
import { useExpenseSort } from '../lib/expenseSort'
import AppShell from '../components/AppShell'
import type { AppView } from '../components/AppShell'

// ─── Helpers ───────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ParticipantRow({ share, currency, userKey, isPayer, onSettle, isSettling }: {
  share: ExpenseShare
  currency: string
  userKey: number
  isPayer: boolean
  onSettle?: () => void
  isSettling?: boolean
}) {
  const isMe = share.secondary_user_key === userKey
  const av = avatarStyle(share.secondary_user_key)
  const showSettleBtn = !share.expense_ver_status && (isMe || isPayer)
  return (
    <div className="participant-row">
      <div
        className="participant-avatar"
        style={{ background: av.bg, color: av.color }}
      >
        {initials(share.secondary_user_name)}
      </div>
      <span className="participant-name" style={isMe ? { color: '#c9a96e' } : undefined}>
        {isMe ? 'You' : share.secondary_user_name}
      </span>
      <span className="participant-share">
        {formatAmount(share.expense_share, currency)}
      </span>
      {showSettleBtn ? (
        <button
          className="settle-btn"
          onClick={onSettle}
          disabled={isSettling}
          aria-label="Settle your share"
        >
          {isSettling ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {isSettling ? 'Settling…' : 'Settle'}
        </button>
      ) : (
        <span className={`participant-status ${share.expense_ver_status ? 'settled' : 'pending'}`}>
          {share.expense_ver_status ? 'Settled' : 'Pending'}
        </span>
      )}
    </div>
  )
}

function ExpenseCard({ expense, userKey, index, onRefresh, onEdit }: {
  expense: Expense
  userKey: number
  index: number
  onRefresh: () => void
  onEdit: (expense: Expense) => void
}) {
  const [settlingKey, setSettlingKey] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean
    type: 'settle' | 'delete'
    data: number | string
    title: string
    desc: string
  } | null>(null)

  const handleSettle = useCallback((expenseVerKey: number) => {
    setConfirmation({
      isOpen: true,
      type: 'settle',
      data: expenseVerKey,
      title: 'Confirm Settlement',
      desc: `Are you sure you want to settle this share?`
    })
  }, [])

  const executeSettle = () => {
    if (!confirmation) return
    setActionError(null)
    setSettlingKey(confirmation.data as number)
    settleExpense(confirmation.data as number)
      .then(() => {
        onRefresh()
        setConfirmation(null)
      })
      .catch((err: any) => {
        setActionError(err.message || 'Failed to settle expense')
      })
      .finally(() => setSettlingKey(null))
  }

  const handleDelete = useCallback(() => {
    setConfirmation({
      isOpen: true,
      type: 'delete',
      data: expense.expense_key,
      title: 'Delete Expense',
      desc: `Are you sure you want to delete the expense "${expense.expense_desc}"?`
    })
  }, [expense])

  const executeDelete = () => {
    setActionError(null)
    setDeleting(true)
    deleteExpense(expense.expense_key)
      .then(() => {
        onRefresh()
        setConfirmation(null)
      })
      .catch((err: any) => {
        setActionError(err.message || 'Failed to delete expense')
      })
      .finally(() => setDeleting(false))
  }

  const { isPayer, amount } = getMyFinancials(expense, userKey)
  const color = isPayer ? 'green' : 'red'
  const currency = expense.currency_code
  const divisionLabel = expense.division_by_code === 'AMOUNT' ? 'Split by amount' : expense.division_by_code
  const timestamps = getExpenseTimestamps(expense)

  return (
    <div
      className={`expense-card ${color}`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className={`expense-card-accent ${color}`} />
      <div className="expense-card-body">

        {/* Title row */}
        <div className="expense-top-row">
          <h3 className="expense-desc">{expense.expense_desc}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <span className="expense-total">
              {formatAmount(expense.total_amount, currency)}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="edit-expense-btn"
                onClick={() => onEdit(expense)}
                aria-label="Edit expense"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit
              </button>
              <button
                className="delete-expense-btn"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete expense"
              >
                {deleting ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                )}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="expense-meta-row">
          <span className="expense-badge payer">
            {isPayer ? 'You paid' : `Paid by ${expense.primary_user_name}`}
          </span>
          <span className="expense-badge currency">{currency}</span>
          <span className="expense-badge currency">{divisionLabel}</span>
        </div>

        {/* Created / Updated timestamps */}
        <div className="expense-timestamps-row">
          <span className="expense-timestamp">Expense date: {formatDate(expense.expense_dt)}</span>
          <span className="expense-timestamp">Created: {formatDateTime(timestamps.created)}</span>
          <span className="expense-timestamp">Updated: {formatDateTime(timestamps.updated)}</span>
        </div>

        {/* Net amount for current user */}
        {amount > 0 && (
          <div className={`expense-you-owe ${color}`}>
            {isPayer ? (
              <>
                <span>↑</span>
                <span>You are owed {formatAmount(amount, currency)}</span>
              </>
            ) : (
              <>
                <span>↓</span>
                <span>You owe {formatAmount(amount, currency)}</span>
              </>
            )}
          </div>
        )}

        {amount === 0 && (
          <div className="expense-you-owe" style={{
            color: '#4ade80', background: 'rgba(74,222,128,0.06)',
            border: '1px solid rgba(74,222,128,0.12)',
          }}>
            <span>✓</span>
            <span>All settled</span>
          </div>
        )}

        {/* Participants */}
        <hr className="expense-divider" />
        <p className="expense-participants-label">Participants</p>
        {expense.expense_share.map(share => (
          <ParticipantRow
            key={share.expense_ver_key}
            share={share}
            currency={currency}
            userKey={userKey}
            isPayer={isPayer}
            onSettle={() => handleSettle(share.expense_ver_key)}
            isSettling={settlingKey === share.expense_ver_key}
          />
        ))}
      </div>
      {confirmation && (
        <ConfirmationBar
          isOpen={confirmation.isOpen}
          type={confirmation.type}
          title={confirmation.title}
          description={confirmation.desc}
          onConfirm={confirmation.type === 'settle' ? executeSettle : executeDelete}
          onCancel={() => {
            setConfirmation(null)
            setActionError(null)
          }}
          isLoading={settlingKey !== null || deleting}
          error={actionError}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, amount, currency, color, delay }: {
  label: string
  amount: number
  currency: string
  color: string
  delay: number
}) {
  return (
    <div className="summary-card" style={{ animationDelay: `${delay}s` }}>
      <p className="summary-label">{label}</p>
      <p className="summary-amount" style={{ color }}>
        {formatAmount(amount, currency)}
      </p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function HomePage({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { user, tokenUserKey, userLoading } = useAuth()
  // Use user_key from the JWT payload — available immediately without a /users round-trip
  const myKey = user?.user_key ?? tokenUserKey

  const greetingText = useMemo(greeting, [])

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<UserBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [showCreateExpense, setShowCreateExpense] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [orderBy, setOrderBy] = useExpenseSort()
  // Ignores responses from superseded requests (e.g. rapid sort toggling).
  const latestRequest = useRef(0)

  const fetchExpenses = useCallback(() => {
    const requestId = ++latestRequest.current
    setExpensesLoading(true)
    setError(null)
    getActiveExpenses(orderBy)
      .then(data => { if (requestId === latestRequest.current) setExpenses(data ?? []) })
      .catch(() => { if (requestId === latestRequest.current) setError('Could not load expenses. Please refresh.') })
      .finally(() => { if (requestId === latestRequest.current) setExpensesLoading(false) })
  }, [orderBy])

  const fetchBalances = useCallback(() => {
    setBalancesLoading(true)
    getAllBalances()
      .then(data => setBalances(data ?? []))
      .catch(() => setBalances([]))
      .finally(() => setBalancesLoading(false))
  }, [])

  // Balances depend on expense state, so any expense mutation (create/edit/settle/delete)
  // must refresh both to keep the "who owes what" panel in sync without a full page reload.
  const refreshExpensesAndBalances = useCallback(() => {
    fetchExpenses()
    fetchBalances()
  }, [fetchExpenses, fetchBalances])

  // Expenses refetch whenever the sort changes; balances and currencies are sort-independent.
  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  useEffect(() => {
    fetchBalances()
    getCurrencies().then(data => setCurrencies(data ?? [])).catch(() => {})
  }, [fetchBalances])

  // Skeletons only on the first load; later refetches keep the list on screen.
  const loading = (expensesLoading && expenses.length === 0) || (userLoading && myKey === null)
  const isRefreshing = expensesLoading && expenses.length > 0

  // Determine the primary currency from expenses (fallback to INR)
  const primaryCurrency = expenses[0]?.currency_code ?? 'INR'

  const { totalOwedToMe, totalIOwe } = useMemo(() => {
    if (myKey === null) return { totalOwedToMe: 0, totalIOwe: 0 }
    let totalOwedToMe = 0
    let totalIOwe = 0
    for (const exp of expenses) {
      const { isPayer, amount } = getMyFinancials(exp, myKey)
      if (isPayer) totalOwedToMe += amount
      else totalIOwe += amount
    }
    return { totalOwedToMe, totalIOwe }
  }, [expenses, myKey])

  const netBalance = totalOwedToMe - totalIOwe
  const netColor = netBalance >= 0 ? '#4ade80' : '#f87171'

  // Derive the user's full name from expense data as a reliable fallback —
  // the /users endpoint may fail while expenses load fine.
  const derivedFullName = useMemo(() => deriveUserName(expenses, myKey), [expenses, myKey])

  const displayName = user?.first_name ?? derivedFullName.split(' ')[0] ?? ''

  return (
    <AppShell activeView="home" onViewChange={onNavigate} fallbackName={derivedFullName}>
      <div className="home-content">

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2.2rem' }}>
          <div>
            <h1 style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
              fontWeight: 300, letterSpacing: '-0.02em',
              color: '#e8e5f0', margin: '0 0 6px 0', lineHeight: 1.1,
            }}>
              {greetingText}, <em style={{ fontStyle: 'italic', color: '#c9a96e' }}>{displayName}.</em>
            </h1>
            <p style={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: '14px', color: '#3e3e62', margin: 0,
            }}>
              Here's your current expense overview.
            </p>
          </div>
          <button
            className="new-expense-btn"
            onClick={() => setShowCreateExpense(true)}
            aria-label="Create new expense"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Expense
          </button>
        </div>

        {/* ── Summary cards — always shown once loaded ── */}
        {!loading && (
          <div className="summary-grid">
            <SummaryCard
              label="Owed to you"
              amount={totalOwedToMe}
              currency={primaryCurrency}
              color="#4ade80"
              delay={0}
            />
            <SummaryCard
              label="You owe"
              amount={totalIOwe}
              currency={primaryCurrency}
              color="#f87171"
              delay={0.05}
            />
            <SummaryCard
              label="Net balance"
              amount={Math.abs(netBalance)}
              currency={primaryCurrency}
              color={netColor}
              delay={0.1}
            />
          </div>
        )}

        {/* ── Balance overview ── */}
        {!loading && (
          <>
            <p className="home-section-title">Balances</p>
            <BalanceOverview
              balances={balances}
              currency={primaryCurrency}
              loading={balancesLoading}
              onSettled={refreshExpensesAndBalances}
            />
          </>
        )}

        {/* ── Expense list ── */}
        <div className="list-head">
          <p className="home-section-title">
            Active Expenses {!loading && `(${expenses.length})`}
          </p>
          <ExpenseSortToggle value={orderBy} onChange={setOrderBy} />
        </div>

        {loading && (
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{
            textAlign: 'center', padding: '3rem 1rem',
            color: '#f87171', fontFamily: '"Outfit", sans-serif', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className={`expense-list${isRefreshing ? ' is-refreshing' : ''}`} aria-busy={isRefreshing}>
            {expenses.length === 0 ? (
              <div className="expense-card" style={{ animationDelay: '0s' }}>
                <div className="expense-card-accent" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="expense-card-body" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '24px 22px' }}>
                  <span style={{ fontSize: '1.6rem', opacity: 0.4 }}>🎉</span>
                  <div>
                    <p style={{
                      fontFamily: '"Outfit", sans-serif', fontSize: '0.95rem',
                      fontWeight: 600, color: '#e8e5f0', margin: '0 0 4px',
                    }}>All caught up!</p>
                    <p style={{
                      fontFamily: '"Outfit", sans-serif', fontSize: '13px',
                      color: '#3e3e62', margin: 0,
                    }}>You have no active expenses right now.</p>
                  </div>
                </div>
              </div>
            ) : myKey !== null && expenses.map((exp, i) => (
              <ExpenseCard
                key={exp.expense_key}
                expense={exp}
                userKey={myKey}
                index={i}
                onRefresh={refreshExpensesAndBalances}
                onEdit={setEditExpense}
              />
            ))}
          </div>
        )}

      </div>

      {showCreateExpense && myKey !== null && (
        <CreateExpenseModal
          userKey={myKey}
          currencies={currencies}
          onClose={() => setShowCreateExpense(false)}
          onSuccess={() => {
            setShowCreateExpense(false)
            refreshExpensesAndBalances()
          }}
        />
      )}

      {editExpense !== null && myKey !== null && (
        <CreateExpenseModal
          userKey={myKey}
          currencies={currencies}
          editExpense={editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={() => {
            setEditExpense(null)
            refreshExpensesAndBalances()
          }}
        />
      )}
    </AppShell>
  )
}

