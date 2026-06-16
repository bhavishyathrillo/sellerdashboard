'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './LeaderboardPage.module.css'

interface Seller {
  seller_name: string; seller_email: string
  actual_achieved_monthly: number; bottomline_goal_monthly: number
  goal_achieved_percent: number; haul: string; region: string; l1_name: string
}

interface Props { session: UserSession }

function fmt(n: number) { if (!n && n !== 0) return '₹0'; if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`; return `₹${n.toFixed(0)}` }
function initials(n: string) { if (!n) return '?'; return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() }

const regionDisplay: Record<string, string> = {
  'europe_tours': 'Europe', 'dubai_tours': 'Dubai', 'maldives_tours': 'Maldives',
  'singapore_tours': 'Singapore', 'thailand_tours': 'Thailand', 'vietnam_tours': 'Vietnam',
  'bali_tours': 'Bali', 'kenya_tours': 'Kenya', 'mauritius_tours': 'Mauritius',
  'seychelles_tours': 'Seychelles', 'sri_lanka_tours': 'Sri Lanka', 'kashmir_tours': 'Kashmir',
  'kerala_tours': 'Kerala', 'ladakh_tours': 'Ladakh', 'andaman_tours': 'Andaman',
  'bhutan_tours': 'Bhutan', 'north_east_tours': 'North East', 'himalayan_treks': 'Himalayan Treks',
  'spiti_tours': 'Spiti', 'africa_tours': 'Africa', 'japan': 'Japan', 'nordic_tours': 'Nordic',
  'new_zealand_tours': 'New Zealand', 'egypt_tours': 'Egypt',
}

function formatRegion(r: string) {
  if (!r) return '—'
  return regionDisplay[r] || r.replace(/_/g, ' ').replace(/ tours$/i, '').replace(/\b\w/g, (c: string) => c.toUpperCase())
}

function FloatingParticles() {
  return (
    <div className={styles.particlesBg}>
      {[...Array(15)].map((_, i) => (
        <div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*8}s`,animationDuration:`${6+Math.random()*8}s`,fontSize:`${0.5+Math.random()*0.8}rem`,opacity:0.15+Math.random()*0.2}}>
          {['✦','◈','◇','◆','○'][Math.floor(Math.random()*5)]}
        </div>
      ))}
    </div>
  )
}

