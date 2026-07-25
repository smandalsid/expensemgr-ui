import { useState, useEffect, useRef, useMemo } from 'react'
import { createExpense, getAllDivisionMethods } from '../services/expenseService'
import type { DivisionMethod } from '../services/expenseService'
import { getAllUsers } from '../services/userService'
import type { UserSummary } from '../services/userService'
import { ApiError } from '../lib/apiClient'
import type { SecondaryShare } from '../types/expense'
import type { Currency } from '../types/currency'

interface CreateExpenseModalProps {
  userKey: number
  currencies: Currency[]
  onClose: () => void
  onSuccess: () => void
}

const CloseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// ── Searchable currency picker ─────────────────────────────────────
function CurrencySelect({ currencies, value, onChange }: {
  currencies: Currency[]
  value: number
  onChange: (key: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = currencies.find(c => c.currency_key === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return currencies
    return currencies.filter(c =>
      c.currency_name.toLowerCase().includes(q) ||
      c.currency_code.toLowerCase().includes(q) ||
      c.currency_desc.toLowerCase().includes(q)
    )
  }, [currencies, query])

  const toggle = () => {
    setOpen(o => {
      if (!o) setTimeout(() => searchRef.current?.focus(), 30)
      else setQuery('')
      return !o
    })
  }

  const select = (key: number) => {
    onChange(key)
    setOpen(false)
    setQuery('')
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Escape closes just this dropdown, not the whole modal
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [open])

  return (
    <div className="ce-currency-wrap" ref={wrapperRef}>
      <button
        type="button"
        className={`ce-currency-trigger${open ? ' open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ce-currency-code-badge">
          {selected?.currency_code ?? '—'}
        </span>
        <span className="ce-currency-trigger-label">
          {selected
            ? `${selected.currency_name} — ${selected.currency_desc}`
            : currencies.length === 0 ? 'Loading…' : 'Select currency'}
        </span>
        <svg
          className={`ce-chevron${open ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ce-currency-panel" role="listbox">
          <div className="ce-currency-search-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="ce-currency-search"
              placeholder="Search by name or code…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            {query && (
              <button
                type="button"
                className="ce-currency-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="ce-currency-list">
            {filtered.length === 0 ? (
              <div className="ce-currency-empty">No currencies match "{query}"</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.currency_key}
                  type="button"
                  role="option"
                  aria-selected={c.currency_key === value}
                  className={`ce-currency-option${c.currency_key === value ? ' active' : ''}`}
                  onClick={() => select(c.currency_key)}
                >
                  <span className="ce-currency-option-code">{c.currency_code}</span>
                  <span className="ce-currency-option-name">
                    {c.currency_name} — {c.currency_desc}
                  </span>
                  {c.currency_key === value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Searchable user picker ───────────────────────────────────────
function UserSelect({ users, value, onChange }: {
  users: UserSummary[]
  value: string
  onChange: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = users.find(u => String(u.user_key) === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.username.toLowerCase().includes(q))
  }, [users, query])

  const toggle = () => {
    setOpen(o => {
      if (!o) setTimeout(() => searchRef.current?.focus(), 30)
      else setQuery('')
      return !o
    })
  }

  const select = (key: string) => {
    onChange(key)
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [open])

  return (
    <div className="ce-currency-wrap" ref={wrapperRef}>
      <button
        type="button"
        className={`ce-currency-trigger${open ? ' open' : ''}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ce-currency-code-badge">
          {selected ? `#${selected.user_key}` : '—'}
        </span>
        <span className="ce-currency-trigger-label">
          {selected
            ? selected.username
            : users.length === 0 ? 'Loading…' : 'Select participant'}
        </span>
        <svg
          className={`ce-chevron${open ? ' open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ce-currency-panel" role="listbox">
          <div className="ce-currency-search-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="ce-currency-search"
              placeholder="Search by username or name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            {query && (
              <button
                type="button"
                className="ce-currency-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <CloseIcon />
              </button>
            )}
          </div>

          <div className="ce-currency-list">
            {filtered.length === 0 ? (
              <div className="ce-currency-empty">No users match "{query}"</div>
            ) : (
              filtered.map(u => (
                <button
                  key={u.user_key}
                  type="button"
                  role="option"
                  aria-selected={String(u.user_key) === value}
                  className={`ce-currency-option${String(u.user_key) === value ? ' active' : ''}`}
                  onClick={() => select(String(u.user_key))}
                >
                  <span className="ce-currency-option-code">#{u.user_key}</span>
                  <span className="ce-currency-option-name">
                    {u.username}
                  </span>
                  {String(u.user_key) === value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ReceiptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

interface ParticipantRow {
  id: number
  userKey: string
  share: string
}

export default function CreateExpenseModal({ userKey, currencies, onClose, onSuccess }: CreateExpenseModalProps) {
  const [desc, setDesc] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [currencyKey, setCurrencyKey] = useState(() => {
    const inr = currencies.find(c => c.currency_code === 'INR')
    return (inr ?? currencies[0])?.currency_key ?? 0
  })
  const [divisionKey, setDivisionKey] = useState(0)
  const [divisionMethods, setDivisionMethods] = useState<DivisionMethod[]>([])
  const [primaryUserKey, setPrimaryUserKey] = useState(String(userKey))
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { id: 1, userKey: '', share: '' },
  ])
  const [nextId, setNextId] = useState(2)
  const [allUsers, setAllUsers] = useState<UserSummary[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const descRef = useRef<HTMLInputElement>(null)
  const isByAmount = divisionMethods.find(d => d.division_by_key === divisionKey)?.division_by_code === 'AMOUNT'

  useEffect(() => {
    const t = setTimeout(() => descRef.current?.focus(), 60)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    getAllUsers()
      .then(setAllUsers)
      .catch(() => { /* silently fail — users list stays empty */ })
  }, [])

  useEffect(() => {
    getAllDivisionMethods()
      .then(methods => {
        setDivisionMethods(methods)
        if (methods.length > 0) setDivisionKey(methods[0].division_by_key)
      })
      .catch(() => { /* silently fail — select stays empty */ })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const addParticipant = () => {
    setParticipants(prev => [...prev, { id: nextId, userKey: '', share: '' }])
    setNextId(n => n + 1)
  }

  const removeParticipant = (id: number) => {
    setParticipants(prev => prev.filter(p => p.id !== id))
  }

  const updateParticipant = (id: number, field: 'userKey' | 'share', value: string) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
    const key = `p_${id}_${field}`
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  const clearFieldError = (field: string) => {
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!desc.trim()) errs.desc = 'Description is required'

    const pk = parseInt(primaryUserKey)
    if (!primaryUserKey || isNaN(pk) || pk <= 0) errs.primaryUserKey = 'Select a primary user'

    const amt = parseFloat(totalAmount)
    if (!totalAmount || isNaN(amt) || amt <= 0) errs.totalAmount = 'Enter a valid positive amount'

    if (participants.length === 0) {
      errs.participants = 'Add at least one participant'
    } else {
      participants.forEach(p => {
        const uk = parseInt(p.userKey)
        if (!p.userKey || isNaN(uk) || uk <= 0) errs[`p_${p.id}_userKey`] = 'Enter a valid user key'
        if (isByAmount) {
          const share = parseFloat(p.share)
          if (!p.share || isNaN(share) || share <= 0) errs[`p_${p.id}_share`] = 'Enter share amount'
        }
      })
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setApiError(null)
    setLoading(true)

    try {
      const secondary: SecondaryShare[] = participants.map(p => ({
        user_key: parseInt(p.userKey),
        user_share: isByAmount ? parseFloat(p.share) : 0,
      }))

      await createExpense({
        primary_user_key: parseInt(primaryUserKey),
        currency_key: currencyKey,
        division_by_key: divisionKey,
        total_amount: parseFloat(totalAmount),
        expense_desc: desc.trim(),
        user_expense_secondary_share: secondary,
      })

      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message)
      } else {
        setApiError('Unable to reach the server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="cp-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create expense"
    >
      <div className="ce-modal" onClick={e => e.stopPropagation()}>
        {/* Gold top accent bar */}
        <div className="cp-accent-bar" />

        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-left">
            <div className="cp-lock-icon">
              <ReceiptIcon />
            </div>
            <div>
              <h2 className="cp-title">New Expense</h2>
              <p className="cp-subtitle">Split a cost with others</p>
            </div>
          </div>
          <button className="cp-close-btn" onClick={onClose} aria-label="Close" type="button">
            <CloseIcon />
          </button>
        </div>

        {/* Form */}
        <form className="ce-form" onSubmit={handleSubmit} noValidate>

          {/* Description */}
          <div className="field-group">
            <label className="field-label" htmlFor="ce-desc">Description</label>
            <input
              ref={descRef}
              id="ce-desc"
              type="text"
              className={`auth-input${errors.desc ? ' error' : ''}`}
              placeholder="e.g. Dinner at Olive"
              value={desc}
              maxLength={200}
              onChange={e => { setDesc(e.target.value); clearFieldError('desc') }}
            />
            {errors.desc && <p className="field-error">{errors.desc}</p>}
          </div>

          {/* Amount + Currency */}
          <div className="ce-row">
            <div className="field-group" style={{ flex: '1 1 0' }}>
              <label className="field-label" htmlFor="ce-amount">Total Amount</label>
              <input
                id="ce-amount"
                type="text"
                inputMode="decimal"
                className={`auth-input${errors.totalAmount ? ' error' : ''}`}
                placeholder="0.00"
                value={totalAmount}
                onChange={e => { setTotalAmount(e.target.value); clearFieldError('totalAmount') }}
              />
              {errors.totalAmount && <p className="field-error">{errors.totalAmount}</p>}
            </div>
            <div className="field-group" style={{ flex: '1 1 0' }}>
              <label className="field-label" htmlFor="ce-currency">Currency</label>
              <CurrencySelect
                currencies={currencies}
                value={currencyKey}
                onChange={key => { setCurrencyKey(key); clearFieldError('currencyKey') }}
              />
            </div>
          </div>

          {/* Split method */}
          <div className="field-group">
            <label className="field-label" htmlFor="ce-division">Split Method</label>
            <select
              id="ce-division"
              className="ce-select"
              value={divisionKey}
              onChange={e => setDivisionKey(Number(e.target.value))}
            >
              {divisionMethods.map(d => (
                <option key={d.division_by_key} value={d.division_by_key}>
                  {d.division_by_code.charAt(0) + d.division_by_code.slice(1).toLowerCase().replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Participants */}
          <div className="field-group">
            <div className="ce-participants-header">
              <span className="field-label" style={{ margin: 0 }}>Participants</span>
              {isByAmount && (
                <span className="ce-col-hint">User Key / Share</span>
              )}
            </div>
            {errors.participants && (
              <p className="field-error" style={{ marginTop: 4, marginBottom: 8 }}>
                {errors.participants}
              </p>
            )}

            <div className="ce-participants-list">
              {/* Primary user selector */}
              <div className="ce-primary-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <UserSelect
                    users={allUsers}
                    value={primaryUserKey}
                    onChange={key => { setPrimaryUserKey(key); if (errors.primaryUserKey) setErrors(e => { const n = { ...e }; delete n.primaryUserKey; return n }) }}
                  />
                  {errors.primaryUserKey && (
                    <p className="field-error" style={{ marginTop: 3 }}>{errors.primaryUserKey}</p>
                  )}
                </div>
                <span className="ce-primary-badge">Primary</span>
              </div>

              {participants.map((p, idx) => (
                <div key={p.id} className="ce-participant-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <UserSelect
                      users={allUsers}
                      value={p.userKey}
                      onChange={key => updateParticipant(p.id, 'userKey', key)}
                    />
                    {errors[`p_${p.id}_userKey`] && (
                      <p className="field-error" style={{ marginTop: 3 }}>{errors[`p_${p.id}_userKey`]}</p>
                    )}
                  </div>

                  {isByAmount && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`auth-input${errors[`p_${p.id}_share`] ? ' error' : ''}`}
                        placeholder="0.00"
                        value={p.share}
                        onChange={e => updateParticipant(p.id, 'share', e.target.value)}
                        aria-label={`Participant ${idx + 1} share amount`}
                      />
                      {errors[`p_${p.id}_share`] && (
                        <p className="field-error" style={{ marginTop: 3 }}>{errors[`p_${p.id}_share`]}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="ce-remove-btn"
                    onClick={() => removeParticipant(p.id)}
                    aria-label="Remove participant"
                    disabled={participants.length === 1}
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="ce-add-btn" onClick={addParticipant}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add participant
            </button>
          </div>

          {/* API error */}
          {apiError && (
            <div className="ce-error-banner">{apiError}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? 'Creating…' : 'Create Expense'}
          </button>
        </form>
      </div>
    </div>
  )
}
