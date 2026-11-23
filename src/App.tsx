import { useCallback, useEffect, useState } from 'react'
import HeroPanel from './components/HeroPanel'
import AuthPanel from './components/AuthPanel'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import type { AppView } from './components/AppShell'
import { AuthProvider, useAuth } from './context/AuthContext'

export type AuthMode = 'login' | 'signup'

function viewFromHash(): AppView {
  return window.location.hash === '#/history' ? 'history' : 'home'
}

function FullScreenLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07071a',
    }}>
      <span style={{
        display: 'inline-block',
        width: '28px',
        height: '28px',
        border: '2px solid rgba(201,169,110,0.18)',
        borderTopColor: '#c9a96e',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }} />
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated, userLoading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [view, setView] = useState<AppView>(viewFromHash)

  // Hash keeps the active tab across refresh and makes the browser back button switch tabs.
  useEffect(() => {
    const onHashChange = () => setView(viewFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: AppView) => {
    window.location.hash = next === 'history' ? '/history' : '/'
  }, [])

  if (userLoading) return <FullScreenLoader />
  if (isAuthenticated) {
    return view === 'history'
      ? <HistoryPage onNavigate={navigate} />
      : <HomePage onNavigate={navigate} />
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', overflow: 'hidden' }}>
      <HeroPanel />
      <AuthPanel mode={mode} onModeChange={setMode} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
