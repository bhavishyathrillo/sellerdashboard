'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PerformancePage.module.css'
import Loader from '@/components/ui/Loader'

interface Props { session: UserSession }

function fmt(n: number) {
  if (!n && n !== 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function Particles() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {[...Array(10)].map((_, i) => (<div key={i} style={{ position: 'absolute', top: '110%', left: `${Math.random() * 100}%`, color: '#C9A84C', fontSize: `${0.5 + Math.random() * 0.7}rem`, opacity: 0.12, animation: `rise ${5 + Math.random() * 6}s linear infinite`, animationDelay: `${Math.random() * 6}s` }}>{['✦', '◈', '◇', '◆'][Math.floor(Math.random() * 4)]}</div>))}
      <style>{`@keyframes rise{0%{transform:translateY(0)rotate(0);opacity:0}10%{opacity:0.5}90%{opacity:0.2}100%{transform:translateY(-110vh)rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

function SellerStats({ data, fmt }: { data: any; fmt: any }) {
  const pct = data.pct || data.goal_achieved_percent || 0
  const goal = data.goal || data.bottomline_goal_monthly || 0
  const achieved = data.achieved || data.actual_achieved_monthly || 0
  const required = data.required || data.required_daily_monthly || 0
  const shb = data.shb || data.should_have_been_monthly || 0
  const shbDiff = achieved - shb
  const aboveShb = shbDiff >= 0
  const weeks = data.weeks || [1, 2, 3, 4].map((w: number) => ({ week: w, goal: data[`week_${w}_goal`] || 0, achieved: data[`week_${w}_achieved`] || 0, shb: data[`should_have_been_week_${w}`] || 0 }))

  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const ChartLib = useRef<any>(null)
  const [showSHB, setShowSHB] = useState(true)
  const [showAchieved, setShowAchieved] = useState(true)

  useEffect(() => {
    import('chart.js/auto').then(mod => {
      ChartLib.current = mod.default || mod
      if (chartRef.current) renderChart()
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [])

  useEffect(() => {
    if (!chartInstance.current) return
    chartInstance.current.data.datasets[0].hidden = !showSHB
    chartInstance.current.data.datasets[1].hidden = !showAchieved
    chartInstance.current.update()
  }, [showSHB, showAchieved])

  function renderChart() {
    if (!chartRef.current || !ChartLib.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const Chart = ChartLib.current
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const labels = weeks.map((w: any) => `Week ${w.week}`)
    const shbData = weeks.map((w: any) => w.shb || 0)
    const achData = weeks.map((w: any) => w.achieved || 0)

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'SHB', data: shbData, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.35, pointBackgroundColor: '#22C55E', pointBorderColor: '#141414', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7, hidden: !showSHB },
          { label: 'Achieved', data: achData, borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: false, tension: 0.35, pointBackgroundColor: '#EF4444', pointBorderColor: '#141414', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7, hidden: !showAchieved }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1, titleColor: '#F0EDE8', bodyColor: '#8A8278', callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
        scales: {
          x: { ticks: { color: '#8A8278', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8A8278', font: { size: 10 }, callback: (v: any) => fmt(v) }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true }
        }
      }
    })
  }

  return (
    <div className={styles.statsWrap}>
      <div className={styles.stats}>
        <div className={styles.stat}><span>Goal</span><strong>{fmt(goal)}</strong></div>
        <div className={styles.stat}><span>Achieved</span><strong style={{ color: aboveShb ? '#22C55E' : '#EF4444' }}>{fmt(achieved)}</strong><span className={styles.hint} style={{ color: aboveShb ? '#22C55E' : '#EF4444' }}>{aboveShb ? `↑ ${fmt(shbDiff)} above SHB` : `↓ ${fmt(Math.abs(shbDiff))} below SHB`}</span></div>
        <div className={styles.stat}><span>Required</span><strong>{fmt(required)}</strong></div>
        <div className={styles.stat}><span>SHB</span><strong>{fmt(shb)}</strong></div>
      </div>
      <div className={styles.pctSection}>
        <div className={styles.pctBar}><div className={styles.pctFill} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        <p className={styles.pctText}>{pct.toFixed(1)}% of goal</p>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
            <polyline points="3 17 9 11 13 15 21 5" /><polyline points="17 5 21 5 21 9" />
          </svg>
          <h3>SHB vs Achieved</h3>
          <span className={styles.chartSubtitle}>Weekly</span>
        </div>
        <div className={styles.legendPills}>
          <button className={`${styles.pill} ${showSHB ? styles.pillActive : styles.pillInactive}`} style={showSHB ? { borderColor: '#22C55E', background: 'rgba(34,197,94,0.10)', color: '#22C55E' } : {}} onClick={() => setShowSHB(!showSHB)}>
            <span className={styles.pillSwatch} style={{ background: '#22C55E' }} /> SHB
          </button>
          <button className={`${styles.pill} ${showAchieved ? styles.pillActive : styles.pillInactive}`} style={showAchieved ? { borderColor: '#EF4444', background: 'rgba(239,68,68,0.10)', color: '#EF4444' } : {}} onClick={() => setShowAchieved(!showAchieved)}>
            <span className={styles.pillSwatch} style={{ background: '#EF4444' }} /> Achieved
          </button>
        </div>
        <div className={styles.chartWrap}><canvas ref={chartRef} /></div>
      </div>

      {weeks.length > 0 && (
        <div className={styles.weeks}><h2>Weekly Breakdown</h2>
          <div className={styles.weekGrid}>{weeks.map((w: any) => {
            const wpct = w.goal > 0 ? (w.achieved / w.goal) * 100 : 0
            return <div key={w.week} className={styles.weekCard}>
              <div className={styles.weekHeader}><span>Week {w.week}</span><span className={styles.weekPct}>{wpct.toFixed(0)}%</span></div>
              <div className={styles.weekRow}><span>Goal</span><span>{fmt(w.goal)}</span></div>
              <div className={styles.weekRow}><span>Achieved</span><span style={{ color: '#F4631E' }}>{fmt(w.achieved)}</span></div>
              <div className={styles.weekBar}><div className={styles.weekBarFill} style={{ width: `${Math.min(wpct, 100)}%` }} /></div>
            </div>
          })}</div>
        </div>
      )}
    </div>
  )
}

function SellerCard({ s, fmt }: { s: any; fmt: any }) {
  const [expanded, setExpanded] = useState(false)
  const pct = s.goal_achieved_percent || 0
  const achieved = s.actual_achieved_monthly || 0
  const shb = s.should_have_been_monthly || 0
  const aboveShb = achieved >= shb

  return (
    <div className={`${styles.sellerCard} ${aboveShb ? styles.sellerAbove : styles.sellerBelow}`}>
      <div className={styles.sellerCardHeader} onClick={() => setExpanded(!expanded)}>
        <span className={styles.sellerCardName}>{s.seller_name}<span className={`${styles.sellerBadge} ${aboveShb ? styles.badgeAbove : styles.badgeBelow}`}>{aboveShb ? '↑ Above SHB' : '↓ Below SHB'}</span></span>
        <div className={styles.sellerBar}><div className={styles.sellerBarFill} style={{ width: `${Math.min(pct, 100)}%`, background: aboveShb ? '#22C55E' : '#F4631E' }} /></div>
        <span className={styles.sellerPct} style={{ color: aboveShb ? '#22C55E' : '#F4631E' }}>{pct.toFixed(1)}%</span>
        <span className={styles.sellerAmt}>{fmt(achieved)}</span>
        <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && <div className={styles.sellerExpanded}><SellerStats data={s} fmt={fmt} /></div>}
    </div>
  )
}

export default function PerformancePage({ session }: Props) {
  const [data, setData] = useState<any>(null)
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'my' | 'team'>(
    session.role === 'L1' ? 'team' : 'my'
  )
  const [toggleState, setToggleState] = useState<'topline' | 'bottomline' | 'all'>('all')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)
  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'

  useEffect(() => {
    async function load() {
      try {
        if (isL1) {
          const teamRes = await fetch(`/api/seller/team-performance?email=${encodeURIComponent(session.email)}&role=${session.role}`)
          const teamJson = await teamRes.json()
          if (teamRes.ok) setTeamData(teamJson)
        } else {
          const res = await fetch(`/api/seller/overview?email=${encodeURIComponent(session.email)}`)
          const json = await res.json()
          if (res.ok && json && !json.error) setData(json.myMonthly || json)
          if (isManager) {
            const teamRes = await fetch(`/api/seller/team-performance?email=${encodeURIComponent(session.email)}&role=${session.role}`)
            const teamJson = await teamRes.json()
            if (teamRes.ok) setTeamData(teamJson)
          }
        }
      } catch { }
      setLoading(false)
    }
    load()
  }, [session.email, session.role])

  const handleToggle = (type: 'topline' | 'bottomline') => {
    if (toggleState === type) setToggleState('all')
    else setToggleState(type)
  }

  const filterSeller = (seller: any) => {
    const goalType = (seller.defined_goal || '').toLowerCase()
    if (toggleState === 'all') return true
    if (toggleState === 'topline' && goalType.includes('topline')) return true
    if (toggleState === 'bottomline' && goalType.includes('bottomline')) return true
    return false
  }

  if (loading) return <Loader text="Loading..." />
  if (!data && !isL1) return <div className={styles.empty}>No performance data found</div>

  const team = (teamData?.team || []).filter(filterSeller)

  const totalGoal = team.reduce((a: any, b: any) => a + (b.bottomline_goal_monthly || 0), 0)
  const totalAch = team.reduce((a: any, b: any) => a + (b.actual_achieved_monthly || 0), 0)
  const totalReq = team.reduce((a: any, b: any) => a + (b.required_daily_monthly || 0), 0)
  const totalShb = team.reduce((a: any, b: any) => a + (b.should_have_been_monthly || 0), 0)
  const totalPct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0
  const shbDiff = totalAch - totalShb

  const isTeamView = (viewMode === 'team' || isL1)

  return (
    <div className={styles.page}>
      <Particles />
      <div className={styles.header}>
        <h1 className={styles.title}>↗ Performance</h1>
        {isManager && !isL1 && (
          <div className={styles.viewToggle}>
            <button className={`${styles.toggleBtn} ${viewMode === 'my' ? styles.toggleActive : ''}`} onClick={() => setViewMode('my')}>My Stats</button>
            <button className={`${styles.toggleBtn} ${viewMode === 'team' ? styles.toggleActive : ''}`} onClick={() => setViewMode('team')}>My Team</button>
          </div>
        )}
        {isL1 && <span style={{ fontSize: '0.8rem', color: '#C9A84C', fontWeight: 600 }}>Team Performance</span>}
      </div>

      {viewMode === 'my' && data && !isL1 && <SellerStats data={data} fmt={fmt} />}

      {isTeamView && teamData && (
        <div className={styles.teamSection}>
          {(isL1 || isL2) && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button onClick={() => handleToggle('topline')} style={{
                padding: '7px 16px', borderRadius: '8px',
                border: `1px solid ${toggleState === 'topline' ? '#22C55E' : toggleState === 'all' ? '#22C55E' : '#2A2A2A'}`,
                background: toggleState === 'topline' ? 'rgba(34,197,94,0.12)' : toggleState === 'all' ? 'rgba(34,197,94,0.06)' : 'transparent',
                color: toggleState === 'topline' ? '#22C55E' : toggleState === 'all' ? '#8A8278' : '#8A8278',
                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.2s'
              }}>{toggleState === 'topline' ? '✓ ' : ''}Top Line</button>
              <button onClick={() => handleToggle('bottomline')} style={{
                padding: '7px 16px', borderRadius: '8px',
                border: `1px solid ${toggleState === 'bottomline' ? '#F4631E' : toggleState === 'all' ? '#F4631E' : '#2A2A2A'}`,
                background: toggleState === 'bottomline' ? 'rgba(244,99,30,0.12)' : toggleState === 'all' ? 'rgba(244,99,30,0.06)' : 'transparent',
                color: toggleState === 'bottomline' ? '#F4631E' : toggleState === 'all' ? '#8A8278' : '#8A8278',
                cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.2s'
              }}>{toggleState === 'bottomline' ? '✓ ' : ''}Bottom Line</button>
              <span style={{ fontSize: '0.65rem', color: '#8A8278', marginLeft: 'auto' }}>
                {toggleState === 'all' ? 'Showing all' : toggleState === 'topline' ? 'Top Line only' : 'Bottom Line only'}
              </span>
            </div>
          )}

          <div className={styles.teamKpiWrap}>
            <div className={styles.teamKpiHeader}>
              <h3 className={styles.groupTitle}>TEAM TOTALS</h3>
              <span className={styles.teamCount}>{team.length} sellers</span>
            </div>
            <div className={styles.stats}>
              <div className={`${styles.stat} ${styles.statPct}`}><span>Team %</span><strong style={{ color: '#C9A84C' }}>{totalPct.toFixed(1)}%</strong></div>
              <div className={styles.stat}><span>Goal</span><strong>{fmt(totalGoal)}</strong></div>
              <div className={styles.stat}><span>Achieved</span><strong style={{ color: shbDiff >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(totalAch)}</strong></div>
              <div className={styles.stat}><span>SHB</span><strong>{fmt(totalShb)}</strong></div>
              <div className={styles.stat}><span>Required</span><strong>{fmt(totalReq)}</strong></div>
              <div className={`${styles.stat} ${shbDiff >= 0 ? styles.statSuccess : styles.statDanger}`}>
                <span>vs SHB</span><strong style={{ color: shbDiff >= 0 ? '#22C55E' : '#EF4444' }}>{shbDiff >= 0 ? `+${fmt(shbDiff)}` : fmt(shbDiff)}</strong>
              </div>
            </div>
            <div className={styles.pctSection}>
              <div className={styles.pctBar}><div className={styles.pctFill} style={{ width: `${Math.min(totalPct, 100)}%` }} /></div>
              <p className={styles.pctText}>{totalPct.toFixed(1)}% of total goal</p>
            </div>
          </div>

          {/* L2 Team View — Simplified: always shows team totals, no Personal toggle */}
          {teamData.type === 'L2' && teamData.l1Groups?.map((group: any) => {
            const groupSellers = (group.sellers || []).filter(filterSeller)
            if (groupSellers.length === 0) return null
            const groupKey = group.l1_name || 'unknown'
            const sellerGoal = groupSellers.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
            const sellerAch = groupSellers.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
            const sellerPct = sellerGoal > 0 ? (sellerAch / sellerGoal) * 100 : 0

            return (
              <div key={groupKey} className={styles.groupCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <h3 className={styles.groupTitle} style={{ margin: 0 }}>
                    My Team <span className={styles.groupCount}>({groupSellers.length} sellers)</span>
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#8A8278' }}>{fmt(sellerAch)} / {fmt(sellerGoal)}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: sellerPct >= 100 ? '#22C55E' : '#F4631E' }}>{sellerPct.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', margin: '6px 0' }}>
                  <div style={{ height: '100%', background: sellerPct >= 100 ? '#22C55E' : '#F4631E', borderRadius: '2px', width: `${Math.min(sellerPct, 100)}%` }} />
                </div>
                {groupSellers.map((s: any) => <SellerCard key={s.seller_email} s={s} fmt={fmt} />)}
              </div>
            )
          })}

          {/* L1 Team View */}
          {teamData.type === 'L1' && (
            <div className={styles.groupCard}>
              <h3 className={styles.groupTitle}>My Team <span className={styles.groupCount}>({team.length} sellers)</span></h3>
              {team.map((s: any) => <SellerCard key={s.seller_email} s={s} fmt={fmt} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}