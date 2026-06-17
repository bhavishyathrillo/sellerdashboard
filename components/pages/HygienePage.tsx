'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HygienePage.module.css'

interface EfficiencyRow {
  date: string; call_dials: number; call_duration: string
}

interface SellerEfficiency {
  seller_name: string
  seller_email: string
  total_calls: number
  avg_calls_per_day: number
  total_duration: number
  avg_duration_per_day: number
  dailyData: { date: string; call_dials: number; call_duration: number }[]
}

interface Props { session: UserSession }

function fmtDuration(min: number) {
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`
  return `${min}m`
}

function CallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function ChartBarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

// Helper: Get date string YYYY-MM-DD
function getDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function HygienePage({ session }: Props) {
  const [data, setData] = useState<EfficiencyRow[]>([])
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDials, setShowDials] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my')
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const ChartLib = useRef<any>(null)
  const sellerChartRefs = useRef<Record<string, any>>({})

  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'
  const isManager = isL1 || isL2

  useEffect(() => {
    if (isL1) {
      loadL1TeamData()
    } else if (isL2 && viewMode === 'team') {
      loadL2TeamData()
    } else {
      loadPersonalData()
    }
  }, [viewMode])

  async function loadL1TeamData() {
    try {
      const res = await fetch(`/api/seller/l1-efficiency?email=${encodeURIComponent(session.email)}`)
      const json = await res.json()
      if (res.ok) setTeamData(json)
    } catch {}
    setLoading(false)
  }

  async function loadL2TeamData() {
    try {
      const res = await fetch(`/api/seller/l2-efficiency?email=${encodeURIComponent(session.email)}`)
      const json = await res.json()
      if (res.ok) setTeamData(json)
    } catch {}
    setLoading(false)
  }

  async function loadPersonalData() {
    try {
      const res = await fetch(`/api/seller/efficiency?email=${encodeURIComponent(session.email)}`)
      const json = await res.json()
      if (res.ok) setData(json || [])
    } catch {}
    setLoading(false)
  }

  // Build date list: 1st of month to today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const daysInMonth = Math.floor((today.getTime() - firstOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Generate exact date strings for this month
  const monthDateList: string[] = []
  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(firstOfMonth)
    d.setDate(d.getDate() + i)
    monthDateList.push(getDateStr(d))
  }

  const chartData: { date: string; call_dials: number; call_duration: number }[] = []
  const isTeamView = (isL1) || (isL2 && viewMode === 'team')

  if (isTeamView && teamData?.teamAverage) {
    // Use team data from API (already filtered by month)
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(firstOfMonth)
      d.setDate(d.getDate() + i)
      const found = teamData.teamAverage.dailyData?.[i]
      chartData.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        call_dials: found?.call_dials || 0,
        call_duration: found?.call_duration || 0
      })
    }
  } else {
    // Personal data: match against exact month dates
    for (let i = 0; i < daysInMonth; i++) {
      const d = new Date(firstOfMonth)
      d.setDate(d.getDate() + i)
      const dateStr = getDateStr(d)
      // Find matching row by exact date match
      const found = data.find(r => {
        const rowDate = (r.date || '').split('T')[0]
        return rowDate === dateStr
      })
      chartData.push({
        date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        call_dials: found ? (found.call_dials || 0) : 0,
        call_duration: found ? Math.round(parseFloat(found.call_duration || '0')) || 0 : 0
      })
    }
  }

  const labels = chartData.map(d => d.date)
  const dialsData = chartData.map(d => d.call_dials)
  const durationData = chartData.map(d => d.call_duration)

  // Load Chart.js
  useEffect(() => {
    import('chart.js/auto').then(mod => {
      ChartLib.current = mod.default || mod
      if (chartRef.current) renderMainChart()
    })
    return () => {
      if (chartInstance.current) chartInstance.current.destroy()
      Object.values(sellerChartRefs.current).forEach((ch: any) => { if (ch) ch.destroy() })
    }
  }, [teamData, data])

  useEffect(() => {
    if (!chartInstance.current) return
    chartInstance.current.data.datasets[0].hidden = !showDials
    chartInstance.current.data.datasets[1].hidden = !showDuration
    chartInstance.current.update()
  }, [showDials, showDuration])

  function renderMainChart() {
    if (!chartRef.current || !ChartLib.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const Chart = ChartLib.current
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Call Dials',
            data: dialsData,
            borderColor: '#F4631E',
            backgroundColor: 'rgba(244,99,30,0.08)',
            fill: true, tension: 0.35,
            yAxisID: 'y1',
            pointBackgroundColor: '#F4631E', pointBorderColor: '#141414',
            pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
            hidden: !showDials
          },
          {
            label: 'Duration',
            data: durationData,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34,197,94,0.05)',
            fill: false, tension: 0.35,
            yAxisID: 'y2',
            pointBackgroundColor: '#22C55E', pointBorderColor: '#141414',
            pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
            hidden: !showDuration
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1,
            titleColor: '#F0EDE8', bodyColor: '#8A8278',
            callbacks: { label: (ctx: any) => ctx.dataset.label === 'Call Dials' ? `${ctx.raw} calls` : `${ctx.raw} min` }
          }
        },
        scales: {
          x: { ticks: { color: '#8A8278', maxRotation: 45, autoSkip: true, font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y1: { type: 'linear', position: 'left', title: { display: true, text: 'Calls', color: '#F4631E' }, ticks: { color: '#F4631E', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
          y2: { type: 'linear', position: 'right', title: { display: true, text: 'Min', color: '#22C55E' }, ticks: { color: '#22C55E', font: { size: 10 } }, grid: { drawOnChartArea: false }, beginAtZero: true }
        }
      }
    })
  }

  function renderSellerChart(sellerEmail: string, dailyData: any[]) {
    const canvasId = `seller-chart-${sellerEmail.replace(/[^a-zA-Z0-9]/g, '')}`
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas || !ChartLib.current) return
    if (sellerChartRefs.current[sellerEmail]) sellerChartRefs.current[sellerEmail].destroy()

    const Chart = ChartLib.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    sellerChartRefs.current[sellerEmail] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyData.map((d: any) => d.date),
        datasets: [
          {
            label: 'Calls', data: dailyData.map((d: any) => d.call_dials),
            borderColor: '#F4631E', backgroundColor: 'rgba(244,99,30,0.08)',
            fill: true, tension: 0.35, yAxisID: 'y1', pointRadius: 3, pointHoverRadius: 5
          },
          {
            label: 'Min', data: dailyData.map((d: any) => d.call_duration),
            borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.05)',
            fill: false, tension: 0.35, yAxisID: 'y2', pointRadius: 3, pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, labels: { color: '#8A8278', font: { size: 9 }, boxWidth: 12 } } },
        scales: {
          x: { ticks: { color: '#8A8278', font: { size: 8 }, maxRotation: 45, autoSkip: true }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y1: { type: 'linear', position: 'left', ticks: { color: '#F4631E', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
          y2: { type: 'linear', position: 'right', ticks: { color: '#22C55E', font: { size: 8 } }, grid: { drawOnChartArea: false }, beginAtZero: true }
        }
      }
    })
  }

  const toggleSeller = (email: string, dailyData?: any[]) => {
    setExpandedSellers((prev: any) => {
      const newState = { ...prev, [email]: !prev[email] }
      if (!prev[email] && dailyData && ChartLib.current) {
        setTimeout(() => renderSellerChart(email, dailyData), 100)
      }
      return newState
    })
  }

  const totalDials = dialsData.reduce((s, v) => s + v, 0)
  const avgDials = dialsData.length > 0 ? Math.round(totalDials / dialsData.length) : 0
  const totalDuration = durationData.reduce((s, v) => s + v, 0)
  const avgDuration = dialsData.length > 0 ? Math.round(totalDuration / dialsData.length) : 0

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading hygiene...</p></div>

  const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*6}s`,animationDuration:`${4+Math.random()*6}s`}}>
            <StarIcon />
          </div>
        ))}
      </div>

      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
          </svg>
        </span>
        <h1 className={styles.heroTitle}>Performance Hygiene</h1>
        <p className={styles.heroSub}>
          {isTeamView ? `Team average call metrics · ${monthName}` : `Your daily discipline · ${monthName}`}
        </p>
      </div>

      {/* Toggle for L2 */}
      {isL2 && (
        <div style={{display:'flex',justifyContent:'center',marginBottom:'16px'}}>
          <div style={{display:'flex',gap:'3px',background:'#141414',border:'1px solid #232323',borderRadius:'8px',padding:'3px'}}>
            <button onClick={() => { setViewMode('my'); setLoading(true); }} style={{
              padding:'7px 16px',border:'none',borderRadius:'6px',
              background: viewMode==='my'?'rgba(244,99,30,0.15)':'transparent',
              color: viewMode==='my'?'#F4631E':'#8A8278',
              cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
            }}>My Hygiene</button>
            <button onClick={() => { setViewMode('team'); setLoading(true); }} style={{
              padding:'7px 16px',border:'none',borderRadius:'6px',
              background: viewMode==='team'?'rgba(244,99,30,0.15)':'transparent',
              color: viewMode==='team'?'#F4631E':'#8A8278',
              cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
            }}>Team Hygiene</button>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{totalDials}</div>
          <div className={styles.kpiLabel}>{isTeamView ? 'Avg Total Calls' : 'Total Calls'}</div>
          <div className={styles.kpiTrend}>{monthName}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{avgDials}</div>
          <div className={styles.kpiLabel}>Avg Calls/Day</div>
          <div className={styles.kpiTrend}>{isTeamView ? 'Per seller' : ''}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{fmtDuration(avgDuration)}</div>
          <div className={styles.kpiLabel}>Avg Duration</div>
          <div className={styles.kpiTrend}>Per day</div>
        </div>
      </div>

      {/* Main Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
            <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
          </svg>
          <h3>Call Dials & Duration Trend</h3>
          <span className={styles.chartSubtitle}>{isTeamView ? `Team Average · ${monthName}` : monthName}</span>
        </div>
        <div className={styles.legendPills}>
          <button className={`${styles.pill} ${showDials ? styles.pillActive : styles.pillInactive}`} style={showDials ? { borderColor: '#F4631E', background: 'rgba(244,99,30,0.12)', color: '#F4631E' } : {}} onClick={() => setShowDials(!showDials)}>
            <span className={styles.pillSwatch} style={{ background: '#F4631E' }} />Call Dials
          </button>
          <button className={`${styles.pill} ${showDuration ? styles.pillActive : styles.pillInactive}`} style={showDuration ? { borderColor: '#22C55E', background: 'rgba(34,197,94,0.10)', color: '#22C55E' } : {}} onClick={() => setShowDuration(!showDuration)}>
            <span className={styles.pillSwatch} style={{ background: '#22C55E' }} />Duration
          </button>
        </div>
        <div className={styles.chartWrap}><canvas ref={chartRef} /></div>
      </div>

      {/* Seller Drill-down (Team View) */}
      {isTeamView && teamData?.sellers && (
        <div className={styles.tableCard}>
          <div className={styles.chartHeader}>
            <h3>Seller Breakdown · {monthName} ({teamData.sellers.length} sellers)</h3>
          </div>
          {teamData.sellers.map((seller: SellerEfficiency) => {
            const canvasId = `seller-chart-${seller.seller_email.replace(/[^a-zA-Z0-9]/g, '')}`
            return (
              <div key={seller.seller_email} style={{
                background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',
                borderRadius:'8px',marginBottom:'6px',overflow:'hidden'
              }}>
                <div onClick={() => toggleSeller(seller.seller_email, seller.dailyData)} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 14px',cursor:'pointer',transition:'background 0.2s'
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'0.7rem',color:'#8A8278'}}>
                      {expandedSellers[seller.seller_email] ? <ChevronDown /> : <ChevronRight />}
                    </span>
                    <span style={{fontWeight:600,fontSize:'0.8rem'}}>{seller.seller_name}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'16px',fontSize:'0.75rem'}}>
                    <span style={{color:'#F4631E'}}><CallIcon />{seller.total_calls}</span>
                    <span style={{color:'#22C55E'}}><ClockIcon />{fmtDuration(seller.total_duration)}</span>
                    <span style={{color:'#8A8278'}}><ChartBarIcon />{seller.avg_calls_per_day}/day</span>
                  </div>
                </div>
                {expandedSellers[seller.seller_email] && (
                  <div style={{padding:'0 14px 12px'}}>
                    <div style={{height:'180px',marginBottom:'10px'}}>
                      <canvas id={canvasId} style={{width:'100%',height:'100%'}} />
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead><tr><th>Date</th><th>Calls</th><th>Duration</th></tr></thead>
                        <tbody>
                          {[...seller.dailyData].reverse().map((d: any, i: number) => (
                            <tr key={i}>
                              <td style={{fontSize:'0.7rem',color:'#8A8278'}}>{d.date}</td>
                              <td style={{fontWeight:600}}>{d.call_dials||'—'}</td>
                              <td>{d.call_duration > 0 ? `${d.call_duration} min` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Daily Call Log (Personal View) */}
      {!isTeamView && (
        <div className={styles.tableCard}>
          <div className={styles.chartHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <h3>Daily Call Log · {monthName}</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Calls</th><th>Duration (min)</th></tr></thead>
              <tbody>
                {[...chartData].reverse().map((row, i) => (
                  <tr key={i}>
                    <td className={styles.dateDay}>{row.date}</td>
                    <td className={styles.callsCell}>{row.call_dials||'—'}</td>
                    <td>{row.call_duration > 0 ? `${row.call_duration} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}