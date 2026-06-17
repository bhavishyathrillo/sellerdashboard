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
import PipelinePage from '@/components/pages/PipelinePage'
import MHLPage from '@/components/pages/MHLPage'
import LeaderboardPage from '@/components/pages/LeaderboardPage'
import RoadmapPage from '@/components/pages/RoadmapPage'
import HygienePage from '@/components/pages/HygienePage'
import AdminPage from '@/components/pages/AdminPage'
import RewardsPage from '@/components/pages/RewardsPage'
import CalendarPage from '@/components/pages/CalendarPage'
import PerformancePage from '@/components/pages/PerformancePage'

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
      if (GATED_ROLES.includes(existing.role)) {
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
    if (GATED_ROLES.includes(role)) {
      await checkPipelineAndRoute(s!)
    } else {
      setState('dashboard')
    }
  }

  const handleLogout = () => {
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
          <ThrillNews email={session.email} role={session.role} />
          <AutoRefresh interval={300000} />
          
          {activePage === 'home' && (
            session.role === 'L1' 
              ? <L1HomePage session={session} />
              : <HomePage session={session} />
          )}
          {activePage === 'pipeline'    && <PipelinePage session={session} />}
          {activePage === 'mhl'         && <MHLPage session={session} />}
          {activePage === 'leaderboard' && <LeaderboardPage session={session} />}
          {activePage === 'roadmap'     && <RoadmapPage session={session} />}
          {activePage === 'hygiene'     && <HygienePage session={session} />}
          {activePage === 'rewards'     && <RewardsPage session={session} />}
          {activePage === 'calendar'    && <CalendarPage session={session} />}
          {activePage === 'performance' && <PerformancePage session={session} />}
          {activePage === 'admin'       && <AdminPage session={session} />}
       
          {activePage === 'team'        && <TeamPage session={session} />}
        </DashboardLayout>
      )}
    </>
  )
}