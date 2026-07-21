'use client'

import { useState, useEffect } from 'react'
import { UserSession } from '@/lib/session'
import HomePage from '@/features/shared/HomePage'
import L1HomePage from '@/features/tl/L1HomePage'
import L1SellerViewPage from '@/features/tl/L1SellerViewPage'
import L2SellerViewPage from '@/features/cm/L2SellerViewPage'
import SellerViewPage from '@/features/seller/SellerViewPage'
import PipelinePage from '@/features/shared/PipelinePage'
import PriorityPage from '@/features/shared/PriorityPage'
import LeaderboardPage from '@/features/shared/LeaderboardPage'
import PerformancePage from '@/features/shared/PerformancePage'
import RewardsPage from '@/features/shared/RewardsPage'
import MHLPage from '@/features/shared/MHLPage'
import RoadmapPage from '@/features/shared/RoadmapPage'
import HygienePage from '@/features/shared/HygienePage'
import KPITab from '@/features/kpi/KPITab'

interface Props {
  session: UserSession
}

const personaTabs = [
  { id: 'home', label: 'Overview' },
  { id: 'seller-view', label: 'LTA' },
  { id: 'priority', label: 'QB Stats' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'mhl', label: 'MHL' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'hygiene', label: 'Hygiene' },
  { id: 'kpi_view', label: 'KPI View' },
]

