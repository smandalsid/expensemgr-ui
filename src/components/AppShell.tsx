import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'
import ChangePasswordModal from './ChangePasswordModal'

export type AppView = 'home' | 'history'

const TABS: { view: AppView; label: string; icon: ReactNode }[] = [
  {
    view: 'home',
    label: 'Home',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
      </svg>
    ),
  },
  {
    view: 'history',
    label: 'History',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
]

interface AppShellProps {
  activeView: AppView
  onViewChange: (view: AppView) => void
  /** Used for the nav avatar/name when the /users profile hasn't loaded or failed. */
  fallbackName?: string
  children: ReactNode
}

export default function AppShell({ activeView, onViewChange, fallbackName = '', children }: AppShellProps) {
  const { clearToken, user } = useAuth()
  const [showChangePassword, setShowChangePassword] = useState(false)

  const fullName = user ? `${user.first_name} ${user.last_name}` : fallbackName

  return (
    <div className="home-page">

      <nav className="home-nav" aria-label="Account">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px',
            background: 'linear-gradient(135deg, #c9a96e 0%, #8a6534 100%)',
            borderRadius: '7px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '13px', color: '#07071a', fontWeight: 600,
          }}>$</div>
          <span className="home-nav-brand" style={{
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
              {fullName ? initials(fullName) : '…'}
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
          <button onClick={clearToken} className="home-nav-signout">
            Sign out
          </button>
        </div>
      </nav>

      {/* Sits outside the blurred nav: backdrop-filter would trap its fixed positioning on mobile. */}
      <nav className="app-tabs" aria-label="Primary" data-active={activeView}>
        <span className="app-tabs-indicator" aria-hidden="true" />
        {TABS.map(tab => (
          <button
            key={tab.view}
            type="button"
            className={`app-tab${tab.view === activeView ? ' active' : ''}`}
            aria-current={tab.view === activeView ? 'page' : undefined}
            onClick={() => onViewChange(tab.view)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {children}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={clearToken}
        />
      )}
    </div>
  )
}
