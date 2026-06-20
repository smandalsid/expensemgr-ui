import { useState } from 'react'
import HeroPanel from './components/HeroPanel'
import AuthPanel from './components/AuthPanel'
import HomePage from './pages/HomePage'
import { AuthProvider, useAuth } from './context/AuthContext'

export type AuthMode = 'login' | 'signup'

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

  if (userLoading) return <FullScreenLoader />
  if (isAuthenticated) return <HomePage />

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
