'use client'

import { useState, useEffect } from 'react'
import IntroScreen from '@/components/ui/IntroScreen'
import LoginForm from '@/components/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getSession, saveSession, clearSession, UserSession } from '@/lib/session'
import HomePage from '@/components/pages/HomePage'
type AppState = 'intro' | 'login' | 'dashboard'

export default function Home() {
  const [state, setState] = useState<AppState>('intro')
  const [session, setSession] = useState<UserSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [activePage, setActivePage] = useState('home')

  useEffect(() => {
    const existing = getSession()
    if (existing) {
      setSession(existing)
      setState('dashboard')
    }
    setChecked(true)
  }, [])

  useEffect(() => {
    if (state !== 'dashboard') return
    const interval = setInterval(() => {
      const s = getSession()
      if (!s) {
        setSession(null)
        setState('login')
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [state])

  const handleIntroComplete = () => setState('login')

  const handleLogin = (email: string, name: string, role: string) => {
    saveSession(email, name, role)
    setSession(getSession())
    setState('dashboard')
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
    setState('login')
  }

  if (!checked) return null

  return (
    <>
      {state === 'intro' && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {state === 'login' && (
        <LoginForm onLogin={handleLogin} />
      )}

  {state === 'dashboard' && session && (
  <DashboardLayout
    session={session}
    onLogout={handleLogout}
    activePage={activePage}
    onNavigate={setActivePage}
  >
    {activePage === 'home' && <HomePage session={session} />}
    {activePage !== 'home' && (
      <div style={{ color: '#4A4642', fontSize: '0.8rem' }}>
        {activePage} — coming next
      </div>
    )}
  </DashboardLayout>
)}
    </>
  )
}