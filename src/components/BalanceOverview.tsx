import { useState, useCallback } from 'react'
import { formatAmount, initials, avatarStyle } from '../lib/format'
import { settleWithUser } from '../services/balanceService'
import ConfirmationBar from './ConfirmationBar'
import type { UserBalance } from '../types/balance'

interface BalanceOverviewProps {
  balances: UserBalance[]
  currency: string
  loading: boolean
  onSettled: () => void
}

// Positive user_total → they owe the current user. Negative → current user owes them.
function BalanceRow({ balance, currency, index, onSettle, isSettling }: {
  balance: UserBalance
  currency: string
  index: number
  onSettle: () => void
  isSettling: boolean
}) {
  const av = avatarStyle(balance.user_key)
  const isOwedToMe = balance.user_total >= 0
  const amount = Math.abs(balance.user_total)
  const fullName = `${balance.first_name} ${balance.last_name}`.trim()

  return (
    <div className="balance-row" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="balance-row-person">
        <div className="balance-avatar" style={{ background: av.bg, color: av.color }}>
          {initials(fullName)}
        </div>
        <div className="balance-row-text">
          <span className="balance-name">{fullName}</span>
          <span className={`balance-direction ${isOwedToMe ? 'green' : 'red'}`}>
            {isOwedToMe ? 'owes you' : 'you owe'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span className={`balance-amount ${isOwedToMe ? 'green' : 'red'}`}>
          {isOwedToMe ? '+' : '−'}{formatAmount(amount, currency)}
        </span>
        <button
          className="settle-btn"
          onClick={onSettle}
          disabled={isSettling}
          aria-label={`Settle with ${fullName}`}
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
      </div>
    </div>
  )
}

export default function BalanceOverview({ balances, currency, loading, onSettled }: BalanceOverviewProps) {
  const [settlingKey, setSettlingKey] = useState<number | null>(null)
  const [settleError, setSettleError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<UserBalance | null>(null)

  const requestSettle = useCallback((balance: UserBalance) => {
    setSettleError(null)
    setConfirmTarget(balance)
  }, [])

  const executeSettle = () => {
    if (!confirmTarget) return
    setSettleError(null)
    setSettlingKey(confirmTarget.user_key)
    settleWithUser(confirmTarget.user_key)
      .then(() => {
        setConfirmTarget(null)
        onSettled()
      })
      .catch((err: any) => {
        setSettleError(err.message || 'Failed to settle balance')
      })
      .finally(() => setSettlingKey(null))
  }

  if (loading) {
    return (
      <div className="balance-panel">
        {[1, 2, 3].map(i => (
          <div key={i} className="balance-row-skeleton" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    )
  }

  if (balances.length === 0) {
    return (
      <div className="balance-panel">
        <div className="balance-empty">
          <span className="balance-empty-icon">✓</span>
          <div>
            <p className="balance-empty-title">You're all settled up</p>
            <p className="balance-empty-desc">No outstanding balances with anyone right now.</p>
          </div>
        </div>
      </div>
    )
  }

  // Show largest balances first so the most significant amounts are visible at a glance.
  const sorted = [...balances].sort((a, b) => Math.abs(b.user_total) - Math.abs(a.user_total))
  const confirmName = confirmTarget ? `${confirmTarget.first_name} ${confirmTarget.last_name}`.trim() : ''

  return (
    <div className="balance-panel">
      <div className="balance-scroll">
        {sorted.map((balance, i) => (
          <BalanceRow
            key={balance.user_key}
            balance={balance}
            currency={currency}
            index={i}
            onSettle={() => requestSettle(balance)}
            isSettling={settlingKey === balance.user_key}
          />
        ))}
      </div>
      {confirmTarget && (
        <ConfirmationBar
          isOpen={!!confirmTarget}
          type="settle"
          title="Confirm Settlement"
          description={`Settle all outstanding expenses with ${confirmName}?`}
          onConfirm={executeSettle}
          onCancel={() => {
            setConfirmTarget(null)
            setSettleError(null)
          }}
          isLoading={settlingKey !== null}
          error={settleError}
        />
      )}
    </div>
  )
}
