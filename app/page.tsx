'use client'
import PipelinePage from '@/components/pages/PipelinePage'
import { useState, useEffect } from 'react'
import IntroScreen from '@/components/ui/IntroScreen'
import LoginForm from '@/components/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getSession, saveSession, clearSession, UserSession } from '@/lib/session'
import HomePage from '@/components/pages/HomePage'
import MHLPage from '@/components/pages/MHLPage'
import LeaderboardPage from '@/components/pages/LeaderboardPage'
import RoadmapPage from '@/components/pages/RoadmapPage'
import HygienePage from '@/components/pages/HygienePage'
import AdminPage from '@/components/pages/AdminPage'
import RewardsPage from '@/components/pages/RewardsPage'
import CalendarPage from '@/components/pages/CalendarPage'
import PerformancePage from '@/components/pages/PerformancePage'
import TTKPage from '@/components/pages/TTKPage'
import ThrillNews from '@/components/ui/ThrillNews'
import AutoRefresh from '@/components/ui/AutoRefresh'
type AppState = 'intro' | 'login' | 'dashboard'

export default function Home() {
  const [state, setState] = useState<AppState>('intro')
  const [session, setSession] = useState<UserSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [activePage, setActivePage] = useState('home')

  useEffect(() => {
    const existing = getSession()
    if (existing) { setSession(existing); setState('dashboard') }
    // Restore last active tab
    const savedTab = localStorage.getItem('activeTab')
    if (savedTab) setActivePage(savedTab)
    setChecked(true)
  }, [])

  useEffect(() => {
    if (state !== 'dashboard') return
    const interval = setInterval(() => {
      const s = getSession()
      if (!s) { setSession(null); setState('login') }
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [state])

  const handleIntroComplete = () => setState('login')
  const handleLogin = (email: string, name: string, role: string) => {
    saveSession(email, name, role)
    setSession(getSession())
    setState('dashboard')
  }
  const handleLogout = () => { clearSession(); setSession(null); setState('login') }

  const handleNavigate = (page: string) => {
    localStorage.setItem('activeTab', page)
    setActivePage(page)
  }

  if (!checked) return null

  return (
    <>
      {state === 'intro' && <IntroScreen onComplete={handleIntroComplete} />}
      {state === 'login' && <LoginForm onLogin={handleLogin} />}
      {state === 'dashboard' && session && (
        <DashboardLayout session={session} onLogout={handleLogout} activePage={activePage} onNavigate={handleNavigate}>
          <ThrillNews email={session.email} role={session.role} />
          <AutoRefresh interval={300000} />
          {activePage === 'home' && <HomePage session={session} />}
          {activePage === 'pipeline' && <PipelinePage session={session} />}
          {activePage === 'mhl' && <MHLPage session={session} />}
          {activePage === 'leaderboard' && <LeaderboardPage session={session} />}
          {activePage === 'roadmap' && <RoadmapPage session={session} />}
          {activePage === 'hygiene' && <HygienePage session={session} />}
          {activePage === 'rewards' && <RewardsPage session={session} />}
          {activePage === 'calendar' && <CalendarPage session={session} />}
          {activePage === 'performance' && <PerformancePage session={session} />}
          {activePage === 'admin' && <AdminPage session={session} />}
        </DashboardLayout>
      )}
    </>
  )
}