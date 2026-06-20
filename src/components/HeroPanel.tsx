import { useEffect, useRef, useState } from 'react'

interface Transaction {
  id: number
  left: number
  delay: number
  duration: number
  label: string
  amount: string
  category: string
  positive: boolean
}

interface Stat {
  label: string
  value: string
  detail: string
  color: string
}

const TRANSACTIONS: Transaction[] = [
  { id: 1, left: 5,  delay: 0,  duration: 23, label: 'Morning Coffee',   amount: '-$4.50',    category: 'Food & Drink',   positive: false },
  { id: 2, left: 22, delay: 5,  duration: 19, label: 'Netflix',           amount: '-$15.99',   category: 'Entertainment',  positive: false },
  { id: 3, left: 50, delay: 2,  duration: 26, label: 'Freelance Project', amount: '+$750.00',  category: 'Income',         positive: true  },
  { id: 4, left: 70, delay: 8,  duration: 21, label: 'Gym Membership',    amount: '-$49.00',   category: 'Health',         positive: false },
  { id: 5, left: 37, delay: 13, duration: 24, label: 'Grocery Run',       amount: '-$87.23',   category: 'Food & Drink',   positive: false },
  { id: 6, left: 14, delay: 17, duration: 20, label: 'Monthly Salary',    amount: '+$3,200',   category: 'Income',         positive: true  },
  { id: 7, left: 60, delay: 10, duration: 22, label: 'Electric Bill',     amount: '-$132.00',  category: 'Utilities',      positive: false },
  { id: 8, left: 82, delay: 15, duration: 18, label: 'Amazon Order',      amount: '-$23.99',   category: 'Shopping',       positive: false },
]

const STATS: Stat[] = [
  { label: 'Monthly Savings', value: '$1,247', detail: '+12.4% vs last mo.', color: '#4ade80' },
  { label: 'Transactions',    value: '284',    detail: 'tracked this month',  color: '#c9a96e' },
  { label: 'Budget Left',     value: '$934',   detail: '67% used · on track', color: '#60a5fa' },
]

export default function HeroPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)
  const [statsVisible, setStatsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 350)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const handleMouseMove = (e: MouseEvent) => {
      const rect = panel.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      if (gradientRef.current) {
        gradientRef.current.style.background = `radial-gradient(ellipse 52% 44% at ${x}% ${y}%, rgba(201,169,110,0.10) 0%, transparent 68%)`
      }
    }
    panel.addEventListener('mousemove', handleMouseMove)
    return () => panel.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={panelRef} className="hero-panel">

      {/* Mouse-tracking radial gradient */}
      <div
        ref={gradientRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 52% 44% at 35% 48%, rgba(201,169,110,0.10) 0%, transparent 68%)',
          transition: 'background 0.22s ease',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Ambient orbs */}
      <div className="hero-orb hero-orb-1" />
      <div className="hero-orb hero-orb-2" />
      <div className="hero-orb hero-orb-3" />

      {/* Dot grid texture */}
      <div className="dot-grid" />

      {/* Floating transaction cards */}
      <div className="float-stage">
        {TRANSACTIONS.map(tx => (
          <div
            key={tx.id}
            className="float-card"
            style={{
              left: `${tx.left}%`,
              animation: `float-card ${tx.duration}s linear ${tx.delay}s infinite`,
            }}
          >
            <div className="float-card-inner">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <span style={{
                  fontFamily: '"Outfit", sans-serif',
                  fontSize: '11.5px',
                  color: '#7878a8',
                  fontWeight: 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '96px',
                }}>{tx.label}</span>
                <span style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: tx.positive ? '#4ade80' : '#f87171',
                  whiteSpace: 'nowrap',
                }}>{tx.amount}</span>
              </div>
              <div style={{
                fontFamily: '"Outfit", sans-serif',
                fontSize: '10px',
                color: '#32324e',
                marginTop: '5px',
                letterSpacing: '0.03em',
              }}>{tx.category}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main hero content */}
      <div className="hero-content">

        {/* Top row: logo + live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="logo-mark">
            <div className="logo-icon">$</div>
            <span className="logo-name">ExpenseMgr</span>
          </div>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        </div>

        {/* Center: headline + subtext */}
        <div>
          <h1
            className="hero-headline"
            style={{ animation: 'fade-up 0.65s ease 0.1s both' }}
          >
            Take control<br />
            <em>of your finances.</em>
          </h1>
          <p
            className="hero-sub"
            style={{ animation: 'fade-up 0.65s ease 0.22s both' }}
          >
            Track every expense, visualize your spending patterns, and stay on
            budget — with a tool that makes finance feel effortless.
          </p>
        </div>

        {/* Bottom: stat cards */}
        <div className="stats-row">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-card${statsVisible ? ' visible' : ''}`}
              style={{ animationDelay: `${0.38 + i * 0.11}s` }}
            >
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-detail">{stat.detail}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
