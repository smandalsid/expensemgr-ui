import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getActiveExpenses, settleExpense, deleteExpense } from '../services/expenseService'
import { getCurrencies } from '../services/currencyService'
import { getAllBalances } from '../services/balanceService'
import type { Expense, ExpenseShare } from '../types/expense'
import type { Currency } from '../types/currency'
import type { UserBalance } from '../types/balance'
import { formatAmount, initials, avatarStyle, formatDateTime } from '../lib/format'
import ChangePasswordModal from '../components/ChangePasswordModal'
import CreateExpenseModal from '../components/CreateExpenseModal'
import ConfirmationBar from '../components/ConfirmationBar'
import BalanceOverview from '../components/BalanceOverview'

// ─── Helpers ───────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// For a given expense, compute how it relates to the current user.
// Settled shares (expense_ver_status === true) are excluded from outstanding amounts.
function getMyFinancials(expense: Expense, userKey: number) {
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

// Derives expense-level Created/Updated timestamps from the shares —
// earliest creation and latest change across all versions of the expense.
function getExpenseTimestamps(expense: Expense) {
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

export default function HomePage() {
  const { clearToken, user, tokenUserKey, userLoading } = useAuth()
  // Use user_key from the JWT payload — available immediately without a /users round-trip
  const myKey = user?.user_key ?? tokenUserKey

  const greetingText = useMemo(greeting, [])

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [expensesLoading, setExpensesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<UserBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showCreateExpense, setShowCreateExpense] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)

  const fetchExpenses = useCallback(() => {
    setExpensesLoading(true)
    setError(null)
    getActiveExpenses()
      .then(data => setExpenses(data ?? []))
      .catch(() => setError('Could not load expenses. Please refresh.'))
      .finally(() => setExpensesLoading(false))
  }, [])

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

  // Fetch expenses, currencies and balances in parallel once on mount
  useEffect(() => {
    fetchExpenses()
    fetchBalances()
    getCurrencies().then(data => setCurrencies(data ?? [])).catch(() => {})
  }, [fetchExpenses, fetchBalances])

  // Show skeletons only until expenses are ready; user profile enriches the UI when it arrives
  const loading = expensesLoading || (userLoading && myKey === null)

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
  const derivedFullName = useMemo(() => {
    if (myKey === null) return ''
    for (const exp of expenses) {
      if (exp.primary_user_key === myKey) return exp.primary_user_name
      const share = exp.expense_share.find(s => s.secondary_user_key === myKey)
      if (share) return share.secondary_user_name
    }
    return ''
  }, [expenses, myKey])

  const fullName = user ? `${user.first_name} ${user.last_name}` : derivedFullName
  const displayName = user?.first_name ?? derivedFullName.split(' ')[0] ?? ''

  return (
    <div className="home-page">

      {/* ── Navigation ── */}
      <nav className="home-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, #c9a96e 0%, #8a6534 100%)',
            borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '13px', color: '#07071a', fontWeight: 600,
          }}>$</div>
          <span style={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: '13px', fontWeight: 700,
            letterSpacing: '0.12em', color: '#e8e5f0',
            textTransform: 'uppercase',
          }}>ExpenseMgr</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'rgba(201,169,110,0.15)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"Outfit", sans-serif',
              fontSize: '11px', fontWeight: 700, color: '#c9a96e',
              flexShrink: 0,
            }}>
              {user ? initials(`${user.first_name} ${user.last_name}`) : (fullName ? initials(fullName) : '…')}
            </div>
            <span className="home-nav-fullname" style={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: '13px', fontWeight: 500,
              color: fullName ? '#9090b8' : 'transparent',
              background: fullName ? 'none' : 'rgba(144,144,184,0.12)',
              borderRadius: '4px',
              minWidth: '80px',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s',
            }}>
              {fullName || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
            </span>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="cp-nav-btn"
            title="Change password"
            aria-label="Change password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </button>
          <button
            onClick={clearToken}
            className="home-nav-signout"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#4a4a72',
              fontFamily: '"Outfit", sans-serif',
              fontSize: '12px', fontWeight: 600,
              padding: '6px 14px', borderRadius: '8px',
              cursor: 'pointer', letterSpacing: '0.03em',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = '#f87171'
              ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.28)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = '#4a4a72'
              ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
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
        <p className="home-section-title">
          Active Expenses {!loading && `(${expenses.length})`}
        </p>

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
          <div className="expense-list">
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

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={clearToken}
        />
      )}

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
    </div>
  )
}

