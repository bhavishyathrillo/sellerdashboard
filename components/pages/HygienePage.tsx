'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HygienePage.module.css'

interface EfficiencyRow {
  date: string; call_dials: number; call_duration: string
}

interface Props { session: UserSession }

export default function HygienePage({ session }: Props) {
  const [data, setData] = useState<EfficiencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showDials, setShowDials] = useState(true)
  const [showDuration, setShowDuration] = useState(true)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)
  const ChartLib = useRef<any>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const res = await fetch(`/api/seller/efficiency?email=${encodeURIComponent(session.email)}`)
      const json = await res.json()
      if (res.ok) setData(json || [])
    } catch {}
    setLoading(false)
  }

  // Build chart data
  const today = new Date()
  const chartData: { date: string; call_dials: number; call_duration: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = data.find(r => r.date?.startsWith(dateStr))
    chartData.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      call_dials: found?.call_dials || 0,
      call_duration: Math.round(parseFloat(found?.call_duration || '0')) || 0
    })
  }

<<<<<<< HEAD
  const labels = chartData.map(d => d.date)
  const dialsData = chartData.map(d => d.call_dials)
  const durationData = chartData.map(d => d.call_duration)
=======
  const chartData = [...last14Days].reverse()
  const totalDials = last14Days.reduce((s, r) => s + (r.call_dials || 0), 0)
  const days = last14Days.length
  const avgDials = days > 0 ? Math.round(totalDials / days) : 0
  
  const durations = last14Days.map(r => {
    const parts = (r.call_duration || '0:0').split(':')
    return parseInt(parts[0] || '0') * 60 + parseInt(parts[1] || '0')
  })
  const totalDuration = durations.reduce((s, v) => s + v, 0)
  const avgDuration = days > 0 ? Math.round(totalDuration / days) : 0
  const targetMin = 480
>>>>>>> ecbf59fc0a633dd6fce5c8236f2fd1a58bf12b1f

  // Load Chart.js dynamically
  useEffect(() => {
    import('chart.js/auto').then(mod => {
      ChartLib.current = mod.default || mod
      if (chartRef.current) renderChart()
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [data])

  // Toggle datasets without rebuilding chart
  useEffect(() => {
    if (!chartInstance.current) return
    const chart = chartInstance.current
    chart.data.datasets[0].hidden = !showDials
    chart.data.datasets[1].hidden = !showDuration
    chart.update()
  }, [showDials, showDuration])

  function renderChart() {
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
            data: durationData,
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
            ticks: { color: '#8A8278', maxRotation: 45, autoSkip: false, font: { size: 10 } },
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

  const totalDials = dialsData.reduce((s, v) => s + v, 0)
  const avgDials = dialsData.length > 0 ? Math.round(totalDials / dialsData.length) : 0
  const totalDuration = durationData.reduce((s, v) => s + v, 0)
  const avgDuration = dialsData.length > 0 ? Math.round(totalDuration / dialsData.length) : 0

  if (loading) return <div className={styles.loading}><div className={styles.spinner} /><p>Loading hygiene...</p></div>

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*6}s`,animationDuration:`${4+Math.random()*6}s`}}>✦</div>
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
        <p className={styles.heroSub}>Your daily discipline. Your success story.</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{totalDials}</div>
          <div className={styles.kpiLabel}>Total Calls</div>
          <div className={styles.kpiTrend}>Last 14 days</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{avgDials}</div>
          <div className={styles.kpiLabel}>Avg Calls/Day</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className={styles.kpiValue}>{Math.floor(avgDuration/60)}h {avgDuration%60}m</div>
          <div className={styles.kpiLabel}>Avg Duration</div>
          <div className={styles.kpiTrend}>Per day</div>
        </div>
      </div>

      {/* Chart Card */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:8}}>
            <polyline points="3 17 9 11 13 15 21 5"/><polyline points="17 5 21 5 21 9"/>
          </svg>
          <h3>Call Dials & Duration Trend</h3>
          <span className={styles.chartSubtitle}>Last 14 Days</span>
        </div>

        {/* Legend Pills */}
        <div className={styles.legendPills}>
          <button
            className={`${styles.pill} ${showDials ? styles.pillActive : styles.pillInactive}`}
            style={showDials ? { borderColor: '#F4631E', background: 'rgba(244,99,30,0.12)', color: '#F4631E' } : {}}
            onClick={() => setShowDials(!showDials)}
          >
            <span className={styles.pillSwatch} style={{ background: '#F4631E' }} />
            Call Dials
          </button>
          <button
            className={`${styles.pill} ${showDuration ? styles.pillActive : styles.pillInactive}`}
            style={showDuration ? { borderColor: '#22C55E', background: 'rgba(34,197,94,0.10)', color: '#22C55E' } : {}}
            onClick={() => setShowDuration(!showDuration)}
          >
            <span className={styles.pillSwatch} style={{ background: '#22C55E' }} />
            Duration
          </button>
        </div>

        <div className={styles.chartWrap}>
          <canvas ref={chartRef} />
        </div>
      </div>

      {/* Table */}
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
    </div>
  )
}