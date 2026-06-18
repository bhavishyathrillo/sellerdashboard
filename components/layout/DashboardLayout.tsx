'use client'

import { useState } from 'react'
import { UserSession, clearSession } from '@/lib/session'
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
  { id: 'home',        label: 'Overview',    icon: '◈' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'performance', label: 'Performance', icon: '↗', adminOnly: false },
  { id: 'rewards',     label: 'Rewards',     icon: '🎰', adminOnly: false },
  { id: 'mhl',         label: 'MHL / MHO',  icon: '☑' },
  { id: 'pipeline',    label: 'Pipeline',    icon: '⬇' },
  { id: 'roadmap',     label: 'Roadmap',     icon: '🗺', adminOnly: false },
  { id: 'hygiene',     label: 'Hygiene',     icon: '✦' },
]

export default function DashboardLayout({
  session, onLogout, children, activePage, onNavigate
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(session.role)

  // Filter out items marked adminOnly: false for admin
  const filteredNavItems = navItems.filter(item => {
    if (isAdmin && item.adminOnly === false) return false
    return true
  })

  const allNavItems = [
    ...filteredNavItems,
    ...(isAdmin ? [{ id: 'selectPersona', label: 'Select Persona', icon: '👤' }] : []),
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
          {allNavItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
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
            {collapsed ? '⏻' : '⏻ Sign out'}
          </button>
        </div>
      </aside>

      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        style={{ left: collapsed ? '55px' : '220px' }}
      >
        {collapsed ? '→' : '←'}
      </button>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}