export default function LeaderboardPage({ session }: Props) {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [haul, setHaul] = useState('')
  const [region, setRegion] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [allRegions, setAllRegions] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/seller/leaderboard')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllRegions([...new Set(data.map((s: Seller) => s.region).filter(Boolean))].sort())
        }
      })
  }, [])

  useEffect(() => { loadData() }, [haul, region])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (haul) params.set('haul', haul)
      if (region) params.set('region', region)
      const res = await fetch(`/api/seller/leaderboard?${params}`)
      const data = await res.json()
      if (res.ok) {
        setSellers(data || [])
        if (!haul && !region) {
          const regions = (data || []).map((s: Seller) => s.region as string).filter((r: string) => Boolean(r))
         setAllRegions([...new Set(regions)] as string[])
        }
      }
    } catch {} finally { setLoading(false) }
  }

  if (loading) return (
    <div className={styles.loaderWrap}><div className={styles.loaderRing} /><p className={styles.loaderText}>Summoning the champions...</p></div>
  )

  const top3 = sellers.slice(0, 3)
  const rankOrder = [1, 0, 2]
  const podiumData = rankOrder.map(i => top3[i]).filter(Boolean)
  const hauls = ['Short Haul', 'Long Haul', 'Domestic']
  const glowColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <div className={styles.page}>
      <FloatingParticles />
      <div className={styles.starsBg}>
        {[...Array(30)].map((_, i) => (<div key={i} className={styles.star} style={{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,animationDelay:`${Math.random()*3}s`,animationDuration:`${2+Math.random()*3}s`}}>✦</div>))}
      </div>
      <div className={styles.hero}><div className={styles.heroGlow}/><div className={styles.heroContent}><span className={styles.heroEmoji}>🏆</span><h1 className={styles.heroTitle}>Leaderboard</h1><p className={styles.heroSub}>Where legends are made</p></div></div>
      <div className={styles.filterBar}>
        <select value={haul} onChange={e => setHaul(e.target.value)} className={styles.filter}><option value="">🌍 All Destinations</option><option value="Short Haul">✈️ Short Haul</option><option value="Long Haul">🌏 Long Haul</option><option value="Domestic">🇮🇳 Domestic</option></select>
        <select value={region} onChange={e => setRegion(e.target.value)} className={styles.filter}><option value="">📍 All Regions</option>{allRegions.map(r => (<option key={r} value={r}>{formatRegion(r)}</option>))}</select>
      </div>
      <div className={styles.podiumSection}>
        <div className={styles.podium}>
          {podiumData.map((s, i) => {
            const pos = rankOrder[i]; const isGold = pos === 0
            return (
              <div key={s?.seller_email || i} className={`${styles.podiumCard} ${isGold?styles.cardGold:pos===1?styles.cardSilver:styles.cardBronze}`} style={{animationDelay:`${i*0.2}s`}}>
                {isGold&&<div className={styles.crown}>👑</div>}{isGold&&<div className={styles.sparkles}>✨</div>}
                <div className={styles.rankNum} style={{color:glowColors[pos]}}>#{pos+1}</div>
                <div className={`${styles.avatarWarp} ${isGold?styles.avatarGold:''}`}><div className={styles.avatarInner}>{initials(s?.seller_name)}</div><div className={styles.avatarRing} style={{borderColor:glowColors[pos]}}/></div>
                <div className={styles.podName}>{s?.seller_name}</div><div className={styles.podTeam}>{s?.l1_name}</div>
                <div className={styles.podProgress}><div className={styles.podProgressBar}><div className={styles.podProgressFill} style={{width:`${Math.min(s?.goal_achieved_percent||0,100)}%`,background:`linear-gradient(90deg,${glowColors[pos]},#F4631E)`}}/></div></div>
                <div className={styles.podStats}><span className={styles.podPct} style={{color:glowColors[pos]}}>{s?.goal_achieved_percent?.toFixed(1)}%</span><span className={styles.podAmt}>{fmt(s?.actual_achieved_monthly||0)}</span></div>
                <span className={styles.podHaul}>{s?.haul}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className={styles.haulRow}>
        {hauls.map(h => {
          const hSellers = sellers.filter(s => s.haul === h).slice(0, 3)
          return (<div key={h} className={styles.haulBox}><h3 className={styles.haulBoxTitle}>{h==='Short Haul'?'✈️':h==='Long Haul'?'🌏':'🇮🇳'} {h}</h3>{hSellers.map((s,i)=>(<div key={s.seller_email} className={styles.haulLine}><span>{['🥇','🥈','🥉'][i]}</span><span className={styles.haulLineName}>{s.seller_name}</span><span className={styles.haulLinePct}>{s.goal_achieved_percent?.toFixed(1)}%</span></div>))}</div>)
        })}
      </div>
      <div className={styles.rankingsSection}>
        <h2 className={styles.rankingsTitle}>📊 All Rankings</h2>
        <div className={styles.rankingsList}>
          {(showAll ? sellers.slice(0, 50) : sellers.slice(0, 10)).map((s, i) => {
            const rank = i + 1; const medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':''
            return (
              <div key={s.seller_email} className={styles.rankingRow}>
                <span className={styles.rankingPos}>{medal || rank}</span>
                <div className={styles.rankingAvatar}>{initials(s.seller_name)}</div>
                <div className={styles.rankingInfo}><span className={styles.rankingName}>{s.seller_name}</span><span className={styles.rankingMeta}>{s.l1_name} · {s.haul} · {formatRegion(s.region)}</span></div>
                <div className={styles.rankingBar}><div className={styles.rankingBarFill} style={{width:`${Math.min(s.goal_achieved_percent||0,100)}%`}}/></div>
                <span className={styles.rankingPct}>{s.goal_achieved_percent?.toFixed(1)}%</span>
                <span className={styles.rankingAmt}>{fmt(s.actual_achieved_monthly||0)}</span>
              </div>
            )
          })}
        </div>
        {sellers.length > 10 && (<button onClick={() => setShowAll(!showAll)} className={styles.moreBtn}>{showAll ? '▲ Show Less' : '▼ View More'}</button>)}
      </div>
    </div>
  )
}