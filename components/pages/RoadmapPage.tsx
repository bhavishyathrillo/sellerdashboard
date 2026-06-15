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

function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(10)].map((_,i)=>(
        <div key={i} style={{position:'absolute',top:'110%',left:`${Math.random()*100}%`,color:'#C9A84C',fontSize:`${0.5+Math.random()*0.7}rem`,opacity:0.12+Math.random()*0.15,animation:`rise ${5+Math.random()*6}s linear infinite`,animationDelay:`${Math.random()*6}s`}}>
          {['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}
        </div>
      ))}
      <style>{`@keyframes rise{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}90%{opacity:0.4}100%{transform:translateY(-110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

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

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/><p>Loading roadmap...</p></div>
  if (!data) return <div className={styles.empty}><span>🗺️</span><h2>No roadmap data</h2><p>Your growth journey will appear here.</p></div>

  const hikeVal = data.current_eligible_hike_percent
  const arpsData = [
    { label: '3M', value: data.last_3_months_arps },
    { label: '6M', value: data.last_6_months_arps },
    { label: '12M', value: data.last_12_months_arps },
  ]
  const maxArps = Math.max(...arpsData.map(a => a.value || 0), 1)

  return (
    <div className={styles.page}>
      <Particles />

      <div className={styles.hero}>
        <h1>Your Growth Journey</h1>
        <p>Track your career progression at Thrillophilia</p>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>{initials(data.seller_name)}</div>
          <div>
            <h2 className={styles.name}>{data.seller_name}</h2>
            <p className={styles.meta}>{data.region} · {data.duration_in_org}</p>
            <span className={`${styles.badge} ${data.status==='Active'?styles.badgeActive:''}`}>{data.status||'Active'}</span>
          </div>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}><span>📅 DOJ</span><strong>{data.date_of_joining||'—'}</strong></div>
          <div className={styles.infoItem}><span>⏳ Duration</span><strong>{data.duration_in_org||'—'}</strong></div>
          <div className={styles.infoItem}><span>📈 Last Hike</span><strong>{data.last_hike_month||'—'}</strong></div>
          <div className={styles.infoItem}><span>🎯 Next Hike</span><strong>{data.next_hike_month||'—'}</strong></div>
        </div>
      </div>

      <div className={`${styles.hikeCard} ${hikeVal?styles.hikeGlow:''}`}>
        <span className={styles.hikeEmoji}>{hikeVal?'🌟':'🔒'}</span>
        <div>
          <span className={styles.hikeLabel}>Eligible Hike</span>
          <span className={styles.hikeValue}>{hikeVal?`${hikeVal}%`:'Not Available'}</span>
          {hikeVal&&<span className={styles.hikeSub}>Based on ARPS performance</span>}
        </div>
      </div>

      <div className={styles.arpsSection}>
        <h3>ARPS Performance</h3>
        <div className={styles.arpsCards}>
          {arpsData.map(a=><div key={a.label} className={styles.arpsCard}><span>{a.label}</span><strong>{a.value?fmt(a.value):'—'}</strong></div>)}
        </div>
        <div className={styles.chart}>
          {arpsData.map(a=>{
            const h=a.value?(a.value/maxArps)*70:4
            return <div key={a.label} className={styles.barCol}><span className={styles.barVal}>{a.value?fmt(a.value):'—'}</span><div className={styles.barWrap}><div className={styles.bar} style={{height:`${h}px`,background:a.label==='3M'?'#F4631E':a.label==='6M'?'#C9A84C':'#22C55E'}}/></div><span className={styles.barLabel}>{a.label}</span></div>
          })}
        </div>
      </div>

      <div className={styles.managers}>
        <div className={styles.mgrCard}><span>L2</span><strong>{data.l2_name||'—'}</strong></div>
        <div className={styles.mgrCard}><span>L1</span><strong>{data.l1_name||'—'}</strong></div>
      </div>
    </div>
  )
}