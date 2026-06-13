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
  { id: 'home',        label: 'Overview',    icon: '◎' },
  { id: 'performance', label: 'Performance', icon: '↗' },
  { id: 'mhl',         label: 'MHL / MHO',  icon: '⚑' },
  { id: 'pipeline',    label: 'Pipeline',    icon: '⬡' },
  { id: 'roadmap',     label: 'Roadmap',     icon: '◈' },
  { id: 'hygiene',     label: 'Hygiene',     icon: '✦' },
]

const managerItems = [
  { id: 'team',        label: 'Team View',   icon: '⊞' },
]

const adminItems = [
  { id: 'admin',       label: 'Admin',       icon: '⊛' },
]

export default function DashboardLayout({
  session, onLogout, children, activePage, onNavigate
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)
  const isAdmin = ['ADMIN', 'MODERATOR'].includes(session.role)

  const allNavItems = [
    ...navItems,
    ...(isManager ? managerItems : []),
    ...(isAdmin ? adminItems : []),
  ]

  const flagColor: Record<string, string> = {
    '1 White':  '#9A9A9A',
    '2 Red':    '#EF4444',
    '3 Yellow': '#F59E0B',
    '4 Orange': '#F4631E',
    '5 Green':  '#22C55E',
    '6 Star':   '#C9A84C',
  }

  return (
    <div className={styles.shell}>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>

        {/* Logo */}
        <div className={styles.logoArea}>
          <Image src="/thrillo-logo.svg" alt="Thrillophilia" width={32} height={32} className={styles.logoImg}/>
          {!collapsed && <span className={styles.logoText}>Thrillophilia</span>}
        </div>

        {/* Nav */}
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

        {/* Bottom — user + logout */}
        <div className={styles.sidebarBottom}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {session.name?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className={styles.userInfo}>
                <p className={styles.userName}>{session.name}</p>
                <p className={styles.userRole}>{session.role}</p>
              </div>
            )}
          </div>
          <button className={styles.logoutBtn} onClick={onLogout}>
            {collapsed ? '⏻' : '⏻ Sign out'}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '→' : '←'}
        </button>

      </aside>

      {/* Main */}
      <main className={styles.main}>

        {/* Top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>
              {allNavItems.find(i => i.id === activePage)?.label || 'Overview'}
            </h1>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.greeting}>
              Hey, {session.name?.split(' ')[0]} 👋
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          {children}
        </div>

      </main>
    </div>
  )
}