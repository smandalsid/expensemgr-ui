import { useState, useRef, useEffect } from 'react'
import type { AuthMode } from '../App'
import { useAuth } from '../context/AuthContext'
import { login, register } from '../services/authService'
import { ApiError } from '../lib/apiClient'

interface AuthPanelProps {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
}

const EyeIcon = () => (
  <svg
    width="17" height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg
    width="17" height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const LoadingSpinner = () => (
  <span style={{
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(7,7,26,0.25)',
    borderTopColor: '#07071a',
    borderRadius: '50%',
    animation: 'spin 0.65s linear infinite',
  }} />
)

export default function AuthPanel({ mode, onModeChange }: AuthPanelProps) {
  const { saveToken, storeCredentials } = useAuth()
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    username?: string
    firstName?: string
    lastName?: string
    email?: string
    phoneNumber?: string
    password?: string
    confirmPassword?: string
  }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFormKey(k => k + 1)
    setErrors({})
    setApiError(null)
    setShowPassword(false)
    setShowConfirmPassword(false)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhoneNumber('')
    setConfirmPassword('')
    // Small delay to let the animation play before focusing
    const t = setTimeout(() => usernameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [mode])

  const validate = () => {
    const errs: typeof errors = {}
    if (!username.trim()) {
      errs.username = 'Username is required'
    } else if (username.trim().length < 3) {
      errs.username = 'Must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      errs.username = 'Only letters, numbers, _ . - allowed'
    }
    if (mode === 'signup') {
      if (!firstName.trim()) errs.firstName = 'First name is required'
      if (!lastName.trim()) errs.lastName = 'Last name is required'
      if (!email.trim()) {
        errs.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = 'Enter a valid email address'
      }
      if (!phoneNumber.trim()) {
        errs.phoneNumber = 'Phone number is required'
      } else if (!/^[+\d][\d\s\-().]{6,19}$/.test(phoneNumber.trim())) {
        errs.phoneNumber = 'Enter a valid phone number'
      }
    }
    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 6) {
      errs.password = 'Must be at least 6 characters'
    }
    if (mode === 'signup') {
      if (!confirmPassword) {
        errs.confirmPassword = 'Please confirm your password'
      } else if (confirmPassword !== password) {
        errs.confirmPassword = 'Passwords do not match'
      }
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
      if (mode === 'signup') {
        await register({
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone_number: phoneNumber.trim(),
          password,
          retyped_password: confirmPassword,
        })
        onModeChange('login')
      } else {
        const { access_token } = await login(username.trim(), password)
        saveToken(access_token)
        storeCredentials(username.trim(), password)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (mode === 'login' && err.status === 401) {
          setApiError('Invalid username or password.')
        } else {
          setApiError(err.message)
        }
      } else {
        setApiError('Unable to reach the server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const headings = {
    login:  { title: 'Welcome back.',   sub: 'Sign in to your account'    },
    signup: { title: 'Start fresh.',    sub: 'Create your free account'   },
  }

  return (
    <div className="auth-panel">
      <div className="auth-card">

        {/* Mobile-only logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">$</div>
          <span className="auth-logo-name">ExpenseMgr</span>
        </div>

        {/* Heading block */}
        <h2 className="auth-heading">{headings[mode].title}</h2>
        <p className="auth-subheading">{headings[mode].sub}</p>

        {/* Login / Sign up toggle */}
        <div className="mode-toggle" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`mode-btn${mode === 'login' ? ' active' : ''}`}
            onClick={() => onModeChange('login')}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`mode-btn${mode === 'signup' ? ' active' : ''}`}
            onClick={() => onModeChange('signup')}
          >
            Sign up
          </button>
        </div>

        {/* Auth form — key forces re-animation on mode change */}
        <form key={formKey} className="auth-form" onSubmit={handleSubmit} noValidate>

          {/* Username */}
          <div className="field-group">
            <label htmlFor="em-username" className="field-label">Username</label>
            <div className="field-input-wrap">
              <input
                ref={usernameRef}
                id="em-username"
                type="text"
                className={`auth-input${errors.username ? ' error' : ''}`}
                placeholder="your_username"
                value={username}
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                onChange={e => {
                  setUsername(e.target.value)
                  if (errors.username) setErrors(p => ({ ...p, username: undefined }))
                }}
              />
            </div>
            {errors.username && (
              <div className="field-error" role="alert">{errors.username}</div>
            )}
          </div>

          {/* Signup-only fields */}
          {mode === 'signup' && (
            <>
              <div className="field-group">
                <label htmlFor="em-first-name" className="field-label">First Name</label>
                <div className="field-input-wrap">
                  <input
                    id="em-first-name"
                    type="text"
                    className={`auth-input${errors.firstName ? ' error' : ''}`}
                    placeholder="Jane"
                    value={firstName}
                    autoComplete="given-name"
                    onChange={e => {
                      setFirstName(e.target.value)
                      if (errors.firstName) setErrors(p => ({ ...p, firstName: undefined }))
                    }}
                  />
                </div>
                {errors.firstName && (
                  <div className="field-error" role="alert">{errors.firstName}</div>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="em-last-name" className="field-label">Last Name</label>
                <div className="field-input-wrap">
                  <input
                    id="em-last-name"
                    type="text"
                    className={`auth-input${errors.lastName ? ' error' : ''}`}
                    placeholder="Doe"
                    value={lastName}
                    autoComplete="family-name"
                    onChange={e => {
                      setLastName(e.target.value)
                      if (errors.lastName) setErrors(p => ({ ...p, lastName: undefined }))
                    }}
                  />
                </div>
                {errors.lastName && (
                  <div className="field-error" role="alert">{errors.lastName}</div>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="em-email" className="field-label">Email</label>
                <div className="field-input-wrap">
                  <input
                    id="em-email"
                    type="email"
                    className={`auth-input${errors.email ? ' error' : ''}`}
                    placeholder="jane@example.com"
                    value={email}
                    autoComplete="email"
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={e => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors(p => ({ ...p, email: undefined }))
                    }}
                  />
                </div>
                {errors.email && (
                  <div className="field-error" role="alert">{errors.email}</div>
                )}
              </div>

              <div className="field-group">
                <label htmlFor="em-phone" className="field-label">Phone Number</label>
                <div className="field-input-wrap">
                  <input
                    id="em-phone"
                    type="tel"
                    className={`auth-input${errors.phoneNumber ? ' error' : ''}`}
                    placeholder="98XXXXXX76"
                    value={phoneNumber}
                    autoComplete="tel"
                    onChange={e => {
                      setPhoneNumber(e.target.value)
                      if (errors.phoneNumber) setErrors(p => ({ ...p, phoneNumber: undefined }))
                    }}
                  />
                </div>
                {errors.phoneNumber && (
                  <div className="field-error" role="alert">{errors.phoneNumber}</div>
                )}
              </div>
            </>
          )}

          {/* Password */}
          <div className="field-group">
            <label htmlFor="em-password" className="field-label">Password</label>
            <div className="field-input-wrap">
              <input
                id="em-password"
                type={showPassword ? 'text' : 'password'}
                className={`auth-input has-toggle${errors.password ? ' error' : ''}`}
                placeholder={mode === 'login' ? '••••••••' : 'min. 6 characters'}
                value={password}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={e => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors(p => ({ ...p, password: undefined }))
                }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <div className="field-error" role="alert">{errors.password}</div>
            )}
          </div>

          {/* Confirm Password — signup only */}
          {mode === 'signup' && (
            <div className="field-group">
              <label htmlFor="em-confirm-password" className="field-label">Confirm Password</label>
              <div className="field-input-wrap">
                <input
                  id="em-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`auth-input has-toggle${errors.confirmPassword ? ' error' : ''}`}
                  placeholder="re-enter password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined }))
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="field-error" role="alert">{errors.confirmPassword}</div>
              )}
            </div>
          )}

          {/* API-level error */}
          {apiError && (
            <div className="field-error" role="alert" style={{ textAlign: 'center' }}>
              {apiError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
              }}>
                <LoadingSpinner />
                {mode === 'login' ? 'Signing in…' : 'Creating account…'}
              </span>
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Switch mode */}
        <div className="auth-footer">
          {mode === 'login'
            ? "Don't have an account?"
            : 'Already have an account?'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Sign up free' : 'Log in'}
          </button>
        </div>

      </div>
    </div>
  )
}