export default function CMSelectPersonaPage({ session }: Props) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [activePersonaTab, setActivePersonaTab] = useState('home')

  // Restore popup after page refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cm_persona_popup')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSelectedUser(parsed.user)
        setActivePersonaTab(parsed.tab || 'home')
        setShowModal(true)
      }
    } catch { }
  }, [])

  // Auto-load all members on mount
  useEffect(() => {
    handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getCosmeticRole = (role: string) => {
    switch (role) {
      case 'L1': return 'Category Manager'
      case 'L2': return 'L1 Manager'
      case 'ADMIN': return 'Admin'
      case 'SUPERADMIN': return 'Super Admin'
      case 'MODERATOR': return 'Moderator'
      default: return 'Seller'
    }
  }

  const personaSession: UserSession | null = selectedUser ? {
    email: selectedUser.email,
    name: selectedUser.name,
    role: selectedUser.role,
    loginTime: Date.now(),
    lastActive: Date.now()
  } : null

  const handleSearch = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/seller/cm-search?l1Email=${encodeURIComponent(session.email)}&q=${encodeURIComponent(search)}`)
      const data = await res.json()
      setResults(data.users || [])
    } catch { }
    setLoading(false)
  }

  const handleViewPersona = (user: any) => {
    setSelectedUser(user)
    setShowModal(true)
    setActivePersonaTab('home')
    localStorage.setItem('cm_persona_popup', JSON.stringify({ user, tab: 'home' }))
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    localStorage.removeItem('cm_persona_popup')
  }

  const handleTabChange = (tabId: string) => {
    setActivePersonaTab(tabId)
    try {
      const saved = localStorage.getItem('cm_persona_popup')
      if (saved) {
        const parsed = JSON.parse(saved)
        parsed.tab = tabId
        localStorage.setItem('cm_persona_popup', JSON.stringify(parsed))
      }
    } catch { }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto', color: '#F0EDE8' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C', marginBottom: '8px' }}>Select Persona</h1>
      <p style={{ fontSize: '0.72rem', color: '#8A8278', marginBottom: '20px' }}>Search for a user to view their complete dashboard</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name or email..."
          style={{
            flex: 1,
            padding: '12px 16px',
            background: '#141414',
            border: '1px solid #232323',
            borderRadius: '10px',
            color: '#F0EDE8',
            fontSize: '0.85rem',
            outline: 'none'
          }}
        />
        <button onClick={handleSearch} disabled={loading} style={{
          padding: '12px 24px',
          background: '#F4631E',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map((user: any) => (
            <div key={user.email} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#141414',
              border: '1px solid #232323',
              borderRadius: '12px',
              transition: 'all 0.2s'
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{user.name}</span>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>{user.email} · {user.role === 'L2' ? 'Team Lead' : user.role === 'L1' ? 'Category Manager' : 'Seller'}</span>
              </div>
              <button onClick={() => handleViewPersona(user)} style={{
                padding: '8px 18px',
                background: '#22C55E',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                View Dashboard
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8A8278' }}>
          <p style={{ fontSize: '0.9rem' }}>No users found</p>
        </div>
      )}

      {/* FULL DASHBOARD POPUP */}
      {showModal && personaSession && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div onClick={handleCloseModal} style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(6px)'
          }} />

          <div style={{
            position: 'relative',
            width: '98vw',
            maxWidth: '1400px',
            height: '95vh',
            background: '#080808',
            border: '1px solid #232323',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 100px rgba(0,0,0,0.8)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid #1A1A1A',
              background: '#0D0D0D',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F0EDE8' }}>
                    {selectedUser.name}'s Dashboard
                  </h2>
                  <p style={{ fontSize: '0.62rem', color: '#8A8278' }}>
                    {selectedUser.email} · {getCosmeticRole(selectedUser.role)} · View Only
                  </p>
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: 'rgba(239,68,68,0.12)',
                  borderRadius: '12px',
                  color: '#EF4444',
                  fontSize: '0.6rem',
                  fontWeight: 600
                }}>
                  READ ONLY
                </div>
              </div>
              <button onClick={handleCloseModal} style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid #333',
                background: 'transparent',
                color: '#8A8278',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>✕</button>
            </div>

            {/* Tab Bar */}
            <div style={{
              display: 'flex',
              gap: '2px',
              padding: '8px 16px',
              borderBottom: '1px solid #1A1A1A',
              background: '#0D0D0D',
              overflowX: 'auto',
              flexShrink: 0
            }}>
              {personaTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activePersonaTab === tab.id ? 'rgba(244,99,30,0.12)' : 'transparent',
                    color: activePersonaTab === tab.id ? '#F4631E' : '#8A8278',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard Content */}
            <div style={{ flex: 1, overflow: 'auto', background: '#080808' }}>
              {activePersonaTab === 'home' && personaSession.role === 'L1' && <L1HomePage session={personaSession} />}
              {activePersonaTab === 'home' && personaSession.role !== 'L1' && <HomePage session={personaSession} />}
              {activePersonaTab === 'pipeline' && <PipelinePage session={personaSession} />}
              {activePersonaTab === 'priority' && <PriorityPage session={personaSession} />}
              {activePersonaTab === 'leaderboard' && <LeaderboardPage session={personaSession} />}
              {activePersonaTab === 'rewards' && <RewardsPage session={personaSession} />}
              {activePersonaTab === 'mhl' && <MHLPage session={personaSession} />}
              {activePersonaTab === 'roadmap' && <RoadmapPage session={personaSession} />}
              {activePersonaTab === 'hygiene' && <HygienePage session={personaSession} />}
              {activePersonaTab === 'kpi_view' && (
                <KPITab user={{
                  email: personaSession.email,
                  name: personaSession.name,
                  role: personaSession.role === 'L2' ? 'L1 Manager' :
                    personaSession.role === 'L1' ? 'L2 Manager' :
                      personaSession.role === 'ADMIN' || personaSession.role === 'SUPERADMIN' ? 'Admin' :
                        'Seller'
                }} />
              )}
              {activePersonaTab === 'seller-view' && personaSession.role === 'L1' && <L1SellerViewPage session={personaSession} />}
              {activePersonaTab === 'seller-view' && personaSession.role === 'L2' && <L2SellerViewPage session={personaSession} />}
              {activePersonaTab === 'seller-view' && !['L1', 'L2'].includes(personaSession.role) && <SellerViewPage session={personaSession} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
