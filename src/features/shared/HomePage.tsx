'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HomePage.module.css'
import Loader from '@/components/ui/Loader'
import { RoadmapCard } from '@/features/shared/RoadmapCard'
import RoadmapPage from '@/features/shared/RoadmapPage'
import { useStickyState } from '@/hooks/useStickyState'

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
  july_data?: any
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

function renderAch(ach: number, shb: number) {
  const isUp = ach >= shb;
  let v = 0;
  if (shb > 0) {
    v = Math.round(Math.abs(ach - shb) / shb * 100);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
      <span style={{ color: isUp ? '#22C55E' : '#EF4444', fontSize: '0.75rem', fontWeight: 700 }}>
        {shb > 0 ? `${isUp ? '▲' : '▼'} ${v}%` : ''}
      </span>
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

  const [pageMode, setPageMode] = useState<'overview' | 'roadmap'>('overview')
  const [myRoadmap, setMyRoadmap] = useState<any>(null)

  const isL2 = session.role === 'L2'
  const isTL = ['L1', 'L2'].includes(session.role)

  useEffect(() => {
    const load = async () => {
      try {
        const isTL = ['L1', 'L2'].includes(session.role)
        const overviewPromise = fetch(`/api/seller/overview?email=${session.email}`)
        const teamPromise = isTL 
          ? fetch(`/api/seller/team-performance?email=${session.email}&role=${session.role}`) 
          : Promise.resolve(null)

        const [res, tRes] = await Promise.all([overviewPromise, teamPromise])
        
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setData(json)

        if (tRes && tRes.ok) {
          const tJson = await tRes.json()
          setTeamData(tJson.team || [])
        }
      } catch {
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session.email, session.role])

  useEffect(() => {
    if (!myRoadmap) {
      fetch(`/api/seller/seller/roadmap?email=${session.email}`)
        .then(res => res.json())
        .then(json => {
          if (!json.error) setMyRoadmap(json)
        })
        .catch(console.error)
    }
  }, [session.email, myRoadmap])

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
    
    // Aggregate july_data
    const jSum = { bl_goal:0, bl_ach:0, bl_shb:0, tl_goal:0, tl_ach:0, tl_shb:0, cancellation_impact:0, escalation_impacts:0, old_bookings_earnings:0 }
    teamData.forEach(s => {
      const j = s.july_data || {}
      jSum.bl_goal += (j.bl_goal||0); jSum.bl_ach += (j.bl_ach||0); jSum.bl_shb += (j.bl_shb||0)
      jSum.tl_goal += (j.tl_goal||0); jSum.tl_ach += (j.tl_ach||0); jSum.tl_shb += (j.tl_shb||0)
      jSum.cancellation_impact += (j.cancellation_impact||0)
      jSum.escalation_impacts += (j.escalation_impacts||0)
      jSum.old_bookings_earnings += (j.old_bookings_earnings||0)
    })
    aggregated.july_data = jSum
    
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

  const j = displayData.july_data || {}
  const blG = j.bl_goal||0, blA = j.bl_ach||0, blS = j.bl_shb||0
  const tlG = j.tl_goal||0, tlA = j.tl_ach||0, tlS = j.tl_shb||0
  const blCan = j.cancellation_impact||0, blEsc = j.escalation_impacts||0, blOld = j.old_bookings_earnings||0
  const totG = blG + tlG, totA = blA + tlA
  const totPct = totG > 0 ? (totA / totG) * 100 : 0

  return (
    <div className={styles.page}>

      <div style={{display:'flex',alignItems:'center',justifyContent: 'flex-end',marginBottom:'18px'}}>      {isTL && (
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
      )}
      </div>


      <div style={{ background: '#0D0D0D', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#F0EDE8' }}>
              {displayData.seller_name || session.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', fontSize: '0.8rem', color: '#8A8278' }}>
              <span style={{ background: flag.bg, color: flag.text, padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{displayData.current_seller_flag}</span>
              <span style={{ background: displayData.defined_goal?.toLowerCase() === 'topline' ? 'rgba(34,197,94,0.15)' : 'rgba(244,99,30,0.15)', color: displayData.defined_goal?.toLowerCase() === 'topline' ? '#22C55E' : '#F4631E', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: displayData.defined_goal?.toLowerCase() === 'topline' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(244,99,30,0.3)' }}>
                {displayData.defined_goal?.toUpperCase() === 'TOPLINE' ? 'Topline' : 'Bottomline'} Goal
              </span>
              <span>•</span>
              <span>{regionLabel(displayData.region)}</span>
              <span>•</span>
              <span>{displayData.haul}</span>
              <span>•</span>
              <span>Rank #{displayData.ranking}</span>
              <span>•</span>
              <span>{displayData.duration_in_org}M tenure</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#F4631E', fontWeight: 600, fontSize: '1.1rem' }}>{totPct.toFixed(1)}%</div>
            <div style={{ color: '#8A8278', fontSize: '0.75rem' }}>Total Achieved</div>
          </div>
        </div>

        <div style={{ padding: '24px' }} className="ov-kpi-sec">
          
          <div className="ov-panel">
            <div className="ov-panel-header" style={{ color: '#F4631E' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-8 10-8 16a8 8 0 0016 0c0-6-8-10-8-16z"/></svg> 
              Bottom Line
            </div>
            <div className="ov-panel-body">
              {[
                { lbl: 'Goal', val: blG, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
                { lbl: 'Expected (SHB)', val: blS, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                { 
                  lbl: 'Achieved', 
                  val: blA, 
                  c: '#F4631E',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                  pct: blS > 0 ? Math.round(Math.abs(blA - blS) / blS * 100) : 0, 
                  arrow: blA >= blS ? '▲' : '▼', 
                  pctColor: blA >= blS ? '#22C55E' : '#EF4444' 
                },
                { lbl: 'Cancellation Impact', val: blCan, c: '#EF4444', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
                { lbl: 'Escalation Impact', val: blEsc, c: '#EF4444', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
                { lbl: 'Old Booking Earnings', val: blOld, c: '#3B82F6', sm: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> }
              ].map(k => (
                <div key={k.lbl} className="ov-panel-col" style={k.c ? { background: `radial-gradient(circle at top right, ${k.c}15 0%, transparent 70%)` } : {}}>
                  <div className="ov-panel-lbl" style={k.c ? { color: k.c } : {}}>
                    {k.icon} {k.lbl}
                  </div>
                  <div className="ov-panel-val" style={k.c ? { color: k.c, textShadow: `0 0 20px ${k.c}40` } : {}}>
                    {fmt(k.val)}
                  </div>
                  {k.pct !== undefined && k.pct > 0 && (
                    <div className="ov-panel-pct" style={{ color: k.pctColor, background: `${k.pctColor}15` }}>
                      {k.arrow} {k.pct}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="ov-panel">
            <div className="ov-panel-header" style={{ color: '#22C55E' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              Top Line
            </div>
            <div className="ov-panel-body">
              {[
                { lbl: 'Goal', val: tlG, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
                { lbl: 'Expected (SHB)', val: tlS, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                { 
                  lbl: 'Achieved', 
                  val: tlA, 
                  c: '#22C55E',
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                  pct: tlS > 0 ? Math.round(Math.abs(tlA - tlS) / tlS * 100) : 0, 
                  arrow: tlA >= tlS ? '▲' : '▼', 
                  pctColor: tlA >= tlS ? '#22C55E' : '#EF4444' 
                }
              ].map(k => (
                <div key={k.lbl} className="ov-panel-col" style={k.c ? { background: `radial-gradient(circle at top right, ${k.c}15 0%, transparent 70%)` } : {}}>
                  <div className="ov-panel-lbl" style={k.c ? { color: k.c } : {}}>
                    {k.icon} {k.lbl}
                  </div>
                  <div className="ov-panel-val" style={k.c ? { color: k.c, textShadow: `0 0 20px ${k.c}40` } : {}}>
                    {fmt(k.val)}
                  </div>
                  {k.pct !== undefined && k.pct > 0 && (
                    <div className="ov-panel-pct" style={{ color: k.pctColor, background: `${k.pctColor}15` }}>
                      {k.arrow} {k.pct}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      
      <div style={{ marginTop: '24px' }}>
        {myRoadmap ? <RoadmapCard roadmap={myRoadmap} name={session.name} compact={false} /> : <Loader text="Loading Roadmap..." />}
      </div>

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
      
      <style jsx>{`
        .ov-kpi-sec { margin-bottom: 36px; }
        .ov-panel {
          background: linear-gradient(180deg, rgba(28, 26, 22, 0.9) 0%, rgba(18, 16, 14, 0.95) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          margin-bottom: 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.25), 0 24px 48px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04);
          overflow: hidden;
        }
        .ov-panel-header {
          padding: 10px 20px;
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .ov-panel-body {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
        }
        .ov-panel-col {
          padding: 16px 20px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .ov-panel-col:not(:nth-child(3n)):not(:last-child)::after {
          content: '';
          position: absolute;
          top: 20%;
          bottom: 20%;
          right: 0;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
        }
        .ov-panel-col:nth-child(n+4) {
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .ov-panel-lbl {
          font-size: 0.62rem;
          font-weight: 600;
          color: #8A8278;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .ov-panel-val {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          color: #F9FAFB;
        }
        .ov-panel-pct {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 3px 7px;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 700;
          margin-top: 8px;
          align-self: flex-start;
        }
      `}</style>
    </div>
  )
}