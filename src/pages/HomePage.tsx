import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getActiveExpenses, settleExpense, deleteExpense } from '../services/expenseService'
import { getCurrencies } from '../services/currencyService'
import type { Expense, ExpenseShare } from '../types/expense'
import type { Currency } from '../types/currency'
import ChangePasswordModal from '../components/ChangePasswordModal'
import CreateExpenseModal from '../components/CreateExpenseModal'

// ─── Helpers ───────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$',
}

function currencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] ?? code
}

function formatAmount(amount: number, currency: string) {
  const sym = currencySymbol(currency)
  return `${sym}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const AVATAR_PALETTE = [
  { bg: 'rgba(201,169,110,0.18)', color: '#c9a96e' },
  { bg: 'rgba(96,165,250,0.18)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.18)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.18)', color: '#a78bfa' },
  { bg: 'rgba(251,146,60,0.18)', color: '#fb923c' },
]

function avatarStyle(key: number) {
  return AVATAR_PALETTE[key % AVATAR_PALETTE.length]
}

// For a given expense, compute how it relates to the current user
function getMyFinancials(expense: Expense, userKey: number) {
  const isPayer = expense.primary_user_key === userKey
  const myEntry = expense.expense_share.find(s => s.secondary_user_key === userKey)

  if (isPayer) {
    const myOwn = myEntry?.expense_share ?? 0
    const owedToMe = expense.total_amount - myOwn
    return { isPayer: true, amount: owedToMe }
  }
  return { isPayer: false, amount: myEntry?.expense_share ?? 0 }
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

function ExpenseCard({ expense, userKey, index, onRefresh }: {
  expense: Expense
  userKey: number
  index: number
  onRefresh: () => void
}) {
  const [settlingKey, setSettlingKey] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSettle = useCallback((expenseVerKey: number) => {
    setSettlingKey(expenseVerKey)
    settleExpense(expenseVerKey)
      .then(() => onRefresh())
      .catch(() => {})
      .finally(() => setSettlingKey(null))
  }, [onRefresh])

  const handleDelete = useCallback(() => {
    setDeleting(true)
    deleteExpense(expense.expense_key)
      .then(() => onRefresh())
      .catch(() => setDeleting(false))
  }, [expense.expense_key, onRefresh])

  const { isPayer, amount } = getMyFinancials(expense, userKey)
  const color = isPayer ? 'green' : 'red'
  const currency = expense.currency_code
  const divisionLabel = expense.division_by_code === 'AMOUNT' ? 'Split by amount' : expense.division_by_code

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

        {/* Meta badges */}
        <div className="expense-meta-row">
          <span className="expense-badge payer">
            {isPayer ? 'You paid' : `Paid by ${expense.primary_user_name}`}
          </span>
          <span className="expense-badge currency">{currency}</span>
          <span className="expense-badge currency">{divisionLabel}</span>
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
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showCreateExpense, setShowCreateExpense] = useState(false)

  const fetchExpenses = useCallback(() => {
    setExpensesLoading(true)
    setError(null)
    getActiveExpenses()
      .then(data => setExpenses(data ?? []))
      .catch(() => setError('Could not load expenses. Please refresh.'))
      .finally(() => setExpensesLoading(false))
  }, [])

  // Fetch expenses and currencies in parallel once on mount
  useEffect(() => {
    fetchExpenses()
    getCurrencies().then(data => setCurrencies(data ?? [])).catch(() => {})
  }, [fetchExpenses])

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
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
            <span style={{
              fontFamily: '"Outfit", sans-serif',
              fontSize: '13px', fontWeight: 500,
              color: fullName ? '#9090b8' : 'transparent',
              background: fullName ? 'none' : 'rgba(144,144,184,0.12)',
              borderRadius: '4px',
              minWidth: '80px',
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
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#4a4a72',
              fontFamily: '"Outfit", sans-serif',
              fontSize: '12px', fontWeight: 600,
              padding: '6px 14px', borderRadius: '8px',
              cursor: 'pointer', letterSpacing: '0.03em',
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
                onRefresh={fetchExpenses}
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
            fetchExpenses()
          }}
        />
      )}
    </div>
  )
}

