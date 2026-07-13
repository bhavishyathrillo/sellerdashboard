'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { UserSession } from '@/lib/session'
import styles from './DashboardLayout.module.css'
import Image from 'next/image'

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
    ...(isAdmin || session.role === 'L1' ? [{ id: 'selectPersona', label: 'Select Persona', Icon: UserCircle2 }] : []),
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
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {session.name?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <p className={styles.userName}>{session.name}</p>
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