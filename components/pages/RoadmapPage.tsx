'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './RoadmapPage.module.css'

interface RoadmapData {
  seller_email: string; seller_name: string; l2_name: string; l1_name: string
  region: string; status: string; duration_in_org: string
  date_of_joining: string; last_hike_month: string; next_hike_month: string
  current_eligible_hike_percent: number
  last_3_months_arps: number; last_6_months_arps: number; last_12_months_arps: number
}

interface Props { session: UserSession }

function fmt(n: number) { if (!n && n !== 0) return '—'; if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`; return `₹${n.toFixed(0)}` }
function initials(n: string) { if (!n) return '?'; return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() }

export default function RoadmapPage({ session }: Props) {
  const [data, setData] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/seller/roadmap?email=${encodeURIComponent(session.email)}`)
        const json = await res.json()
        if (res.ok && !json.error) setData(json)
      } catch {}
      setLoading(false)
    }
    load()
  }, [session.email])

  if (loading) return (
    <div className={styles.loadingWrap}><div className={styles.loadingRing} /><p>Loading your roadmap...</p></div>
  )
  if (!data) return (
    <div className={styles.emptyWrap}><span className={styles.emptyIcon}>🗺</span><h2>No roadmap data</h2><p>Your roadmap is not available yet.</p></div>
  )

  const hikeVal = data.current_eligible_hike_percent
  const hasArps = data.last_3_months_arps || data.last_6_months_arps || data.last_12_months_arps
  const arpsData = [
    { label: '3 Months', value: data.last_3_months_arps },
    { label: '6 Months', value: data.last_6_months_arps },
    { label: '12 Months', value: data.last_12_months_arps },
  ]
  const maxArps = Math.max(...arpsData.map(a => a.value || 0), 1)

  return (
    <div className={styles.page}>
      {/* Floating particles */}
      <div className={styles.particles}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*5}s`,animationDuration:`${3+Math.random()*5}s`}}>✦</div>
        ))}
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroEmoji}>🗺</span>
        <h1 className={styles.heroTitle}>My Roadmap</h1>
        <p className={styles.heroSub}>Your growth journey at Thrillophilia</p>
      </div>

      {/* Profile Card */}
      <div className={styles.profileCard}>
        <div className={styles.profileTop}>
          <div className={styles.avatar}>
            {initials(data.seller_name)}
            <div className={styles.avatarRing} />
          </div>
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>{data.seller_name}</h2>
            <p className={styles.profileMeta}>{data.region} · {data.duration_in_org}</p>
            <span className={`${styles.statusBadge} ${data.status==='Active'?styles.statusActive:''}`}>{data.status||'Active'}</span>
          </div>
        </div>

        <div className={styles.profileGrid}>
          <div className={styles.profileItem}>
            <span className={styles.profileIcon}>📅</span>
            <span className={styles.profileLabel}>Date of Joining</span>
            <span className={styles.profileVal}>{data.date_of_joining||'—'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileIcon}>⏱️</span>
            <span className={styles.profileLabel}>Duration</span>
            <span className={styles.profileVal}>{data.duration_in_org||'—'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileIcon}>📈</span>
            <span className={styles.profileLabel}>Last Hike</span>
            <span className={styles.profileVal}>{data.last_hike_month||'—'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileIcon}>🎯</span>
            <span className={styles.profileLabel}>Next Hike</span>
            <span className={styles.profileVal}>{data.next_hike_month||'—'}</span>
          </div>
        </div>
      </div>

      {/* Hike % Card */}
      <div className={`${styles.hikeCard} ${hikeVal ? styles.hikeAvailable : ''}`}>
        <div className={styles.hikeGlow} />
        <span className={styles.hikeIcon}>{hikeVal ? '🏆' : '🔒'}</span>
        <div>
          <span className={styles.hikeLabel}>Current Eligible Hike</span>
          <span className={styles.hikeValue}>{hikeVal ? `${hikeVal}%` : 'Not Available'}</span>
          {hikeVal && <span className={styles.hikeSub}>Based on your ARPS performance</span>}
        </div>
      </div>

      {/* ARPS Section */}
      {hasArps ? (
        <div className={styles.arpsSection}>
          <h3 className={styles.sectionTitle}>📊 ARPS Performance</h3>
          <div className={styles.arpsCards}>
            {arpsData.map(a => (
              <div key={a.label} className={styles.arpsCard}>
                <span className={styles.arpsPeriod}>{a.label}</span>
                <span className={styles.arpsVal}>{a.value ? fmt(a.value) : '—'}</span>
              </div>
            ))}
          </div>
          {/* ARPS Bar Chart */}
          <div className={styles.arpsChart}>
            {arpsData.map(a => {
              const h = a.value ? (a.value/maxArps)*80 : 4
              return (
                <div key={a.label} className={styles.arpsBarCol}>
                  <span className={styles.arpsBarVal}>{a.value ? fmt(a.value) : '—'}</span>
                  <div className={styles.arpsBarWrap}>
                    <div className={styles.arpsBar} style={{height:`${h}px`, background: a.label==='3 Months'?'#F4631E':a.label==='6 Months'?'#C9A84C':'#22C55E'}} />
                  </div>
                  <span className={styles.arpsBarLabel}>{a.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={styles.noArps}>
          <span>📋</span>
          <p>ARPS data not available yet</p>
        </div>
      )}

      {/* Manager Info */}
      <div className={styles.managerRow}>
        <div className={styles.managerCard}>
          <span className={styles.managerLabel}>L2 Manager</span>
          <span className={styles.managerName}>{data.l2_name||'—'}</span>
        </div>
        <div className={styles.managerCard}>
          <span className={styles.managerLabel}>L1 Manager</span>
          <span className={styles.managerName}>{data.l1_name||'—'}</span>
        </div>
      </div>
    </div>
  )
}