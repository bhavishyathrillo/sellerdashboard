'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HomePage.module.css'
import Loader from '@/components/ui/Loader'
import RoadmapPage from './RoadmapPage'
import { useStickyState } from '@/components/hooks/useStickyState'

interface SellerData {
  seller_email: string
  seller_name: string
  l2_name: string
  l1_name: string
  region: string
  status: string
  haul: string
  ranking: string
  current_seller_flag: string
  defined_goal: string
  bottomline_goal_monthly: number
  actual_achieved_monthly: number
  required_daily_monthly: number
  should_have_been_monthly: number
  goal_achieved_percent: number
  week_1_goal: number
  week_1_achieved: number
  week_2_goal: number
  week_2_achieved: number
  week_3_goal: number
  week_3_achieved: number
  week_4_goal: number
  week_4_achieved: number
  final_incentives: number
  final_amount_to_be_disbursed: number
  flight_adoption: number
  flight_adoption_goal: number
  flight_adoption_pax_goal: number
  flight_adoption_pax_achieved: number
  last_payment_date: string
  one_liner: string
  cancellation_impact: number
  escalation_impacts: number
  duration_in_org: number
  category: string
}

const flagColors: Record<string, { bg: string, text: string }> = {
  '1 White':  { bg: 'rgba(154,154,154,0.12)', text: '#9A9A9A' },
  '2 Red':    { bg: 'rgba(239,68,68,0.12)',   text: '#EF4444' },
  '3 Yellow': { bg: 'rgba(245,158,11,0.12)',  text: '#F59E0B' },
  '4 Orange': { bg: 'rgba(244,99,30,0.12)',   text: '#F4631E' },
  '5 Green':  { bg: 'rgba(34,197,94,0.12)',   text: '#22C55E' },
  '6 Star':   { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C' },
}

const regionLabel = (r: string) =>
  r?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '-'

function fmt(n: number) {
  if (!n) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{
          position:'absolute',top:'110%',left:`${Math.random()*100}%`,
          color:'#C9A84C',fontSize:`${0.5+Math.random()*0.8}rem`,
          opacity:0.15+Math.random()*0.2,
          animation:`particleRise ${6+Math.random()*8}s linear infinite`,
          animationDelay:`${Math.random()*8}s`
        }}>
          {['✦','◈','◇','◆','○'][Math.floor(Math.random()*5)]}
        </div>
      ))}
      <style>{`@keyframes particleRise{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}90%{opacity:0.5}100%{transform:translateY(-110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

interface HomePageProps {
  session: UserSession
}

export default function HomePage({ session }: HomePageProps) {
  const [data, setData] = useState<SellerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTopline, setShowTopline] = useStickyState(true, 'HomePage_showTopline')
  const [showBottomline, setShowBottomline] = useStickyState(true, 'HomePage_showBottomline')
  const [viewMode, setViewMode] = useStickyState<'my' | 'team'>('my', 'HomePage_viewMode')
  const [teamData, setTeamData] = useState<any[]>([])
  const [selectedKpi, setSelectedKpi] = useState<{ id: string, label: string, isPct?: boolean } | null>(null)

  const isL2 = session.role === 'L2'
  const isTL = ['L1', 'L2'].includes(session.role)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/seller/overview?email=${session.email}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setData(json)

        if (['L1', 'L2'].includes(session.role)) {
          const tRes = await fetch(`/api/seller/team-performance?email=${session.email}&role=${session.role}`)
          if (tRes.ok) {
            const tJson = await tRes.json()
            setTeamData(tJson.team || [])
          }
        }
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session.email, session.role])

  if (loading) return <Loader text="Loading..." />

  if (error) return (
    <div className={styles.errorWrap}><p>{error}</p></div>
  )

  if (!data) return null

  const getDisplayData = () => {
    if (viewMode === 'my' || !teamData.length) return data
    
    const aggregated: any = { 
      ...data, 
      seller_name: 'My Team', 
      current_seller_flag: 'Team Avg', 
      one_liner: 'Team cumulative performance', 
      duration_in_org: data?.duration_in_org || '-', 
      region: 'All Regions' 
    }
    
    const sumFields = [
      'bottomline_goal_monthly', 'actual_achieved_monthly', 'required_daily_monthly', 'should_have_been_monthly',
      'week_1_goal', 'week_1_achieved', 'week_2_goal', 'week_2_achieved', 'week_3_goal', 'week_3_achieved', 'week_4_goal', 'week_4_achieved',
      'final_incentives', 'final_amount_to_be_disbursed', 'cancellation_impact', 'escalation_impacts'
    ]
    
    sumFields.forEach(f => aggregated[f] = 0)
    
    teamData.forEach(s => {
      sumFields.forEach(f => {
        aggregated[f] += (Number(s[f]) || 0)
      })
    })
    
    aggregated.goal_achieved_percent = aggregated.bottomline_goal_monthly > 0 ? (aggregated.actual_achieved_monthly / aggregated.bottomline_goal_monthly) * 100 : 0
    
    return aggregated as SellerData
  }

  const displayData = getDisplayData()

  const flag = flagColors[displayData.current_seller_flag] || flagColors['1 White']
  const pct = Number(displayData.goal_achieved_percent) || 0
  const weeks = [
    { label: 'W1', goal: displayData.week_1_goal, achieved: displayData.week_1_achieved },
    { label: 'W2', goal: displayData.week_2_goal, achieved: displayData.week_2_achieved },
    { label: 'W3', goal: displayData.week_3_goal, achieved: displayData.week_3_achieved },
    { label: 'W4', goal: displayData.week_4_goal, achieved: displayData.week_4_achieved },
  ]

  return (
    <div className={styles.page}>
      <Particles />

      {isTL && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginBottom:'18px'}}>
          <div style={{display:'flex',gap:'3px',background:'#141414',border:'1px solid #232323',borderRadius:'8px',padding:'3px'}}>
            <button onClick={() => setViewMode('my')} style={{
              padding:'7px 16px',border:'none',borderRadius:'6px',
              background: viewMode==='my'?'rgba(244,99,30,0.15)':'transparent',
              color: viewMode==='my'?'#F4631E':'#8A8278',
              cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
            }}>My Stats</button>
            <button onClick={() => setViewMode('team')} style={{
              padding:'7px 16px',border:'none',borderRadius:'6px',
              background: viewMode==='team'?'rgba(244,99,30,0.15)':'transparent',
              color: viewMode==='team'?'#F4631E':'#8A8278',
              cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
            }}>My Team ({teamData.length})</button>
          </div>
        </div>
      )}

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.sellerMeta}>
            <span className={styles.flag} style={{ background: flag.bg, color: flag.text }}>{displayData.current_seller_flag}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{regionLabel(displayData.region)}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{displayData.haul}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>Rank #{displayData.ranking}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{displayData.duration_in_org}M tenure</span>
          </div>
          <p className={styles.oneLiner}>{displayData.one_liner}</p>
        </div>
        <div className={styles.heroRight}>
          <span className={styles.goalType}>{displayData.defined_goal} Goal</span>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div 
          className={styles.statCard} 
          style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
          onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'bottomline_goal_monthly', label: 'Monthly Goal' })}
        >
          <div className={styles.statBar} style={{ background: '#D4AF37' }} />
          <p className={styles.statLabel}>Monthly Goal</p>
          <p className={styles.statValue}>{fmt(displayData.bottomline_goal_monthly)}</p>
          <p className={styles.statHint}><span className={styles.hintNeutral}>Target for this month</span></p>
        </div>
        <div 
          className={styles.statCard}
          style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
          onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'actual_achieved_monthly', label: 'Achieved' })}
        >
          <div className={styles.statBar} style={{ background: '#22C55E' }} />
          <p className={styles.statLabel}>Achieved</p>
          <p className={`${styles.statValue} ${styles.brandColor}`}>{fmt(displayData.actual_achieved_monthly)}</p>
          {(() => {
            const diff = displayData.actual_achieved_monthly - displayData.should_have_been_monthly
            const pctDiff = displayData.should_have_been_monthly > 0 ? Math.abs((diff / displayData.should_have_been_monthly) * 100).toFixed(1) : '0'
            const above = diff >= 0
            return (
              <p className={styles.statHint}>
                <span className={above ? styles.hintGreen : styles.hintRed}>
                  {above ? '↑' : '↓'} {fmt(Math.abs(diff))} {above ? 'above' : 'below'} SHB
                  <span className={styles.hintPct}> ({pctDiff}%)</span>
                </span>
              </p>
            )
          })()}
        </div>
        <div 
          className={styles.statCard}
          style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
          onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'required_daily_monthly', label: 'Required Daily' })}
        >
          <div className={styles.statBar} style={{ background: '#F4631E' }} />
          <p className={styles.statLabel}>Required Daily</p>
          <p className={styles.statValue}>{fmt(displayData.required_daily_monthly)}</p>
        </div>
        <div 
          className={styles.statCard}
          style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
          onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'should_have_been_monthly', label: 'Should Have Been' })}
        >
          <div className={styles.statBar} style={{ background: '#F4631E' }} />
          <p className={styles.statLabel}>Should Have Been</p>
          <p className={styles.statValue}>{fmt(displayData.should_have_been_monthly)}</p>
        </div>
        <div 
          className={`${styles.statCard} ${styles.statCardHighlight}`}
          style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
          onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'goal_achieved_percent', label: '% Achieved', isPct: true })}
        >
          <div className={styles.statBar} style={{ background: '#C9A84C' }} />
          <p className={styles.statLabel}>% Achieved</p>
          <p className={styles.statValueHighlight}>{displayData.goal_achieved_percent?.toFixed(1)}%</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(displayData.goal_achieved_percent, 100)}%` }} />
          </div>
          <p className={styles.statHint}>
            <span className={displayData.goal_achieved_percent >= 100 ? styles.hintGreen : styles.hintRed}>
              {displayData.goal_achieved_percent >= 100 ? '↑' : '↓'} {Math.abs(displayData.goal_achieved_percent - 100).toFixed(1)}% {displayData.goal_achieved_percent >= 100 ? 'ahead of' : 'behind'} goal
            </span>
          </p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Weekly Breakdown</h2>
        <div className={styles.weekGrid}>
          {weeks.map(w => {
            const wpct = w.goal > 0 ? (w.achieved / w.goal) * 100 : 0
            return (
              <div 
                key={w.label} 
                className={styles.weekCard}
                style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
                onClick={() => viewMode === 'team' && setSelectedKpi({ id: `week_${w.label.replace('W', '')}_achieved`, label: `${w.label} Achieved` })}
              >
                <div className={styles.weekHeader}>
                  <span className={styles.weekLabel}>{w.label}</span>
                  <span className={styles.weekPct}>{wpct.toFixed(0)}%</span>
                </div>
                <div className={styles.weekRow}>
                  <span className={styles.weekSub}>Goal</span>
                  <span className={styles.weekVal}>{fmt(w.goal)}</span>
                </div>
                <div className={styles.weekRow}>
                  <span className={styles.weekSub}>Achieved</span>
                  <span className={`${styles.weekVal} ${styles.brandColor}`}>
                    {fmt(w.achieved)}
                  </span>
                </div>
                <div className={styles.weekBar}>
                  <div
                    className={styles.weekBarFill}
                    style={{ width: `${Math.min(wpct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Incentives</h3>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80px',color:'#8A8278',fontSize:'0.75rem'}}>
            Data will come soon
          </div>
        </div>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Flight Adoption</h3>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'80px',color:'#8A8278',fontSize:'0.75rem'}}>
            Data will come soon
          </div>
        </div>
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Impacts</h3>
          <div 
            className={styles.infoRow}
            style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
            onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'cancellation_impact', label: 'Cancellation Impact' })}
          >
            <span className={styles.infoLabel}>Cancellation</span>
            <span className={styles.infoValue} style={{ color: displayData.cancellation_impact < 0 ? '#EF4444' : '#F0EDE8' }}>
              {fmt(displayData.cancellation_impact)}
            </span>
          </div>
          <div 
            className={styles.infoRow}
            style={{ cursor: viewMode === 'team' ? 'pointer' : 'default' }}
            onClick={() => viewMode === 'team' && setSelectedKpi({ id: 'escalation_impacts', label: 'Escalation Impact' })}
          >
            <span className={styles.infoLabel}>Escalation</span>
            <span className={styles.infoValue} style={{ color: displayData.escalation_impacts < 0 ? '#EF4444' : '#F0EDE8' }}>
              {fmt(displayData.escalation_impacts)}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>L2 Manager</span>
            <span className={styles.infoValue}>{data.l2_name}</span>
          </div>
        </div>
      </div>

      {!['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(session.role) && (
        <div style={{ marginTop: '24px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <RoadmapPage session={session} viewMode={viewMode} />
        </div>
      )}

      {selectedKpi && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setSelectedKpi(null)}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            width: '90%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#F0EDE8' }}>{selectedKpi.label} Breakdown</h3>
              <button onClick={() => setSelectedKpi(null)} style={{
                background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem'
              }}>&times;</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px' }}>
              {teamData.sort((a,b) => (Number(b[selectedKpi.id]) || 0) - (Number(a[selectedKpi.id]) || 0)).map((s, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: i < teamData.length - 1 ? '1px dashed #333' : 'none'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#E0DCD5', fontWeight: 500 }}>{s.seller_name || s.seller_email}</span>
                    <span style={{ color: '#8A8278', fontSize: '0.75rem' }}>{s.l1_name || s.l1_email || 'Direct'}</span>
                  </div>
                  <span style={{ color: '#F4631E', fontWeight: 600 }}>
                    {selectedKpi.isPct ? `${(Number(s[selectedKpi.id]) || 0).toFixed(1)}%` : fmt(Number(s[selectedKpi.id]) || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}