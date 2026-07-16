'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  TrendingUp,
  Zap,
  Trophy,
  BarChart2,
  Gift,
  ClipboardList,
  GitPullRequestArrow,
  Map,
  ShieldCheck,
  Gauge,
  UserCircle2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { UserSession } from '@/lib/session'
import styles from './DashboardLayout.module.css'
import Image from 'next/image'
import { useAutoLogout } from '@/hooks/useAutoLogout'
import { primeCache } from '@/hooks/useCachedFetch'

interface DashboardLayoutProps {
  session: UserSession
  onLogout: () => void
  children: React.ReactNode
  activePage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'home',        label: 'Overview',          Icon: LayoutDashboard },
  { id: 'seller-view', label: 'LTA',               Icon: TrendingUp },
  { id: 'priority',    label: 'Priority/QB Stats', Icon: Zap },
  { id: 'leaderboard', label: 'Leaderboard',       Icon: Trophy },
  { id: 'performance', label: 'Performance',       Icon: BarChart2,  adminOnly: false },
  { id: 'rewards',     label: 'Rewards',           Icon: Gift,       adminOnly: false },
  { id: 'mhl',         label: 'MHL / MHO',         Icon: ClipboardList },
  { id: 'pipeline',    label: 'Pipeline',          Icon: GitPullRequestArrow },
  { id: 'roadmap',     label: 'Roadmap',           Icon: Map,        adminOnly: false },
  { id: 'hygiene',     label: 'Hygiene',           Icon: ShieldCheck },
  { id: 'kpi_view',    label: 'KPI View',          Icon: Gauge },
] as const

export default function DashboardLayout({
  session, onLogout, children, activePage, onNavigate
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [profile, setProfile] = useState<{ displayName: string, avatarUrl: string } | null>(null)
  
  useAutoLogout()
  
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(session.role)

  const isSeller = !['L1', 'L2', 'ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(session.role)
  const isTL = ['L1', 'L2'].includes(session.role)
  const filteredNavItems = navItems.filter((item: any) => {
    if (isAdmin && item.adminOnly === false) return false
    if (isSeller && (item.id === 'performance' || item.id === 'roadmap')) return false
    if (isTL && (item.id === 'performance' || item.id === 'roadmap')) return false
    return true
  })

  const allNavItems: any[] = [
    ...filteredNavItems,
    ...(isAdmin || session.role === 'L1' ? [
      { id: 'adoption', label: 'Adoption', Icon: Users },
      { id: 'selectPersona', label: 'Select Persona', Icon: UserCircle2 }
    ] : []),
  ]

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'L1': return 'Category Manager'
      case 'L2': return 'L1 Manager'
      case 'ADMIN': return 'Admin'
      case 'SUPERADMIN': return 'Super Admin'
      case 'MODERATOR': return 'Moderator'
      default: return 'Seller'
    }
  }

  useEffect(() => {
    // Fetch initial profile
    fetch(`/api/profile?email=${encodeURIComponent(session.email)}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setProfile({ displayName: json.data.display_name, avatarUrl: json.data.avatar_url })
        }
      })
      .catch(console.error)

    // Prefetch all dashboard data once on load
    const todayStr = new Date().toISOString().split('T')[0]
    fetch(`/api/seller/dashboard-all?email=${encodeURIComponent(session.email)}&role=${session.role}&date=${todayStr}`)
      .then(r => r.json())
      .then(json => {
        if (json && !json.error) {
          Object.entries(json).forEach(([url, data]) => {
            primeCache(url, data)
          })
        }
      })
      .catch(console.error)

    // Listen to updates
    const handleUpdate = (e: any) => {
      setProfile({ displayName: e.detail.display_name, avatarUrl: e.detail.avatar_url })
    }
    window.addEventListener('profile-updated', handleUpdate)
    return () => window.removeEventListener('profile-updated', handleUpdate)
  }, [session.email])

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.logoArea}>
          <Image src="/thrillo-logo.svg" alt="Thrillophilia" width={32} height={32} className={styles.logoImg}/>
          {!collapsed && <span className={styles.logoText}>Thrillophilia</span>}
        </div>
        <nav className={styles.nav}>
          {allNavItems.map((item: any) => {
            const IconComponent = item.Icon
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
                onClick={() => {
                  if (item.isExternal && item.url) {
                    window.open(item.url, '_blank')
                  } else {
                    sessionStorage.clear()
                    onNavigate(item.id)
                  }
                }}
              >
                <span className={styles.navIcon}>
                  <IconComponent size={18} strokeWidth={1.8} />
                </span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            )
          })}
        </nav>
        <div className={styles.sidebarBottom}>
          <div 
            className={`${styles.userCard} ${activePage === 'profile' ? styles.userCardActive : ''}`} 
            onClick={() => onNavigate('profile')}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.userAvatar}>
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                session.name?.charAt(0).toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <p className={styles.userName}>{profile?.displayName || session.name}</p>
                <p className={styles.userRole}>
                  {getRoleLabel(session.role)}
                </p>
              </div>
            )}
          </div>
          <button className={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={15} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ marginLeft: '6px' }}>Sign out</span>}
          </button>
        </div>
      </aside>

      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        style={{ left: collapsed ? '55px' : '220px' }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}