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

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" style={{display:'inline',verticalAlign:'middle'}}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function CrownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="0.5">
      <path d="M2 6l3 8h14l3-8-5 2-5-6-5 6-5-2z"/><circle cx="12" cy="16" r="3" fill="#FFD700"/>
    </svg>
  )
}

function FloatingParticles() {
  return (
    <div className={styles.particlesBg}>
      {[...Array(15)].map((_, i) => (
        <div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*8}s`,animationDuration:`${6+Math.random()*8}s`,fontSize:`${0.5+Math.random()*0.8}rem`,opacity:0.15+Math.random()*0.2}}>
          <StarIcon />
        </div>
      ))}
    </div>
  )
}

export default function LeaderboardPage({ session }: Props) {
  const [allSellers, setAllSellers] = useState<Seller[]>([])
  const [teamSellers, setTeamSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [haul, setHaul] = useState('')
  const [region, setRegion] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [allRegions, setAllRegions] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'overall' | 'team'>('overall')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  useEffect(() => {
    loadData()
  }, [haul, region])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (haul) params.set('haul', haul)
      if (region) params.set('region', region)
      
      const res = await fetch(`/api/seller/leaderboard?${params}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setAllSellers(data)
        if (!haul && !region) {
          setAllRegions([...new Set(data.map((s: Seller) => s.region).filter(Boolean))].sort())
        }
      }
    } catch {}
    
    // Load team data
    if (isManager) {
      try {
        const teamRes = await fetch(`/api/seller/team-performance?email=${encodeURIComponent(session.email)}&role=${session.role}`)
        const teamData = await teamRes.json()
        if (teamData?.team) {
          const sorted = [...teamData.team].sort((a: any, b: any) => 
            (b.goal_achieved_percent || 0) - (a.goal_achieved_percent || 0)
          )
          setTeamSellers(sorted)
        }
      } catch {}
    }
    
    setLoading(false)
  }

  if (loading) return (
    <div className={styles.loaderWrap}><div className={styles.loaderRing} /><p className={styles.loaderText}>Loading rankings...</p></div>
  )

  const activeSellers = viewMode === 'team' && isManager ? teamSellers : allSellers

  // Global rank map for team view
  const globalRankMap: Record<string, number> = {}
  if (viewMode === 'team') {
    allSellers.forEach((s, i) => {
      globalRankMap[s.seller_email?.toLowerCase()] = i + 1
    })
  }

  const top3 = activeSellers.slice(0, 3)
  const rankOrder = [1, 0, 2]
  const podiumData = rankOrder.map(i => top3[i]).filter(Boolean)
  const hauls = ['Short Haul', 'Long Haul', 'Domestic']
  const glowColors = ['#FFD700', '#C0C0C0', '#CD7F32']

  return (
    <div className={styles.page}>
      <FloatingParticles />
      <div className={styles.starsBg}>
        {[...Array(30)].map((_, i) => (<div key={i} className={styles.star} style={{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,animationDelay:`${Math.random()*3}s`,animationDuration:`${2+Math.random()*3}s`}}><StarIcon /></div>))}
      </div>

      <div className={styles.hero}>
        <div className={styles.heroGlow}/>
        <div className={styles.heroContent}>
          <span className={styles.heroEmoji}><CrownIcon /></span>
          <h1 className={styles.heroTitle}>Leaderboard</h1>
          <p className={styles.heroSub}>Where legends are made</p>
        </div>
      </div>

      {/* Toggle + Filters */}
      <div style={{display:'flex',justifyContent:'center',gap:'12px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
        {isManager && (
          <div style={{display:'flex',gap:'4px',background:'#141414',borderRadius:'8px',padding:'3px'}}>
            <button onClick={() => setViewMode('overall')} style={{
              padding:'8px 16px',border:'none',borderRadius:'6px',
              background: viewMode === 'overall' ? '#F4631E' : 'transparent',
              color: viewMode === 'overall' ? '#fff' : '#8A8278',
              cursor:'pointer',fontSize:'0.72rem',fontWeight:600,transition:'all 0.2s'
            }}>Overall</button>
            <button onClick={() => setViewMode('team')} style={{
              padding:'8px 16px',border:'none',borderRadius:'6px',
              background: viewMode === 'team' ? '#F4631E' : 'transparent',
              color: viewMode === 'team' ? '#fff' : '#8A8278',
              cursor:'pointer',fontSize:'0.72rem',fontWeight:600,transition:'all 0.2s'
            }}>My Team ({teamSellers.length})</button>
          </div>
        )}

        {viewMode === 'overall' && (
          <>
            <select value={haul} onChange={e => setHaul(e.target.value)} className={styles.filter}>
              <option value="">All Destinations</option>
              <option value="Short Haul">Short Haul</option>
              <option value="Long Haul">Long Haul</option>
              <option value="Domestic">Domestic</option>
            </select>
            <select value={region} onChange={e => setRegion(e.target.value)} className={styles.filter}>
              <option value="">All Regions</option>
              {allRegions.map(r => (<option key={r} value={r}>{formatRegion(r)}</option>))}
            </select>
          </>
        )}
      </div>

      {/* Podium */}
      {podiumData.length > 0 && (
        <div className={styles.podiumSection}>
          <div className={styles.podium}>
            {podiumData.map((s, i) => {
              const pos = rankOrder[i]; const isGold = pos === 0
              const globalRank = viewMode === 'team' ? globalRankMap[s?.seller_email?.toLowerCase()] : null
              return (
                <div key={s?.seller_email || i} className={`${styles.podiumCard} ${isGold?styles.cardGold:pos===1?styles.cardSilver:styles.cardBronze}`} style={{animationDelay:`${i*0.2}s`}}>
                  {isGold && <div className={styles.crown}><CrownIcon /></div>}
                  {isGold && <div className={styles.sparkles}><StarIcon /></div>}
                  <div className={styles.rankNum} style={{color:glowColors[pos]}}>
                    #{pos+1} {globalRank && <span style={{fontSize:'0.55rem',opacity:0.7}}>(Global #{globalRank})</span>}
                  </div>
                  <div className={styles.avatarWarp}><div className={styles.avatarInner}>{initials(s?.seller_name)}</div><div className={styles.avatarRing} style={{borderColor:glowColors[pos]}}/></div>
                  <div className={styles.podName}>{s?.seller_name}</div><div className={styles.podTeam}>{s?.l1_name}</div>
                  <div className={styles.podProgress}><div className={styles.podProgressBar}><div className={styles.podProgressFill} style={{width:`${Math.min(s?.goal_achieved_percent||0,100)}%`,background:`linear-gradient(90deg,${glowColors[pos]},#F4631E)`}}/></div></div>
                  <div className={styles.podStats}><span className={styles.podPct} style={{color:glowColors[pos]}}>{s?.goal_achieved_percent?.toFixed(1)}%</span><span className={styles.podAmt}>{fmt(s?.actual_achieved_monthly||0)}</span></div>
                  <span className={styles.podHaul}>{s?.haul}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Haul boxes — only Overall */}
      {viewMode === 'overall' && (
        <div className={styles.haulRow}>
          {hauls.map(h => {
            const hSellers = activeSellers.filter(s => s.haul === h).slice(0, 3)
            return (<div key={h} className={styles.haulBox}><h3 className={styles.haulBoxTitle}>{h}</h3>{hSellers.map((s,i)=>(<div key={s.seller_email} className={styles.haulLine}><span>{i===0?'1st':i===1?'2nd':'3rd'}</span><span className={styles.haulLineName}>{s.seller_name}</span><span className={styles.haulLinePct}>{s.goal_achieved_percent?.toFixed(1)}%</span></div>))}</div>)
          })}
        </div>
      )}

      {/* Rankings List */}
      <div className={styles.rankingsSection}>
        <h2 className={styles.rankingsTitle}>
          {viewMode === 'team' ? `My Team Rankings (${activeSellers.length} sellers)` : 'All Rankings'}
        </h2>
        <div className={styles.rankingsList}>
          {(showAll || viewMode === 'team' ? activeSellers.slice(0, 50) : activeSellers.slice(0, 10)).map((s, i) => {
            const teamRank = i + 1
            const globalRank = viewMode === 'team' ? globalRankMap[s.seller_email?.toLowerCase()] : teamRank
            return (
              <div key={s.seller_email} className={styles.rankingRow}>
                <span className={styles.rankingPos}>{teamRank}</span>
                <div className={styles.rankingAvatar}>{initials(s.seller_name)}</div>
                <div className={styles.rankingInfo}>
                  <span className={styles.rankingName}>{s.seller_name}</span>
                  <span className={styles.rankingMeta}>
                    {s.l1_name} · {s.haul} · {formatRegion(s.region)}
                    {viewMode === 'team' && globalRank && (
                      <span style={{color:'#C9A84C',fontWeight:600,marginLeft:'6px'}}>
                        · Global #{globalRank}
                      </span>
                    )}
                  </span>
                </div>
                <div className={styles.rankingBar}><div className={styles.rankingBarFill} style={{width:`${Math.min(s.goal_achieved_percent||0,100)}%`}}/></div>
                <span className={styles.rankingPct}>{s.goal_achieved_percent?.toFixed(1)}%</span>
                <span className={styles.rankingAmt}>{fmt(s.actual_achieved_monthly||0)}</span>
              </div>
            )
          })}
        </div>
        {activeSellers.length > 10 && viewMode === 'overall' && (
          <button onClick={() => setShowAll(!showAll)} className={styles.moreBtn}>{showAll ? 'Show Less' : 'View More'}</button>
        )}
      </div>
    </div>
  )
}