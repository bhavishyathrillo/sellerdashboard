'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HygienePage.module.css'

interface EfficiencyRow {
  date: string; call_dials: number; call_duration: string
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

export default function HygienePage({ session }: Props) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [showDials, setShowDials] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})
  
  // Toggle for L2 "My Team" view
  const [showTeamView, setShowTeamView] = useState(false)
  
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const ChartLib = useRef<any>(null)
  const sellerChartRefs = useRef<Record<string, any>>({})

  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'

  useEffect(() => {
    if (isL1) {
      // L1 sees team hygiene data
      fetch(`/api/seller/l1-efficiency?email=${encodeURIComponent(session.email)}`)
        .then(r => r.json())
        .then(d => {
          setData(d)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else if (isL2 && showTeamView) {
      // L2 sees team hygiene data (sellers under them)
      fetch(`/api/seller/l2-efficiency?email=${encodeURIComponent(session.email)}`)
        .then(r => r.json())
        .then(d => {
          setData(d)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      // L2/Seller sees personal hygiene data
      fetch(`/api/seller/efficiency?email=${encodeURIComponent(session.email)}`)
        .then(r => r.json())
        .then(d => {
          setData(d)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [session.email, isL1, isL2, showTeamView])

  // 🔥 FIXED: renderChart filters out future dates
  function renderChart(dailyData: any[], isPersonal: boolean = false) {
    if (!chartRef.current || !ChartLib.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    const Chart = ChartLib.current
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    // 🔥 FILTER: Only show data up to today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const filteredData = dailyData.filter((d: any) => {
      // Parse the date from the data
      const dateStr = d.dateRaw || d.date
      let dataDate
      if (dateStr) {
        // Try to parse as YYYY-MM-DD format
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-')
          dataDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        } else {
          // Try to parse as date string (like "15 Jun")
          dataDate = new Date(dateStr + ' ' + new Date().getFullYear())
        }
      } else {
        // If no date, keep it
        return true
      }
      dataDate.setHours(0, 0, 0, 0)
      return dataDate <= today
    })

    const labels = filteredData.map((d: any) => d.date)
    const dials = filteredData.map((d: any) => d.call_dials)
    const durations = filteredData.map((d: any) => d.call_duration)

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Call Dials',
            data: dials,
            borderColor: '#F4631E',
            backgroundColor: 'rgba(244,99,30,0.08)',
            fill: true,
            tension: 0.35,
            yAxisID: 'y1',
            pointBackgroundColor: '#F4631E',
            pointBorderColor: '#141414',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            hidden: !showDials
          },
          {
            label: 'Duration',
            data: durations,
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34,197,94,0.05)',
            fill: false,
            tension: 0.35,
            yAxisID: 'y2',
            pointBackgroundColor: '#22C55E',
            pointBorderColor: '#141414',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            hidden: !showDuration
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1a1a',
            borderColor: '#333',
            borderWidth: 1,
            titleColor: '#F0EDE8',
            bodyColor: '#8A8278',
            callbacks: {
              label: (ctx: any) => ctx.dataset.label === 'Call Dials' ? `${ctx.raw} calls` : `${ctx.raw} min`
            }
          }
        },
        scales: {
          x: { 
            ticks: { color: '#8A8278', maxRotation: 45, autoSkip: true, font: { size: 10 } }, 
            grid: { color: 'rgba(255,255,255,0.04)' } 
          },
          y1: { 
            type: 'linear', 
            position: 'left', 
            title: { display: true, text: 'Calls', color: '#F4631E' }, 
            ticks: { color: '#F4631E', font: { size: 10 } }, 
            grid: { color: 'rgba(255,255,255,0.06)' }, 
            beginAtZero: true 
          },
          y2: { 
            type: 'linear', 
            position: 'right', 
            title: { display: true, text: 'Min', color: '#22C55E' }, 
            ticks: { color: '#22C55E', font: { size: 10 } }, 
            grid: { drawOnChartArea: false }, 
            beginAtZero: true 
          }
        }
      }
    })
  }

  function renderSellerChart(sellerEmail: string, dailyData: any[]) {
    const canvasId = `seller-chart-${sellerEmail.replace(/[^a-zA-Z0-9]/g, '')}`
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement
    if (!canvas || !ChartLib.current) return
    if (sellerChartRefs.current[sellerEmail]) sellerChartRefs.current[sellerEmail].destroy()

    // 🔥 FILTER: Only show data up to today for seller charts too
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const filteredData = dailyData.filter((d: any) => {
      const dateStr = d.dateRaw || d.date
      let dataDate
      if (dateStr) {
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-')
          dataDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        } else {
          dataDate = new Date(dateStr + ' ' + new Date().getFullYear())
        }
      } else {
        return true
      }
      dataDate.setHours(0, 0, 0, 0)
      return dataDate <= today
    })

    const Chart = ChartLib.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    sellerChartRefs.current[sellerEmail] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: filteredData.map((d: any) => d.date),
        datasets: [
          {
            label: 'Calls',
            data: filteredData.map((d: any) => d.call_dials),
            borderColor: '#F4631E',
            backgroundColor: 'rgba(244,99,30,0.08)',
            fill: true,
            tension: 0.35,
            yAxisID: 'y1',
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Min',
            data: filteredData.map((d: any) => d.call_duration),
            borderColor: '#22C55E',
            backgroundColor: 'rgba(34,197,94,0.05)',
            fill: false,
            tension: 0.35,
            yAxisID: 'y2',
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { color: '#8A8278', font: { size: 9 }, boxWidth: 12 } }
        },
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

  // 🔥 FIXED: Load Chart.js and render chart with filtered data
  useEffect(() => {
    import('chart.js/auto').then(mod => {
      ChartLib.current = mod.default || mod
      
      if (!data) return
      
      // Check if data has teamAverage (L1 or L2 team view)
      if (data.teamAverage?.dailyData && data.teamAverage.dailyData.length > 0) {
        renderChart(data.teamAverage.dailyData)
      } 
      // Check if data is an array (personal view for L2 or Seller)
      else if (Array.isArray(data) && data.length > 0) {
        const dailyData = data.map((row: any) => ({
          date: new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          dateRaw: row.date,
          call_dials: row.call_dials || 0,
          call_duration: Math.round(parseFloat(row.call_duration || '0')) || 0
        }))
        renderChart(dailyData, true)
      }
    })
    return () => {
      if (chartInstance.current) chartInstance.current.destroy()
      Object.values(sellerChartRefs.current).forEach((ch: any) => { if (ch) ch.destroy() })
    }
  }, [data])

  // Update chart when toggles change
  useEffect(() => {
    if (!chartInstance.current) return
    chartInstance.current.data.datasets[0].hidden = !showDials
    chartInstance.current.data.datasets[1].hidden = !showDuration
    chartInstance.current.update()
  }, [showDials, showDuration])

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading hygiene...</p></div>

  if (!data) return <div className={styles.empty}>No hygiene data found</div>

  // ========== L1 VIEW ==========
  if (isL1) {
    const teamData = data.teamAverage
    const sellers = data.sellers || []
    const dailyData = teamData?.dailyData || []
    const totalCalls = teamData?.total_calls || 0
    const totalDuration = teamData?.total_duration || 0
    const avgCallsPerDay = teamData?.avg_calls_per_day || 0
    const avgDurationPerDay = teamData?.avg_duration_per_day || 0
    const totalSellers = teamData?.total_sellers || 0

    const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

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
          <p className={styles.heroSub}>Team average call metrics · {monthName}</p>
        </div>

        {/* KPI Grid */}
        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className={styles.kpiValue}>{totalCalls}</div>
            <div className={styles.kpiLabel}>Total Calls</div>
            <div className={styles.kpiTrend}>Per seller · {monthName}</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div className={styles.kpiValue}>{avgCallsPerDay}</div>
            <div className={styles.kpiLabel}>Avg Calls/Day</div>
            <div className={styles.kpiTrend}>Per seller</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={styles.kpiValue}>{fmtDuration(avgDurationPerDay)}</div>
            <div className={styles.kpiLabel}>Avg Duration</div>
            <div className={styles.kpiTrend}>Per day</div>
          </div>
        </div>

        {/* Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
              <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
            </svg>
            <h3>Call Dials & Duration Trend</h3>
            <span className={styles.chartSubtitle}>Team Average · {monthName}</span>
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

        {/* Seller Breakdown */}
        <div className={styles.tableCard}>
          <div className={styles.chartHeader}>
            <h3>Seller Breakdown · {monthName} ({totalSellers} sellers)</h3>
          </div>
          {sellers.map((seller: any) => {
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
      </div>
    )
  }

  // ========== L2 VIEW with "My Team" Toggle ==========
  if (isL2) {
    // Check if we're in team view (has teamAverage)
    const isTeamView = !!data.teamAverage
    
    if (isTeamView) {
      // L2 Team View - shows sellers under this L2
      const teamData = data.teamAverage
      const sellers = data.sellers || []
      const dailyData = teamData?.dailyData || []
      const totalCalls = teamData?.total_calls || 0
      const totalDuration = teamData?.total_duration || 0
      const avgCallsPerDay = teamData?.avg_calls_per_day || 0
      const avgDurationPerDay = teamData?.avg_duration_per_day || 0
      const totalSellers = teamData?.total_sellers || 0

      const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

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
            <p className={styles.heroSub}>Team average call metrics · {monthName}</p>
          </div>

          {/* My Team Toggle for L2 */}
          <div style={{display:'flex', justifyContent:'center', marginBottom:'16px'}}>
            <button 
              onClick={() => setShowTeamView(!showTeamView)} 
              style={{
                padding:'8px 24px',
                borderRadius:'20px',
                border: `2px solid ${showTeamView ? '#F4631E' : '#333'}`,
                background: showTeamView ? 'rgba(244,99,30,0.15)' : 'transparent',
                color: showTeamView ? '#F4631E' : '#8A8278',
                cursor:'pointer',
                fontSize:'0.8rem',
                fontWeight:600,
                transition:'all 0.2s'
              }}
            >
              {showTeamView ? '✓ ' : ''}My Team View
            </button>
          </div>

          {/* KPI Grid */}
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
              <div className={styles.kpiIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <div className={styles.kpiValue}>{totalCalls}</div>
              <div className={styles.kpiLabel}>Total Calls</div>
              <div className={styles.kpiTrend}>Per seller · {monthName}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div className={styles.kpiValue}>{avgCallsPerDay}</div>
              <div className={styles.kpiLabel}>Avg Calls/Day</div>
              <div className={styles.kpiTrend}>Per seller</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className={styles.kpiValue}>{fmtDuration(avgDurationPerDay)}</div>
              <div className={styles.kpiLabel}>Avg Duration</div>
              <div className={styles.kpiTrend}>Per day</div>
            </div>
          </div>

          {/* Chart - L2 Team View */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
                <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
              </svg>
              <h3>Call Dials & Duration Trend</h3>
              <span className={styles.chartSubtitle}>Team Average · {monthName}</span>
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

          {/* Seller Breakdown */}
          <div className={styles.tableCard}>
            <div className={styles.chartHeader}>
              <h3>Seller Breakdown · {monthName} ({totalSellers} sellers)</h3>
            </div>
            {sellers.map((seller: any) => {
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
        </div>
      )
    }

    // L2 Personal View (default)
    const personalData = data
    const dailyData = personalData?.map((row: any) => ({
      date: new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      dateRaw: row.date,
      call_dials: row.call_dials || 0,
      call_duration: Math.round(parseFloat(row.call_duration || '0')) || 0
    })) || []

    const totalCalls = dailyData.reduce((s: number, d: any) => s + d.call_dials, 0)
    const avgCalls = dailyData.length > 0 ? Math.round(totalCalls / dailyData.length) : 0
    const totalDuration = dailyData.reduce((s: number, d: any) => s + d.call_duration, 0)
    const avgDuration = dailyData.length > 0 ? Math.round(totalDuration / dailyData.length) : 0
    const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

    return (
      <div className={styles.page}>
        <div className={styles.particles}>
          {[...Array(10)].map((_, i) => (<div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*6}s`,animationDuration:`${4+Math.random()*6}s`}}><StarIcon /></div>))}
        </div>

        <div className={styles.hero}>
          <div className={styles.heroGlow}/>
          <span className={styles.heroIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="1.5"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
          </span>
          <h1 className={styles.heroTitle}>Performance Hygiene</h1>
          <p className={styles.heroSub}>Your daily discipline. Your success story.</p>
        </div>

        {/* My Team Toggle for L2 */}
        <div style={{display:'flex', justifyContent:'center', marginBottom:'16px'}}>
          <button 
            onClick={() => setShowTeamView(!showTeamView)} 
            style={{
              padding:'8px 24px',
              borderRadius:'20px',
              border: `2px solid ${showTeamView ? '#F4631E' : '#333'}`,
              background: showTeamView ? 'rgba(244,99,30,0.15)' : 'transparent',
              color: showTeamView ? '#F4631E' : '#8A8278',
              cursor:'pointer',
              fontSize:'0.8rem',
              fontWeight:600,
              transition:'all 0.2s'
            }}
          >
            {showTeamView ? '✓ ' : ''}My Team View
          </button>
        </div>

        <div className={styles.kpiGrid}>
          <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div className={styles.kpiValue}>{totalCalls}</div>
            <div className={styles.kpiLabel}>Total Calls</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div className={styles.kpiValue}>{avgCalls}</div>
            <div className={styles.kpiLabel}>Avg Calls/Day</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className={styles.kpiValue}>{fmtDuration(avgDuration)}</div>
            <div className={styles.kpiLabel}>Avg Duration</div>
          </div>
        </div>

        {/* Chart - L2 Personal View */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
              <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
            </svg>
            <h3>Call Dials & Duration Trend</h3>
            <span className={styles.chartSubtitle}>Your daily activity · {monthName}</span>
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

        <div className={styles.tableCard}>
          <div className={styles.chartHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <h3>Daily Call Log</h3>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Calls</th><th>Duration (min)</th></tr></thead>
              <tbody>
                {[...dailyData].reverse().map((row, i) => (
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
      </div>
    )
  }

  // ========== SELLER VIEW (original) ==========
  // Personal hygiene data
  const personalData = data
  const dailyData = personalData?.map((row: any) => ({
    date: new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    dateRaw: row.date,
    call_dials: row.call_dials || 0,
    call_duration: Math.round(parseFloat(row.call_duration || '0')) || 0
  })) || []

  const totalCalls = dailyData.reduce((s: number, d: any) => s + d.call_dials, 0)
  const avgCalls = dailyData.length > 0 ? Math.round(totalCalls / dailyData.length) : 0
  const totalDuration = dailyData.reduce((s: number, d: any) => s + d.call_duration, 0)
  const avgDuration = dailyData.length > 0 ? Math.round(totalDuration / dailyData.length) : 0
  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (<div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*6}s`,animationDuration:`${4+Math.random()*6}s`}}><StarIcon /></div>))}
      </div>

      <div className={styles.hero}>
        <div className={styles.heroGlow}/>
        <span className={styles.heroIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="1.5"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
        </span>
        <h1 className={styles.heroTitle}>Performance Hygiene</h1>
        <p className={styles.heroSub}>Your daily discipline. Your success story.</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <div className={styles.kpiValue}>{totalCalls}</div>
          <div className={styles.kpiLabel}>Total Calls</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div className={styles.kpiValue}>{avgCalls}</div>
          <div className={styles.kpiLabel}>Avg Calls/Day</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className={styles.kpiValue}>{fmtDuration(avgDuration)}</div>
          <div className={styles.kpiLabel}>Avg Duration</div>
        </div>
      </div>

      {/* Chart - Seller View */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
            <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
          </svg>
          <h3>Call Dials & Duration Trend</h3>
          <span className={styles.chartSubtitle}>Your daily activity · {monthName}</span>
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

      <div className={styles.tableCard}>
        <div className={styles.chartHeader}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6}}>
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
          </svg>
          <h3>Daily Call Log</h3>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Calls</th><th>Duration (min)</th></tr></thead>
            <tbody>
              {[...dailyData].reverse().map((row, i) => (
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
    </div>
  )
}