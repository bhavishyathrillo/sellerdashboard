'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import IntroScreen from '@/components/ui/IntroScreen'
import LoginForm from '@/features/auth/LoginForm'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PipelineGate from '@/components/ui/PipelineGate'
import ThrillNews from '@/components/ui/ThrillNews'
import { getSession, saveSession, clearSession, UserSession } from '@/lib/session'

import { SessionTracker } from '@/hooks/useSessionTracker'

const HomePage = dynamic(() => import('@/features/shared/HomePage'))
const L1HomePage = dynamic(() => import('@/features/tl/L1HomePage'))
const AdminOverviewPage = dynamic(() => import('@/features/admin/AdminOverviewPage'))
const AdminLTAPage = dynamic(() => import('@/features/admin/AdminLTAPage'))
const AdminPerformancePage = dynamic(() => import('@/features/admin/AdminPerformancePage'))
const AdminMHLPage = dynamic(() => import('@/features/admin/AdminMHLPage'))
const AdminPipelinePage = dynamic(() => import('@/features/admin/AdminPipelinePage'))
const AdminHygienePage = dynamic(() => import('@/features/admin/AdminHygienePage'))
const SelectPersonaPage = dynamic(() => import('@/features/shared/SelectPersonaPage'))
const CMSelectPersonaPage = dynamic(() => import('@/features/cm/CMSelectPersonaPage'))
const PipelinePage = dynamic(() => import('@/features/shared/PipelinePage'))
const MHLPage = dynamic(() => import('@/features/shared/MHLPage'))
const LeaderboardPage = dynamic(() => import('@/features/shared/LeaderboardPage'))
const RoadmapPage = dynamic(() => import('@/features/shared/RoadmapPage'))
const HygienePage = dynamic(() => import('@/features/shared/HygienePage'))
const RewardsPage = dynamic(() => import('@/features/shared/RewardsPage'))
const CalendarPage = dynamic(() => import('@/features/shared/CalendarPage'))
const PerformancePage = dynamic(() => import('@/features/shared/PerformancePage'))
const TTKPage = dynamic(() => import('@/features/shared/TTKPage'))
const PriorityPage = dynamic(() => import('@/features/shared/PriorityPage'))
const TeamPage = dynamic(() => import('@/features/shared/TeamPage'))
const SellerViewPage = dynamic(() => import('@/features/seller/SellerViewPage'))
const L2SellerViewPage = dynamic(() => import('@/features/cm/L2SellerViewPage'))
const L1SellerViewPage = dynamic(() => import('@/features/tl/L1SellerViewPage'))
const KPITab = dynamic(() => import('@/features/kpi/KPITab'))
const AdoptionPage = dynamic(() => import('@/features/shared/AdoptionPage'))
const ProfilePage = dynamic(() => import('@/features/shared/ProfilePage'))

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
      const today = new Date(Date.now() + 19800000).toISOString().split('T')[0]
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
    
    import('@/lib/trackAction').then(({ trackAction }) => {
      trackAction(email, 'LOGIN', { name, role })
    })

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
          <SessionTracker email={session.email} activeTab={activePage} />
          {!isAdmin && <ThrillNews email={session.email} role={session.role} />}
          {/* AutoRefresh removed to save Vercel Quota */}

          {activePage === 'selectPersona' && isAdmin && (
            <SelectPersonaPage session={session} />
          )}
          {activePage === 'selectPersona' && session.role === 'L1' && (
            <CMSelectPersonaPage session={session} />
          )}

          {activePage === 'adoption' && (isAdmin || session.role === 'L1') && (
            <AdoptionPage session={session} />
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

          {activePage === 'priority' && (
            <PriorityPage session={session} />
          )}

          {activePage === 'roadmap' && <RoadmapPage session={session} />}

          {activePage === 'home' && isAdmin && (
            <AdminOverviewPage session={session} />
          )}
          {activePage === 'seller-view' && isAdmin && (
            <AdminLTAPage session={session} />
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

          {activePage === 'hygiene' && isAdmin && (
            <AdminHygienePage />
          )}
          {activePage === 'hygiene' && !isAdmin && (
            <HygienePage session={session} />
          )}

          {activePage === 'seller-view' && !isAdmin && session.role === 'L1' && (
            <L1SellerViewPage session={session} />
          )}

          {activePage === 'seller-view' && !isAdmin && session.role === 'L2' && (
            <L2SellerViewPage session={session} />
          )}

          {activePage === 'seller-view' && !isAdmin && session.role !== 'L1' && session.role !== 'L2' && (
            <SellerViewPage session={session} />
          )}
          {activePage === 'leaderboard' && <LeaderboardPage session={session} />}
          {activePage === 'rewards' && <RewardsPage session={session} />}
          {activePage === 'calendar' && <CalendarPage session={session} />}
          {activePage === 'ttk' && <TTKPage />}
          {activePage === 'team' && <TeamPage session={session} />}
          {activePage === 'profile' && <ProfilePage session={session} onBack={() => setActivePage('home')} />}

          {/* KPI VIEW TAB */}
          {activePage === 'kpi_view' && (
            <KPITab user={{
              email: session.email,
              name: session.name,
              role: session.role === 'L2' ? 'L1 Manager' :
                session.role === 'L1' ? 'L2 Manager' :
                  session.role === 'ADMIN' || session.role === 'SUPERADMIN' ? 'Admin' :
                    'Seller'
            }} />
          )}
        </DashboardLayout>
      )}
    </>
  )
}