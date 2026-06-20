import { useState, useEffect, useRef } from 'react'
import { changePassword } from '../services/userService'
import { ApiError } from '../lib/apiClient'

interface ChangePasswordModalProps {
  onClose: () => void
  onSuccess: () => void
}

const EyeIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const CheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function ChangePasswordModal({ onClose, onSuccess }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [reenterPassword, setReenterPassword] = useState('')

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showReenter, setShowReenter] = useState(false)

  const [errors, setErrors] = useState<{
    oldPassword?: string
    newPassword?: string
    reenterPassword?: string
  }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const oldPasswordRef = useRef<HTMLInputElement>(null)

  // Focus first input and trap scroll on mount
  useEffect(() => {
    const t = setTimeout(() => oldPasswordRef.current?.focus(), 60)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.body.style.overflow = prev
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const validate = () => {
    const errs: typeof errors = {}
    if (!oldPassword) errs.oldPassword = 'Current password is required'
    if (!newPassword) {
      errs.newPassword = 'New password is required'
    } else if (newPassword.length < 6) {
      errs.newPassword = 'Must be at least 6 characters'
    }
    if (!reenterPassword) {
      errs.reenterPassword = 'Please re-enter your new password'
    } else if (reenterPassword !== newPassword) {
      errs.reenterPassword = 'Passwords do not match'
    }
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setApiError(null)
    setLoading(true)
    try {
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        reenter_password: reenterPassword,
      })
      setSuccess(true)
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
    <div className="cp-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Change password">
      <div
        className="cp-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top accent bar */}
        <div className="cp-accent-bar" />

        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-left">
            <div className="cp-lock-icon">
              <LockIcon />
            </div>
            <div>
              <h2 className="cp-title">Change Password</h2>
              <p className="cp-subtitle">Update your account credentials</p>
            </div>
          </div>
          <button
            className="cp-close-btn"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="cp-success">
            <div className="cp-success-icon">
              <CheckIcon />
            </div>
            <h3 className="cp-success-title">Password changed!</h3>
            <p className="cp-success-msg">Your password has been updated. Please sign in again with your new password.</p>
            <button
              type="button"
              className="auth-submit"
              onClick={onSuccess}
              style={{ marginTop: '1.8rem' }}
            >
              Sign in again
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form className="cp-form" onSubmit={handleSubmit} noValidate>

            {/* Current password */}
            <div className="field-group">
              <label htmlFor="cp-old-password" className="field-label">Current Password</label>
              <div className="field-input-wrap">
                <input
                  ref={oldPasswordRef}
                  id="cp-old-password"
                  type={showOld ? 'text' : 'password'}
                  className={`auth-input has-toggle${errors.oldPassword ? ' error' : ''}`}
                  placeholder="••••••••"
                  value={oldPassword}
                  autoComplete="current-password"
                  onChange={e => {
                    setOldPassword(e.target.value)
                    if (errors.oldPassword) setErrors(p => ({ ...p, oldPassword: undefined }))
                    if (apiError) setApiError(null)
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowOld(v => !v)}
                  aria-label={showOld ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showOld ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.oldPassword && (
                <div className="field-error" role="alert">{errors.oldPassword}</div>
              )}
            </div>

            {/* Divider */}
            <div className="cp-divider" />

            {/* New password */}
            <div className="field-group">
              <label htmlFor="cp-new-password" className="field-label">New Password</label>
              <div className="field-input-wrap">
                <input
                  id="cp-new-password"
                  type={showNew ? 'text' : 'password'}
                  className={`auth-input has-toggle${errors.newPassword ? ' error' : ''}`}
                  placeholder="min. 6 characters"
                  value={newPassword}
                  autoComplete="new-password"
                  onChange={e => {
                    setNewPassword(e.target.value)
                    if (errors.newPassword) setErrors(p => ({ ...p, newPassword: undefined }))
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNew(v => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.newPassword && (
                <div className="field-error" role="alert">{errors.newPassword}</div>
              )}
            </div>

            {/* Re-enter new password */}
            <div className="field-group">
              <label htmlFor="cp-reenter-password" className="field-label">Confirm New Password</label>
              <div className="field-input-wrap">
                <input
                  id="cp-reenter-password"
                  type={showReenter ? 'text' : 'password'}
                  className={`auth-input has-toggle${errors.reenterPassword ? ' error' : ''}`}
                  placeholder="re-enter new password"
                  value={reenterPassword}
                  autoComplete="new-password"
                  onChange={e => {
                    setReenterPassword(e.target.value)
                    if (errors.reenterPassword) setErrors(p => ({ ...p, reenterPassword: undefined }))
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowReenter(v => !v)}
                  aria-label={showReenter ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showReenter ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.reenterPassword && (
                <div className="field-error" role="alert">{errors.reenterPassword}</div>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div className="cp-api-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? (
                <span style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(7,7,26,0.25)',
                  borderTopColor: '#07071a',
                  borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite',
                  verticalAlign: 'middle',
                }} />
              ) : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
