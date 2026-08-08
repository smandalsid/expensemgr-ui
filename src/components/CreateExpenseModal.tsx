import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createExpense, getAllDivisionMethods, editExpense as editExpenseApi } from '../services/expenseService'
import type { DivisionMethod } from '../services/expenseService'
import { getAllUsers } from '../services/userService'
import type { UserSummary } from '../services/userService'
import { ApiError } from '../lib/apiClient'
import type { SecondaryShare, Expense } from '../types/expense'
import type { Currency } from '../types/currency'

interface CreateExpenseModalProps {
  userKey: number
  currencies: Currency[]
  onClose: () => void
  onSuccess: () => void
  editExpense?: Expense
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
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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
    const willOpen = !open
    if (willOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setPanelStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 })
    }
    if (!willOpen) setQuery('')
    setOpen(willOpen)
    if (willOpen) setTimeout(() => searchRef.current?.focus(), 30)
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
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close when the form scrolls (portal can't reposition itself)
  useEffect(() => {
    if (!open) return
    const handler = () => { setOpen(false); setQuery('') }
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
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

      {open && createPortal(
        <div ref={panelRef} className="ce-currency-panel" style={panelStyle} role="listbox">
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
      , document.body)}
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
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = users.find(u => String(u.user_key) === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u => u.username.toLowerCase().includes(q))
  }, [users, query])

  const toggle = () => {
    const willOpen = !open
    if (willOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setPanelStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 })
    }
    if (!willOpen) setQuery('')
    setOpen(willOpen)
    if (willOpen) setTimeout(() => searchRef.current?.focus(), 30)
  }

  const select = (key: string) => {
    onChange(key)
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close when the form scrolls (portal can't reposition itself)
  useEffect(() => {
    if (!open) return
    const handler = () => { setOpen(false); setQuery('') }
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
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

      {open && createPortal(
        <div ref={panelRef} className="ce-currency-panel" style={panelStyle} role="listbox">
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
      , document.body)}
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

const AutoSplitIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="9" x2="19" y2="9" />
    <line x1="5" y1="15" x2="19" y2="15" />
  </svg>
)

interface ParticipantRow {
  id: number
  userKey: string
  share: string
  expenseVerKey?: number
}

export default function CreateExpenseModal({ userKey, currencies, onClose, onSuccess, editExpense }: CreateExpenseModalProps) {
  const isEditing = Boolean(editExpense)

  const [desc, setDesc] = useState(editExpense?.expense_desc ?? '')
  const [totalAmount, setTotalAmount] = useState(editExpense ? String(editExpense.total_amount) : '')
  const [currencyKey, setCurrencyKey] = useState(() => {
    if (editExpense) {
      const match = currencies.find(c => c.currency_code === editExpense.currency_code)
      if (match) return match.currency_key
    }
    const inr = currencies.find(c => c.currency_code === 'INR')
    return (inr ?? currencies[0])?.currency_key ?? 0
  })
  const [divisionKey, setDivisionKey] = useState(0)
  const [divisionMethods, setDivisionMethods] = useState<DivisionMethod[]>([])
  const [primaryUserKey, setPrimaryUserKey] = useState(editExpense ? String(editExpense.primary_user_key) : String(userKey))
  const [participants, setParticipants] = useState<ParticipantRow[]>(() => {
    if (editExpense && editExpense.expense_share.length > 0) {
      return editExpense.expense_share.map((s, i) => ({
        id: i + 1,
        userKey: String(s.secondary_user_key),
        share: String(s.expense_share),
        expenseVerKey: s.expense_ver_key,
      }))
    }
    return [{ id: 1, userKey: '', share: '' }]
  })
  const [nextId, setNextId] = useState(() =>
    editExpense && editExpense.expense_share.length > 0
      ? editExpense.expense_share.length + 1
      : 2
  )
  const [allUsers, setAllUsers] = useState<UserSummary[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const descRef = useRef<HTMLInputElement>(null)
  const isByAmount = divisionMethods.find(d => d.division_by_key === divisionKey)?.division_by_code === 'AMOUNT'
  const isByPercentage = divisionMethods.find(d => d.division_by_key === divisionKey)?.division_by_code === 'PERCENTAGE'
  const showShares = isByAmount || isByPercentage

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
        if (editExpense) {
          const match = methods.find(m => m.division_by_code === editExpense.division_by_code)
          setDivisionKey(match ? match.division_by_key : (methods[0]?.division_by_key ?? 0))
        } else if (methods.length > 0) {
          setDivisionKey(methods[0].division_by_key)
        }
      })
      .catch(() => { /* silently fail — select stays empty */ })
  }, [editExpense])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAutoSplit = () => {
    const count = participants.length
    if (count === 0) return
    if (isByAmount) {
      const amt = parseFloat(totalAmount)
      if (!totalAmount || isNaN(amt) || amt <= 0) return
      const share = (amt / count).toFixed(2)
      setParticipants(prev => prev.map(p => ({ ...p, share })))
    } else if (isByPercentage) {
      const share = (100 / count).toFixed(2)
      setParticipants(prev => prev.map(p => ({ ...p, share })))
    }
  }

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
        if (showShares) {
          const share = parseFloat(p.share)
          if (p.share.trim() === '' || isNaN(share) || share < 0) errs[`p_${p.id}_share`] = isByAmount ? 'Enter share amount' : 'Enter percentage'
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
        user_share: showShares ? parseFloat(p.share) : 0,
        ...(isEditing && p.expenseVerKey !== undefined ? { expense_ver_key: p.expenseVerKey } : {}),
      }))

      if (isEditing && editExpense) {
        await editExpenseApi({
          primary_user_key: parseInt(primaryUserKey),
          currency_key: currencyKey,
          division_by_key: divisionKey,
          total_amount: parseFloat(totalAmount),
          expense_desc: desc.trim(),
          user_expense_secondary_share: secondary,
          expense_key: editExpense.expense_key,
        })
      } else {
        await createExpense({
          primary_user_key: parseInt(primaryUserKey),
          currency_key: currencyKey,
          division_by_key: divisionKey,
          total_amount: parseFloat(totalAmount),
          expense_desc: desc.trim(),
          user_expense_secondary_share: secondary,
        })
      }

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
              <h2 className="cp-title">{isEditing ? 'Edit Expense' : 'New Expense'}</h2>
              <p className="cp-subtitle">{isEditing ? 'Update expense details' : 'Split a cost with others'}</p>
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
              {showShares && (
                <div className="ce-participants-header-right">
                  <button
                    type="button"
                    className="ce-split-equally-btn"
                    onClick={handleAutoSplit}
                    disabled={participants.length === 0 || (isByAmount && (!totalAmount || isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) <= 0))}
                    title={isByAmount ? 'Distribute total amount equally among participants' : 'Distribute 100% equally among participants'}
                  >
                    <AutoSplitIcon />
                    Split equally
                  </button>
                  <span className="ce-col-hint">User / {isByAmount ? 'Amount' : '%'}</span>
                </div>
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

                  {showShares && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={`auth-input${errors[`p_${p.id}_share`] ? ' error' : ''}`}
                        placeholder={isByAmount ? '0.00' : '0'}
                        value={p.share}
                        onChange={e => updateParticipant(p.id, 'share', e.target.value)}
                        aria-label={`Participant ${idx + 1} ${isByAmount ? 'share amount' : 'percentage'}`}
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
            {loading ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Changes' : 'Create Expense')}
          </button>
        </form>
      </div>
    </div>
  )
}
