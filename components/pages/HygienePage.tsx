'use client'
import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HygienePage.module.css'

interface EfficiencyRow {
  date: string; call_dials: number; call_duration: string
}

interface Props { session: UserSession }

export default function HygienePage({ session }: Props) {
  const [data, setData] = useState<EfficiencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{show:boolean; x:number; y:number; date:string; value:number}>({show:false, x:0, y:0, date:'', value:0})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await fetch(`/api/seller/efficiency?email=${encodeURIComponent(session.email)}`)
      const json = await res.json()
      if (res.ok) setData(json || [])
    } catch {}
    setLoading(false)
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingRing} />
      <p className={styles.loadingText}>Analyzing your performance...</p>
    </div>
  )

  // Generate last 14 days - today at top (index 0 = today)
  const last14Days: EfficiencyRow[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = data.find(r => r.date?.startsWith(dateStr))
    last14Days.push({ date: dateStr, call_dials: found?.call_dials || 0, call_duration: found?.call_duration || '0:0' })
  }

  // For chart - reverse so oldest is first (left to right)
  const chartData = [...last14Days].reverse()

  const totalDials = last14Days.reduce((s, r) => s + (r.call_dials || 0), 0)
  const days = last14Days.length
  const avgDials = days > 0 ? Math.round(totalDials / days) : 0
  
  const durations = last14Days.map(r => {
    const parts = (r.call_duration || '0:0').split(':')
    return parseInt(parts[0]||0) * 60 + parseInt(parts[1]||0)
  })
  const totalDuration = durations.reduce((s, v) => s + v, 0)
  const avgDuration = days > 0 ? Math.round(totalDuration / days) : 0
  const targetMin = 480

  let streak = 0
  for (const d of last14Days) {
    if ((d.call_dials || 0) >= 30) streak++
    else break
  }
  const successDays = last14Days.filter((d, i) => durations[i] >= targetMin).length
  const successRate = days > 0 ? ((successDays / days) * 100).toFixed(0) : '0'

  const maxDials = Math.max(...chartData.map(d => d.call_dials || 0), 1)
  const bestDay = chartData.reduce((best, d) => (d.call_dials||0) > (best.call_dials||0) ? d : best, chartData[0])

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random()*100}%`,
            animationDelay: `${Math.random()*6}s`,
            animationDuration: `${4+Math.random()*6}s`
          }}>✦</div>
        ))}
      </div>

      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroIcon}>📊</span>
        <h1 className={styles.heroTitle}>Performance Hygiene</h1>
        <p className={styles.heroSub}>Your daily discipline. Your success story.</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiIcon}>📞</div>
          <div className={styles.kpiValue}>{totalDials}</div>
          <div className={styles.kpiLabel}>Total Calls</div>
          <div className={styles.kpiTrend}>Last 14 days</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🎯</div>
          <div className={styles.kpiValue}>{avgDials}</div>
          <div className={styles.kpiLabel}>Avg Calls/Day</div>
          <div className={styles.kpiTrend}>{bestDay ? `Best: ${bestDay.call_dials} calls` : ''}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>⏱️</div>
          <div className={styles.kpiValue}>{Math.floor(avgDuration/60)}h {avgDuration%60}m</div>
          <div className={styles.kpiLabel}>Avg Duration</div>
          <div className={styles.kpiTrend}>Per day</div>
        </div>
        <div className={`${styles.kpiCard} ${parseInt(successRate) >= 80 ? styles.kpiSuccess : parseInt(successRate) >= 50 ? styles.kpiWarn : styles.kpiDanger}`}>
          <div className={styles.kpiIcon}>{parseInt(successRate) >= 80 ? '🌟' : parseInt(successRate) >= 50 ? '💪' : '🎯'}</div>
          <div className={styles.kpiValue}>{successRate}%</div>
          <div className={styles.kpiLabel}>Success Rate</div>
          <div className={styles.kpiTrend}>{successDays}/{days} days ≥ 8hr</div>
        </div>
      </div>

      <div className={`${styles.streakCard} ${streak >= 7 ? styles.streakElite : streak >= 5 ? styles.streakHot : streak >= 3 ? styles.streakWarm : ''}`}>
        <div className={styles.streakRing}>
          <svg viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle cx="40" cy="40" r="34" fill="none" 
              stroke={streak >= 7 ? '#FFD700' : streak >= 5 ? '#F4631E' : streak >= 3 ? '#F59E0B' : '#8A8278'} 
              strokeWidth="5" strokeDasharray={`${(streak/14)*214} 214`} strokeLinecap="round"
              transform="rotate(-90 40 40)" />
          </svg>
          <div className={styles.streakCenter}>
            <span className={styles.streakNum}>{streak}</span>
            <span className={styles.streakUnit}>days</span>
          </div>
        </div>
        <div className={styles.streakInfo}>
          <span className={styles.streakTitle}>
            {streak >= 7 ? '🏆 Elite Streak!' : streak >= 5 ? '🔥 On Fire!' : streak >= 3 ? '⚡ Building Up!' : '💪 Start Your Streak!'}
          </span>
          <span className={styles.streakSub}>
            {streak >= 7 ? 'You are in the top tier! Keep dominating!' :
             streak >= 5 ? 'Amazing consistency! Push for 7 days!' :
             streak >= 3 ? 'Momentum is building! Don\'t stop now!' :
             'Make 30+ calls daily to build your streak!'}
          </span>
          {streak >= 7 && <div className={styles.streakBadge}>ELITE</div>}
        </div>
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3>📈 Call Dials Trend</h3>
          <span className={styles.chartSubtitle}>Last 14 Days</span>
        </div>
        <div className={styles.lineChart}>
          <div className={styles.chartYAxis}>
            <span>{maxDials}</span>
            <span>{Math.round(maxDials/2)}</span>
            <span>0</span>
          </div>
          <div className={styles.chartContent} style={{position:'relative'}}>
            <svg viewBox={`0 0 ${chartData.length * 50} 120`} className={styles.svg}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F4631E" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F4631E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M25,115 ${chartData.map((d,i) => `L${i*50+25},${115 - ((d.call_dials||0)/maxDials)*90}`).join(' ')} L${(chartData.length-1)*50+25},115 Z`} fill="url(#lineGrad)" />
              <line x1="0" y1="57" x2={chartData.length*50} y2="57" stroke="rgba(255,255,255,0.04)" strokeDasharray="4,4" />
              {chartData.map((d, i) => (
                <g key={i}>
                  <rect x={i*50} y="0" width="50" height="115" fill="transparent"
                    onMouseEnter={(e) => { const rect = (e.target as SVGRectElement).getBoundingClientRect(); setTooltip({show:true, x:rect.left+25, y:rect.top-10, date:d.date, value:d.call_dials||0}) }}
                    onMouseLeave={() => setTooltip({...tooltip, show:false})} />
                  <circle cx={i*50+25} cy={115 - ((d.call_dials||0)/maxDials)*90} r="5" fill="#F4631E" stroke="#fff" strokeWidth="2" />
                  {i < chartData.length-1 && (
                    <line x1={i*50+25} y1={115 - ((d.call_dials||0)/maxDials)*90}
                      x2={(i+1)*50+25} y2={115 - ((chartData[i+1]?.call_dials||0)/maxDials)*90}
                      stroke="#F4631E" strokeWidth="2.5" strokeLinecap="round" />
                  )}
                </g>
              ))}
            </svg>
            {tooltip.show && (
              <div className={styles.tooltip} style={{left:tooltip.x, top:tooltip.y}}>
                <span className={styles.tooltipDate}>{new Date(tooltip.date).toLocaleDateString('en-IN', {weekday:'short', day:'numeric', month:'short'})}</span>
                <span className={styles.tooltipVal}>{tooltip.value} calls</span>
              </div>
            )}
            <div className={styles.chartXAxis}>
              {chartData.map((d, i) => (
                <span key={i} className={styles.xLabel}>{new Date(d.date).getDate()}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <h3>📋 Daily Call Log</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Calls</th><th>Duration</th><th>Status</th></tr>
            </thead>
            <tbody>
              {last14Days.map((row, i) => {
                const mins = durations[i]
                const met = mins >= targetMin
                return (
                  <tr key={i} className={met ? styles.rowGood : mins > 0 ? styles.rowBad : ''}>
                    <td className={styles.dateCell}>
                      <span className={styles.dateDay}>{new Date(row.date).toLocaleDateString('en-IN', {weekday:'short'})}</span>
                      <span className={styles.dateFull}>{new Date(row.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                    </td>
                    <td className={styles.callsCell}>{row.call_dials || '—'}</td>
                    <td>{mins > 0 ? `${Math.floor(mins/60)}h ${mins%60}m` : '—'}</td>
                    <td>
                      {met ? <span className={styles.badgeGreen}>✅ Met</span> : 
                       mins > 0 ? <span className={styles.badgeRed}>❌ Missed</span> : 
                       <span className={styles.badgeNone}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}