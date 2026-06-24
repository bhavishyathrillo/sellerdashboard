'use client'

import { useState, useEffect } from 'react'
import IntroScreen from '@/components/ui/IntroScreen'
import LoginForm from '@/components/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PipelineGate from '@/components/ui/PipelineGate'
import ThrillNews from '@/components/ui/ThrillNews'
import AutoRefresh from '@/components/ui/AutoRefresh'
import { getSession, saveSession, clearSession, UserSession } from '@/lib/session'

import HomePage from '@/components/pages/HomePage'
import L1HomePage from '@/components/pages/L1HomePage'
import AdminOverviewPage from '@/components/pages/AdminOverviewPage'
import AdminPerformancePage from '@/components/pages/AdminPerformancePage'
import AdminMHLPage from '@/components/pages/AdminMHLPage'
import AdminPipelinePage from '@/components/pages/AdminPipelinePage'
import AdminHygienePage from '@/components/pages/AdminHygienePage'
import SelectPersonaPage from '@/components/pages/SelectPersonaPage'
import PipelinePage from '@/components/pages/PipelinePage'
import MHLPage from '@/components/pages/MHLPage'
import LeaderboardPage from '@/components/pages/LeaderboardPage'
import RoadmapPage from '@/components/pages/RoadmapPage'
import HygienePage from '@/components/pages/HygienePage'
import RewardsPage from '@/components/pages/RewardsPage'
import CalendarPage from '@/components/pages/CalendarPage'
import PerformancePage from '@/components/pages/PerformancePage'
import TTKPage from '@/components/pages/TTKPage'
import PriorityPage from '@/components/pages/PriorityPage'
import TeamPage from '@/components/pages/TeamPage'

type AppState = 'intro' | 'login' | 'pipeline_gate' | 'dashboard'

const GATED_ROLES = ['SELLER', 'L2']

export default function Home() {
  const [state, setState] = useState<AppState>('intro')
  const [session, setSession] = useState<UserSession | null>(null)
  const [checked, setChecked] = useState(false)
  const [activePage, setActivePage] = useState('home')

  useEffect(() => {
    const existing = getSession()
    if (existing) {
      setSession(existing)
      const savedTab = localStorage.getItem('activeTab')
      if (savedTab) setActivePage(savedTab)
      if (GATED_ROLES.includes(existing.role) && !['ADMIN', 'SUPERADMIN'].includes(existing.role)) {
        checkPipelineAndRoute(existing)
      } else {
        setState('dashboard')
      }
    }
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

  const checkPipelineAndRoute = async (s: UserSession) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/pipeline/check?email=${s.email}&date=${today}`)
      const json = await res.json()
      setState(json.submitted ? 'dashboard' : 'pipeline_gate')
    } catch {
      setState('pipeline_gate')
    }
  }

  const handleIntroComplete = () => setState('login')

 const handleLogin = async (email: string, name: string, role: string) => {
    saveSession(email, name, role)
    const s = getSession()
    setSession(s)
    localStorage.setItem('activeTab', 'home')
    setActivePage('home')
    if (GATED_ROLES.includes(role) && !['ADMIN', 'SUPERADMIN'].includes(role)) {
      await checkPipelineAndRoute(s!)
    } else {
      setState('dashboard')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_viewing')
    clearSession()
    setSession(null)
    setState('login')
  }

  const handleNavigate = (page: string) => {
    localStorage.setItem('activeTab', page)
    setActivePage(page)
  }

  const handlePipelineSubmitted = () => {
    setState('dashboard')
    setActivePage('home')
    localStorage.setItem('activeTab', 'home')
  }

  if (!checked) return null

  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(session?.role || '')

  return (
    <>
      {state === 'intro' && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {state === 'login' && (
        <LoginForm onLogin={handleLogin} />
      )}

      {state === 'pipeline_gate' && session && (
        <PipelineGate
          session={session}
          onSubmitted={handlePipelineSubmitted}
          onLogout={handleLogout}
        />
      )}

      {state === 'dashboard' && session && (
        <DashboardLayout
          session={session}
          onLogout={handleLogout}
          activePage={activePage}
          onNavigate={handleNavigate}
        >
          {!isAdmin && <ThrillNews email={session.email} role={session.role} />}
          <AutoRefresh interval={300000} />

          {activePage === 'selectPersona' && isAdmin && (
            <SelectPersonaPage session={session} />
          )}

          {activePage === 'home' && isAdmin && (
            <AdminOverviewPage />
          )}

          {activePage === 'home' && !isAdmin && session.role === 'L1' && (
            <L1HomePage session={session} />
          )}

          {activePage === 'home' && !isAdmin && session.role !== 'L1' && (
            <HomePage session={session} />
          )}

          {activePage === 'performance' && isAdmin && (
            <AdminPerformancePage />
          )}
          {activePage === 'performance' && !isAdmin && (
            <PerformancePage session={session} />
          )}

          {activePage === 'mhl' && isAdmin && (
            <AdminMHLPage />
          )}
          {activePage === 'mhl' && !isAdmin && (
            <MHLPage session={session} />
          )}

          {activePage === 'pipeline' && isAdmin && (
            <AdminPipelinePage />
          )}
          {activePage === 'pipeline' && !isAdmin && (
            <PipelinePage session={session} />
          )}

          {activePage === 'hygiene' && isAdmin && (
            <AdminHygienePage />
          )}
          {activePage === 'hygiene' && !isAdmin && (
            <HygienePage session={session} />
          )}

          {activePage === 'priority' && (
            <PriorityPage session={session} />
          )}

          {activePage === 'leaderboard' && <LeaderboardPage session={session} />}
          {activePage === 'roadmap'     && <RoadmapPage session={session} />}
          {activePage === 'rewards'     && <RewardsPage session={session} />}
          {activePage === 'calendar'    && <CalendarPage session={session} />}
          {activePage === 'ttk'         && <TTKPage />}
          {activePage === 'team'        && <TeamPage session={session} />}
        </DashboardLayout>
      )}
    </>
  )
}