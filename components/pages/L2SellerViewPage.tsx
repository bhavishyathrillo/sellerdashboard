'use client'

import { useState, useEffect, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './L2SellerViewPage.module.css'
import sellerStyles from './SellerViewPage.module.css'
import SellerViewPage from './SellerViewPage'
import Loader from '@/components/ui/Loader'

const HOUR_SLOTS = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM']

function extractTimeParts(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null
  const s = raw.trim()
  const match = s.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/)
  if (match) return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
  return null
}

function formatTime(raw: string | null): string {
  if (!raw) return '—'
  const parts = extractTimeParts(raw)
  if (!parts) return '—'
  const ampm = parts.h >= 12 ? 'pm' : 'am'
  let h12 = parts.h % 12
  if (h12 === 0) h12 = 12
  const mm = parts.m.toString().padStart(2, '0')
  return `${String(h12).padStart(2, '0')}:${mm} ${ampm}`
}

function minutesBetween(a: string | null, b: string | null): number | null {
  const pa = extractTimeParts(a)
  const pb = extractTimeParts(b)
  if (!pa || !pb) return null
  let minsA = pa.h * 60 + pa.m
  let minsB = pb.h * 60 + pb.m
  if (minsB < minsA) minsB += 24 * 60
  return minsB - minsA
}

interface BreakWindow { startH: number; startM: number; endH: number; endM: number; rawLabel: string }

function parseBreaks(raw: string | null): { count: number; totalMinutes: number; longestMinutes: number; windows: BreakWindow[] } {
  if (!raw?.trim()) return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] }
  try {
    let count = 0, total = 0, longest = 0
    const windows: BreakWindow[] = []
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
      const parts = entry.split(/\s*-\s*/)
      if (parts.length >= 2) {
        const pa = extractTimeParts(parts[0])
        const pb = extractTimeParts(parts[1])
        if (pa && pb) {
          const start = pa.h * 60 + pa.m
          let end = pb.h * 60 + pb.m
          if (end < start) end += 24 * 60
          const m = end - start
          count++
          total += m
          longest = Math.max(longest, m)
          windows.push({ startH: pa.h, startM: pa.m, endH: pb.h, endM: pb.m, rawLabel: entry })
        }
      }
    })
    return { count, totalMinutes: total, longestMinutes: longest, windows }
  } catch { return { count: 0, totalMinutes: 0, longestMinutes: 0, windows: [] } }
}

function parseReadyWindows(raw: string | null): { startH: number; startM: number; endH: number; endM: number }[] {
  if (!raw?.trim()) return []
  try {
    return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean).map(entry => {
      const parts = entry.split(/[-→]/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        const start = extractTimeParts(parts[0])
        const end = extractTimeParts(parts[1])
        if (start && end) return { startH: start.h, startM: start.m, endH: end.h, endM: end.m }
      }
      return null
    }).filter((w): w is { startH: number; startM: number; endH: number; endM: number } => w !== null)
  } catch { return [] }
}

function isHourInBreak(hourLabel: string, windows: BreakWindow[]): boolean {
  if (!windows.length) return false
  const m = hourLabel.match(/^(\d+)(AM|PM)$/i); if (!m) return false
  let h = parseInt(m[1], 10); if (m[2].toUpperCase() === 'PM' && h !== 12) h += 12; if (m[2].toUpperCase() === 'AM' && h === 12) h = 0
  return windows.some(w => {
    const eH = w.endH + (w.endM > 0 ? 1 : 0)
    return h >= w.startH && h < eH
  })
}

// Mock data generator for LTA funnel removed as we now have real daily_lta log data

// ── MHE Trend Chart (Chart.js line) ─────────────────────────────────────────
function MheTrendChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      instance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'MHE %',
            data: values,
            borderColor: color,
            backgroundColor: `${color}18`,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.parsed.y}% MHE`
              }
            }
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              max: 100,
              beginAtZero: true,
              ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` },
              grid: { color: 'rgba(255,255,255,0.06)' },
            }
          }
        }
      })
    })
    return () => {
      active = false
      if (instance) instance.destroy()
    }
  }, [labels, values, color])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

function GoalShbTrendChart({ labels, goalValues, shbValues }: { labels: string[]; goalValues: number[]; shbValues: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      
      const maxDataVal = Math.max(...goalValues, ...shbValues, 0)
      const yMax = Math.max(20, Math.ceil((maxDataVal + 5) / 10) * 10)

      instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'line',
              label: 'SHB %',
              data: shbValues,
              borderColor: '#EAB308',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.3,
              pointBackgroundColor: '#EAB308',
              pointRadius: 4,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: 'Goal %',
              data: goalValues,
              backgroundColor: '#3B82F6',
              borderRadius: 4,
              barPercentage: 0.6,
              maxBarThickness: 32,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { color: '#8A8278' } },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
              }
            }
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              max: yMax,
              beginAtZero: true,
              ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` },
              grid: { color: 'rgba(255,255,255,0.06)' },
            }
          }
        }
      })
    })
    return () => {
      active = false
      if (instance) instance.destroy()
    }
  }, [labels, goalValues, shbValues])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function L2SellerViewPage({ session }: { session: UserSession }) {
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  
  // Section Modal State
  const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)
  
  // Custom modals
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  
  // MHE Trend Modal
  const [showMheTrendModal, setShowMheTrendModal] = useState(false)
  const [showGoalShbTrendModal, setShowGoalShbTrendModal] = useState(false)
  const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)
  const [goalShbDrillSeller, setGoalShbDrillSeller] = useState<any>(null)

  // Drill-down states
  const [drillSellerS1, setDrillSellerS1] = useState<any>(null)
  const [drillSellerS2, setDrillSellerS2] = useState<any>(null)
  const [drillSellerS3, setDrillSellerS3] = useState<any>(null)
  const [drillSellerS7, setDrillSellerS7] = useState<any>(null)
  const [drillSellerS8, setDrillSellerS8] = useState<any>(null)
  const [showTeamFunnel, setShowTeamFunnel] = useState(false)
  const [activeTileS1, setActiveTileS1] = useState<string | null>(null)
  const [activeBlockS1, setActiveBlockS1] = useState<any>(null)
  const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)
  const [breakdownDrillSeller, setBreakdownDrillSeller] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    // Fetch team data using the new TL-specific endpoint
    fetch(`/api/seller/tl-team?email=${encodeURIComponent(session.email)}&date=${date}`)
      .then(r => r.json())
      .then(d => {
        setTeamData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session.email, date])

  const members = teamData?.members || []

  if (viewMode === 'personal') {
    const toggleNode = members.length > 1 ? (
      <div className={styles.toggleContainer}>
        <button className={`${styles.toggleBtn} ${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('personal')}>Personal</button>
        <button className={`${styles.toggleBtn} ${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
      </div>
    ) : undefined;
    return <SellerViewPage session={session} headerCenterContent={toggleNode} />
  }

  if (loading) return <Loader text="Loading TL dashboard..." />

  
  // Make sure the TL is in the members list if not already (backend usually does, but just in case)
  let enrichedMembers = members.map((m: any) => {
    const dailyLta = m.daily_lta || {}
    const ltaLeadGoal = dailyLta.lead_goal || 0
    const ltaWd = dailyLta.wd || 0
    
    const planned = ltaWd > 0 ? Math.round(ltaLeadGoal / ltaWd) : 0
    const dynLta = dailyLta.real_dynamic_lta || 0
    const hygLta = dailyLta.hygiene_lta || 0
    const rev1Lta = dailyLta.goal_completion_logic_lta || 0
    const actual = dailyLta.final_lta || 0
    
    const dynLost = planned - dynLta
    const hygLost = dynLta - hygLta
    const rev1Lost = hygLta - rev1Lta
    const rev2Lost = rev1Lta - actual

    const totalLost = dynLost + hygLost + rev1Lost + rev2Lost
    
    return {
      ...m,
      isAbsent: !m.attendance?.first_login,
      lta: {
        planned,
        dynLost, dynLta,
        hygLost, hygLta,
        rev1Lost, rev1Lta,
        rev2Lost, actual,
        totalLost
      }
    }
  })
  
  const teamPlanned = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.planned, 0)
  const teamDynLta = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.dynLta, 0)
  const teamHygLta = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.hygLta, 0)
  const teamRev1Lta = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.rev1Lta, 0)
  const teamActual = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.actual, 0)
  
  const teamDynLost = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.dynLost, 0)
  const teamHygLost = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.hygLost, 0)
  const teamRev1Lost = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.rev1Lost, 0)
  const teamRev2Lost = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.rev2Lost, 0)
  const teamLost = enrichedMembers.reduce((sum: number, m: any) => sum + m.lta.totalLost, 0)
  
  // Real Top Summary Metrics
  const totalRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0), 0)
  const totalNonRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.non_rtg_leads || 0), 0)
  const totalLeads = totalRtg + totalNonRtg
  const totalAuto = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.auto_allotted || 0), 0)
  const totalManual = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.manual_allotted || 0), 0)
  const absentCount = enrichedMembers.filter((m: any) => m.isAbsent).length
  const onlineCount = enrichedMembers.length - absentCount
  const noLeadsSellers = enrichedMembers.filter((m: any) => ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0)
  const noLeadsCount = noLeadsSellers.length
  const teamRtgPct = totalLeads > 0 ? Math.round((totalRtg / totalLeads) * 100) : 0
  const atRiskCount = enrichedMembers.filter((m: any) => !m.isAbsent && (m.goal_achieved_percent || 0) < 70).length
  const onTrackCount = enrichedMembers.filter((m: any) => !m.isAbsent && (m.goal_achieved_percent || 0) >= 85).length
  
  const validGoalMembers = enrichedMembers.filter((m: any) => !m.isAbsent && m.goal_achieved_percent != null)
  const teamAvgGoal = validGoalMembers.length > 0 
    ? Math.round(validGoalMembers.reduce((sum: number, m: any) => sum + m.goal_achieved_percent, 0) / validGoalMembers.length)
    : 0

  // S1/S2 Helpers
  const parseLogin = (m: any) => {
    const raw = m.attendance?.first_login
    if (!raw) return null
    const p = extractTimeParts(raw)
    return p ? (p.h * 60 + p.m) : null
  }
  const isLate = (m: any) => {
    const mins = parseLogin(m)
    return mins !== null && mins > 10 * 60 // After 10 AM
  }

  // Common colors for charts
  const CHART_COLORS = ['#378ADD', '#1D9E75', '#C9A84C', '#EF4444', '#7F77DD', '#F4631E']

  // ── Team Monthly Breakdown Aggregation ──
  const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0

  // Monthly allotment aggregation (from monthly_rows per member)
  const teamMonthlySum = (key: string) => enrichedMembers.reduce((sum: number, m: any) => {
    return sum + (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
  }, 0)

  const teamMonthlyTotalLeads = teamMonthlySum('total_leads_allotted')
  const teamMonthlyAutoAllotted = teamMonthlySum('auto_allotted')
  const teamMonthlyManualAllotted = teamMonthlySum('manual_allotted')
  const teamMonthlyRtgLeads = teamMonthlySum('rtg_leads')
  const teamMonthlyNonRtgLeads = teamMonthlySum('non_rtg_leads')
  const teamMonthlyPax1 = teamMonthlySum('pax_1')
  const teamMonthlyPax2 = teamMonthlySum('pax_2')
  const teamMonthlyPax3 = teamMonthlySum('pax_3')
  const teamMonthlyPax4 = teamMonthlySum('pax_4')
  const teamMonthlyPax4Plus = teamMonthlySum('pax_4_plus')
  const teamMonthlyTotalPax = teamMonthlyPax1 + teamMonthlyPax2 + teamMonthlyPax3 + teamMonthlyPax4 + teamMonthlyPax4Plus

  const teamAllotmentRows = [
    { label: 'Auto Allotted', value: teamMonthlyAutoAllotted, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: teamMonthlyManualAllotted, color: '#9CA3AF' },
    { label: 'RTG Leads', value: teamMonthlyRtgLeads, color: '#F4631E' },
    { label: 'Non-RTG', value: teamMonthlyNonRtgLeads, color: '#4B5563' },
  ]

  const teamPaxRows = [
    { label: '1-pax', value: teamMonthlyPax1, color: '#F3F4F6' },
    { label: '2-pax', value: teamMonthlyPax2, color: '#E5E7EB' },
    { label: '3-pax', value: teamMonthlyPax3, color: '#D1D5DB' },
    { label: '4-pax', value: teamMonthlyPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: teamMonthlyPax4Plus, color: '#6B7280' },
  ]

  // DOT aggregation
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [dotCy, dotCm] = date.split('-').map(Number)
  const currentMonthIndex = dotCm - 1

  const teamDotMap: Record<string, number> = {}
  enrichedMembers.forEach((m: any) => {
    ;(m.dot_rows || []).forEach((row: any) => {
      teamDotMap[row.dot_month] = (teamDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
    })
  })

  const teamDotChartData: { label: string; value: number; color: string }[] = []
  for (let i = 0; i < 6; i++) {
    let monthIdx = (currentMonthIndex + i) % 12
    let year = dotCy + Math.floor((currentMonthIndex + i) / 12)
    const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`
    teamDotChartData.push({ label: monthNames[monthIdx], value: teamDotMap[monthKey] || 0, color: '#F4631E' })
  }
  let futureSum = 0
  Object.entries(teamDotMap).forEach(([key, val]) => {
    const [y, m] = key.split('-').map(Number)
    const monthOffset = (y - dotCy) * 12 + (m - 1 - currentMonthIndex)
    if (monthOffset >= 6) futureSum += val
  })
  teamDotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })
  const maxTeamDotValue = Math.max(...teamDotChartData.map(d => d.value), 1)

  const monthStr = `${monthNames[currentMonthIndex]} ${dotCy}`

  // Per-member monthly helpers
  const memberMonthlySum = (m: any, key: string) => (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className={styles.title} style={{ color: '#fff', margin: 0 }}>
            Lead <span style={{ color: '#F4631E' }}>Allocation</span>
          </h1>
          <div style={{ color: '#8A8278', fontSize: '14px', marginTop: '4px' }}>
            {session.name} &middot; {date === todayStr() ? 'Today' : date}
          </div>
        </div>
        {members.length > 1 && (
          <div className={styles.toggleContainer}>
            <button className={`${styles.toggleBtn} ${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('personal')}>Personal</button>
            <button className={`${styles.toggleBtn} ${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className={styles.controls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className={`${styles.filterBtn} ${date === todayStr() ? styles.activeFilter : ''}`} 
              onClick={() => setDate(todayStr())}
              style={{ background: date === todayStr() ? 'rgba(244, 99, 30, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: date === todayStr() ? '#F4631E' : '#8A8278', border: date === todayStr() ? '1px solid #F4631E' : '1px solid #333', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Today
            </button>
            <div className={styles.datePicker}>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                max={todayStr()} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{totalLeads}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Total</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#E5E7EB', margin: '0 0 2px 0' }}>{totalAuto}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Auto</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#9CA3AF', margin: '0 0 2px 0' }}>{totalManual}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Manual</p>
          </div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{teamRtgPct}%</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG %</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#378ADD', margin: '0 0 2px 0' }}>{totalRtg}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG Count</p>
          </div>
        </div>
        <div 
          className={styles.summaryCard} 
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: noLeadsCount > 0 ? 'pointer' : 'default' }}
          onClick={() => {
            if (noLeadsCount > 0) {
              setShowNoLeadsModal(true);
            }
          }}
        >
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>{noLeadsCount}</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Sellers with no leads yet</p>
        </div>

        {/* Monthly MHE Trend KPI Card */}
        {(() => {
          // Build day-wise team avg MHE from monthly_lta_logs
          const dayMap: Record<string, { sum: number; count: number }> = {}
          enrichedMembers.forEach((m: any) => {
            ;(m.monthly_lta_logs || []).forEach((r: any) => {
              const d = r.log_date
              if (!d) return
              const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
              if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
              dayMap[d].sum += pct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          const teamAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const latestDay = sortedDays[sortedDays.length - 1]
          const latestAvg = latestDay ? parseFloat((dayMap[latestDay].sum / dayMap[latestDay].count).toFixed(1)) : 0
          const isGood = teamAvgMhePct <= 20

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isGood ? '#22C55E' : '#EF4444' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Monthly MHE Trend</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{teamAvgMhePct}%</span>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>avg</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Latest day: </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: latestAvg <= 20 ? '#22C55E' : '#EF4444' }}>{latestAvg}%</span>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )
        })()}

        {/* Goal vs SHB KPI Card */}
        {(() => {
          const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
          enrichedMembers.forEach((m: any) => {
            ;(m.monthly_goal_shb || []).forEach((r: any) => {
              const d = r.date
              if (!d) return
              const goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
              const shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
              if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
              dayMap[d].goalSum += goalPct
              dayMap[d].shbSum += shbPct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          
          let latestDay = sortedDays[sortedDays.length - 1]
          if (date && dayMap[date]) {
            latestDay = date
          }
          
          const latestAvgGoal = latestDay ? parseFloat((dayMap[latestDay].goalSum / dayMap[latestDay].count).toFixed(0)) : 0
          const latestAvgShb = latestDay ? parseFloat((dayMap[latestDay].shbSum / dayMap[latestDay].count).toFixed(0)) : 0
          
          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid #333`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3B82F6' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Team Goal vs SHB</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Goal</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* S1: Login & Availability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's1' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>Login & Availability</h2>
        </div>
      </div>
      {activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Orbit Login</th>
                      <th>Ozontell Ready</th>
                      <th>Delta</th>
                      <th>First Lead</th>
                      <th>Total Break</th>
                      <th>Break %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedMembers.slice().sort((a: any,b: any) => {
                      if (a.seller_email === session.email) return -1;
                      if (b.seller_email === session.email) return 1;
                      return (parseLogin(a) || 9999) - (parseLogin(b) || 9999);
                    }).map((m: any) => {
                      const late = isLate(m)
                      const b = parseBreaks(m.attendance?.break_timestamps)
                      const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at)
                      return (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} style={{ ...(late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}), cursor: 'pointer' }} onClick={() => setDrillSellerS1(m)}>
                          <td>
                            {m.seller_name}
                            {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{m.isAbsent ? '—' : formatTime(m.attendance?.first_login)}</td>
                          <td>{m.isAbsent ? '—' : formatTime(m.cti?.logged_in_at)}</td>
                          <td>{m.isAbsent ? '—' : delta !== null ? `${delta}m` : '—'}</td>
                          <td>{m.isAbsent ? '—' : formatTime(m.allotment?.first_lead_allotted_at_ist)}</td>
                          <td>{m.isAbsent ? '—' : `${b.totalMinutes}m`}</td>
                          <td>{m.isAbsent ? '—' : `${Math.round((b.totalMinutes / (9*60))*100)}%`}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
        </div>
      )}

      {/* S2: Break / Unavailability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's2' ? null : 's2')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's2' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>Break / Unavailability</h2>
        </div>
      </div>
      {activeSectionModal === 's2' && (
        <div className={sellerStyles.sectionContent}>
              {drillSellerS2 ? (
                <div className={styles.drillDownContainer}>
                  <div className={styles.drillHeader}>
                    <h3 className={styles.drillTitle}>{drillSellerS2.seller_name} — Break Details</h3>
                    <button className={styles.backBtn} onClick={() => setDrillSellerS2(null)}>← Back to team</button>
                  </div>
                  <div className={styles.kpiRow}>
                    {(() => {
                      const b = parseBreaks(drillSellerS2.attendance?.break_timestamps)
                      return (
                        <>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Total Break</span>
                            <span className={styles.kpiValue} style={{color: b.totalMinutes > 75 ? '#EF4444' : '#fff'}}>{b.totalMinutes}m</span>
                          </div>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Instances</span>
                            <span className={styles.kpiValue}>{b.count}</span>
                          </div>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Longest</span>
                            <span className={styles.kpiValue}>{b.longestMinutes}m</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Seller</th>
                        <th>Total Break</th>
                        <th>Instances</th>
                        <th>Longest</th>
                        <th>Break %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedMembers.map((m: any) => ({ ...m, b: parseBreaks(m.attendance?.break_timestamps) })).sort((a: any,b: any) => {
                        if (a.seller_email === session.email) return -1;
                        if (b.seller_email === session.email) return 1;
                        return b.b.totalMinutes - a.b.totalMinutes;
                      }).map((m: any) => (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}` }>
                          <td>
                            {m.seller_name}
                            {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td style={{color: m.b.totalMinutes > 75 ? '#EF4444' : 'inherit'}}>{m.isAbsent ? '—' : `${m.b.totalMinutes}m`}</td>
                          <td>{m.isAbsent ? '—' : m.b.count}</td>
                          <td>{m.isAbsent ? '—' : `${m.b.longestMinutes}m`}</td>
                          <td>{m.isAbsent ? '—' : `${Math.round((m.b.totalMinutes / (9*60))*100)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      )}

      {/* S3: RTG vs Non-RTG */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's3' ? null : 's3')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's3' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>RTG vs Non-RTG</h2>
        </div>
        {activeSectionModal !== 's3' && (
          <div className={styles.headerRight}>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Total Leads</span>
              <span className={styles.headerStatValue}>{totalLeads}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>RTG</span>
              <span className={styles.headerStatValue}>{totalRtg}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Non-RTG</span>
              <span className={styles.headerStatValue}>{totalNonRtg}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team RTG %</span>
              <span className={styles.headerStatValue}>{teamRtgPct}%</span>
            </div>
          </div>
        )}
      </div>
      {activeSectionModal === 's3' && (
        <div className={sellerStyles.sectionContent}>
              {drillSellerS3 ? (
                <div className={styles.drillDownContainer}>
                  <div className={styles.drillHeader}>
                    <h3 className={styles.drillTitle}>{drillSellerS3.seller_name} — RTG Split</h3>
                    <button className={styles.backBtn} onClick={() => setDrillSellerS3(null)}>← Back to team</button>
                  </div>
                  <div className={styles.kpiRow}>
                    <div className={styles.kpiItem}>
                      <span className={styles.kpiLabel}>Total Leads</span>
                      <span className={styles.kpiValue}>{(drillSellerS3.allotment?.rtg_leads || 0) + (drillSellerS3.allotment?.non_rtg_leads || 0)}</span>
                    </div>
                    <div className={styles.kpiItem}>
                      <span className={styles.kpiLabel}>RTG</span>
                      <span className={styles.kpiValue}>{drillSellerS3.allotment?.rtg_leads || 0}</span>
                    </div>
                    <div className={styles.kpiItem}>
                      <span className={styles.kpiLabel}>Non-RTG</span>
                      <span className={styles.kpiValue}>{drillSellerS3.allotment?.non_rtg_leads || 0}</span>
                    </div>
                    <div className={styles.kpiItem}>
                      <span className={styles.kpiLabel}>RTG %</span>
                      <span className={styles.kpiValue}>
                        {Math.round(((drillSellerS3.allotment?.rtg_leads || 0) / ((drillSellerS3.allotment?.rtg_leads || 0) + (drillSellerS3.allotment?.non_rtg_leads || 0) || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className={styles.chartContainer}>
                    <div className={styles.stackedBarRow}>
                      <div className={styles.barLabel}>RTG Split</div>
                      <div className={styles.barTrack}>
                        <div className={styles.barSegment} style={{width: `${Math.round(((drillSellerS3.allotment?.rtg_leads || 0) / ((drillSellerS3.allotment?.rtg_leads || 0) + (drillSellerS3.allotment?.non_rtg_leads || 0) || 1)) * 100)}%`, background: '#378ADD'}} />
                        <div className={styles.barSegment} style={{width: `${Math.round(((drillSellerS3.allotment?.non_rtg_leads || 0) / ((drillSellerS3.allotment?.rtg_leads || 0) + (drillSellerS3.allotment?.non_rtg_leads || 0) || 1)) * 100)}%`, background: '#1D9E75'}} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.kpiRow}>
                    {(() => {
                      const tRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : (m.allotment?.rtg_leads || 0)), 0)
                      const tNonRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : (m.allotment?.non_rtg_leads || 0)), 0)
                      const tTotal = tRtg + tNonRtg
                      return (
                        <>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Total Leads</span>
                            <span className={styles.kpiValue}>{tTotal}</span>
                          </div>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>RTG Count</span>
                            <span className={styles.kpiValue}>{tRtg}</span>
                          </div>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Non-RTG Count</span>
                            <span className={styles.kpiValue}>{tNonRtg}</span>
                          </div>
                          <div className={styles.kpiItem}>
                            <span className={styles.kpiLabel}>Team RTG %</span>
                            <span className={styles.kpiValue}>{tTotal > 0 ? Math.round((tRtg / tTotal) * 100) : 0}%</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className={styles.chartContainer}>
                    {enrichedMembers.slice().sort((a: any, b: any) => {
                      if (a.seller_email === session.email) return -1;
                      if (b.seller_email === session.email) return 1;
                      return 0;
                    }).map((m: any) => {
                      if (m.isAbsent) return null
                      const rtg = m.allotment?.rtg_leads || 0
                      const non = m.allotment?.non_rtg_leads || 0
                      const tot = rtg + non
                      if (tot === 0) return null
                      return (
                        <div key={m.seller_email} className={styles.stackedBarRow} onClick={() => setDrillSellerS3(m)} style={{cursor: 'pointer'}}>
                          <div className={styles.barLabel} style={{color: m.seller_email === session.email ? '#F4631E' : '#8A8278'}}>{m.seller_name.split(' ')[0]}</div>
                          <div className={styles.barTrack}>
                            <div className={styles.barSegment} style={{width: `${(rtg/tot)*100}%`, background: '#378ADD'}} title={`RTG: ${rtg}`} />
                            <div className={styles.barSegment} style={{width: `${(non/tot)*100}%`, background: '#1D9E75'}} title={`Non-RTG: ${non}`} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
        </div>
      )}

      {/* S7: Lead Time Availability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's7' ? null : 's7')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's7' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>LTA (Lead Time Availability)</h2>
        </div>
        {activeSectionModal !== 's7' && (
          <div className={styles.headerRight}>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Planned LTA</span>
              <span className={styles.headerStatValue}>{teamPlanned}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Final LTA</span>
              <span className={styles.headerStatValue}>{teamActual}</span>
            </div>
          </div>
        )}
      </div>
      {activeSectionModal === 's7' && (
        <div className={sellerStyles.sectionContent}>
              <div className={styles.kpiRow}>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Team Planned LTA</span>
                  <span className={styles.kpiValue}>{teamPlanned}</span>
                </div>
                <div className={styles.kpiItem} style={{ borderRight: 'none', paddingRight: 0 }}>
                  <span className={styles.kpiLabel}>Team Final LTA</span>
                  <span className={styles.kpiValue}>{teamActual}</span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: '24px' }}>
                  <button onClick={() => setShowTeamFunnel(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#E5E7EB', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    Team Funnel
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Planned LTA</th>
                      <th>Final LTA</th>
                      <th>Leads Allotted</th>
                      <th>Appetite Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedMembers.slice().sort((a: any, b: any) => {
                      if (a.seller_email === session.email) return -1;
                      if (b.seller_email === session.email) return 1;
                      return 0;
                    }).map((m: any) => {
                      const isYou = m.seller_email === session.email
                      const lostPct = m.lta.planned > 0 ? (m.lta.totalLost / m.lta.planned) * 100 : 0
                      const actualColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#F59E0B' : '#EF4444'
                      const lostColor = m.lta.totalLost < 3 ? '#22C55E' : m.lta.totalLost <= 6 ? '#F59E0B' : '#EF4444'
                      
                      const leads = (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)
                      const fulfPct = m.lta.actual > 0 ? Math.round((leads / m.lta.actual) * 100) : 0
                      
                      return (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerS7(m)}>
                          <td>
                            {m.seller_name}
                            {isYou && <span className={styles.youBadge}>(You)</span>}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{m.lta.planned}</td>
                          <td style={{color: actualColor, fontWeight: 600}}>
                            {m.lta.actual}
                          </td>
                          <td>{leads}</td>
                          <td style={{ color: fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>
                            {`${fulfPct}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
        </div>
      )}


      {/* ═══════════════ 3 CARDS: DOT | ALLOTMENT | PAX ═══════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#F4631E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Breakdown · {monthStr}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => setActiveBreakdownCard(activeBreakdownCard === 'dot' ? null : 'dot')}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {teamDotChartData.map((bar, i) => {
              const totalDOT = teamDotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = pct(bar.value, totalDOT)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                  <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${(bar.value / maxTeamDotValue) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${bar.color}40, ${bar.color}90)`,
                      borderRadius: '6px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      minWidth: bar.value > 0 ? '4px' : '0',
                    }} />
                  </div>
                  <div style={{ width: '30px', fontSize: '0.7rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 600, color: bar.value > 0 ? bar.color : '#5A5650',
                    background: bar.value > 0 ? `${bar.color}15` : 'rgba(255,255,255,0.03)',
                    padding: '2px 8px', borderRadius: '100px', minWidth: '38px', textAlign: 'center',
                  }}>
                    {barPct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Allotment Breakdown ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => setActiveBreakdownCard(activeBreakdownCard === 'allotment' ? null : 'allotment')}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamAllotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {pct(item.value, teamMonthlyTotalLeads)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => setActiveBreakdownCard(activeBreakdownCard === 'pax' ? null : 'pax')}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {teamPaxRows.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: p.color,
                  background: `${p.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {pct(p.value, teamMonthlyTotalPax)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Breakdown Drill-Down Modal ── */}
      {activeBreakdownCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setActiveBreakdownCard(null); setBreakdownDrillSeller(null); }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: breakdownDrillSeller ? '500px' : '700px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative', transition: 'width 0.3s' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { setActiveBreakdownCard(null); setBreakdownDrillSeller(null); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
            >×</button>

            {/* ── Seller Detail View (3 Cards) ── */}
            {breakdownDrillSeller ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => setBreakdownDrillSeller(null)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#E5E5E5', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                  >← Back</button>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>
                    {breakdownDrillSeller.seller_name}
                    {breakdownDrillSeller.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                    <span style={{ fontSize: '0.75rem', color: '#8A8278', marginLeft: '8px' }}>Monthly Breakdown · {monthStr}</span>
                  </h3>
                </div>

                {(() => {
                  const sm = breakdownDrillSeller
                  // Per-seller DOT
                  const sDotMap: Record<string, number> = {}
                  ;(sm.dot_rows || []).forEach((row: any) => {
                    sDotMap[row.dot_month] = (sDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
                  })
                  const sDotData: { label: string; value: number; color: string }[] = []
                  for (let i = 0; i < 6; i++) {
                    let mi = (currentMonthIndex + i) % 12
                    let yr = dotCy + Math.floor((currentMonthIndex + i) / 12)
                    sDotData.push({ label: monthNames[mi], value: sDotMap[`${yr}-${String(mi + 1).padStart(2, '0')}`] || 0, color: '#F4631E' })
                  }
                  let sFs = 0
                  Object.entries(sDotMap).forEach(([k, v]) => {
                    const [y2, m2] = k.split('-').map(Number)
                    if ((y2 - dotCy) * 12 + (m2 - 1 - currentMonthIndex) >= 6) sFs += v
                  })
                  sDotData.push({ label: '6+ Months', value: sFs, color: '#5A5650' })
                  const sMaxDot = Math.max(...sDotData.map(d => d.value), 1)

                  // Per-seller Allotment
                  const sTotalLeads = memberMonthlySum(sm, 'total_leads_allotted')
                  const sAllotRows = [
                    { label: 'Auto Allotted', value: memberMonthlySum(sm, 'auto_allotted'), color: '#E5E7EB' },
                    { label: 'Manual Allotted', value: memberMonthlySum(sm, 'manual_allotted'), color: '#9CA3AF' },
                    { label: 'RTG Leads', value: memberMonthlySum(sm, 'rtg_leads'), color: '#F4631E' },
                    { label: 'Non-RTG', value: memberMonthlySum(sm, 'non_rtg_leads'), color: '#4B5563' },
                  ]

                  // Per-seller PAX
                  const sp1 = memberMonthlySum(sm, 'pax_1'), sp2 = memberMonthlySum(sm, 'pax_2'), sp3 = memberMonthlySum(sm, 'pax_3'), sp4 = memberMonthlySum(sm, 'pax_4'), sp5 = memberMonthlySum(sm, 'pax_4_plus')
                  const sTotalPax = sp1 + sp2 + sp3 + sp4 + sp5
                  const sPaxRows = [
                    { label: '1-pax', value: sp1, color: '#F3F4F6' },
                    { label: '2-pax', value: sp2, color: '#E5E7EB' },
                    { label: '3-pax', value: sp3, color: '#D1D5DB' },
                    { label: '4-pax', value: sp4, color: '#9CA3AF' },
                    { label: '4+ pax', value: sp5, color: '#6B7280' },
                  ]

                  return (
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                      {/* DOT */}
                      {activeBreakdownCard === 'dot' && (
                        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sDotData.map((bar, i) => {
                              const sTotalDOT = sDotData.reduce((s, b) => s + b.value, 0)
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                                  <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(bar.value / sMaxDot) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${bar.color}40, ${bar.color}90)`, borderRadius: '6px', transition: 'width 0.6s', minWidth: bar.value > 0 ? '4px' : '0' }} />
                                  </div>
                                  <div style={{ width: '30px', fontSize: '0.7rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
                                  <span style={{ fontSize: '0.55rem', fontWeight: 600, color: bar.value > 0 ? bar.color : '#5A5650', background: bar.value > 0 ? `${bar.color}15` : 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '100px', minWidth: '38px', textAlign: 'center' }}>
                                    {pct(bar.value, sTotalDOT)}%
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Allotment */}
                      {activeBreakdownCard === 'allotment' && (
                        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sAllotRows.map((item, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: item.color, background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px' }}>
                                  {pct(item.value, sTotalLeads)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PAX */}
                      {activeBreakdownCard === 'pax' && (
                        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {sPaxRows.map((p, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                                <span style={{ fontSize: '0.55rem', fontWeight: 600, color: p.color, background: `${p.color}15`, padding: '2px 8px', borderRadius: '100px' }}>
                                  {pct(p.value, sTotalPax)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            ) : (
              /* ── Table View ── */
              <>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E' }} />
                  {activeBreakdownCard === 'dot' && 'DOT Distribution per Seller'}
                  {activeBreakdownCard === 'allotment' && 'Allotment Breakdown per Seller'}
                  {activeBreakdownCard === 'pax' && 'Leads by Group Size per Seller'}
                </h3>
                <p style={{ fontSize: '0.72rem', color: '#8A8278', margin: '0 0 20px', paddingLeft: '16px' }}>Tap a seller to drill in</p>

                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #222' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#151515' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Seller</th>
                        {activeBreakdownCard === 'dot' && teamDotChartData.map((d, i) => <th key={i} style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid #2a2a2a' }}>{d.label}</th>)}
                        {activeBreakdownCard === 'allotment' && <>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>Auto</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>Manual</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>RTG</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>Non-RTG</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>Total</th>
                        </>}
                        {activeBreakdownCard === 'pax' && <>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>1-pax</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>2-pax</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>3-pax</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>4-pax</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>4+</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #2a2a2a' }}>Total</th>
                        </>}
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedMembers.slice().sort((a: any, b: any) => {
                        if (a.seller_email === session.email) return -1;
                        if (b.seller_email === session.email) return 1;
                        return 0;
                      }).map((m: any, idx: number) => {
                        const isYou = m.seller_email === session.email
                        const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                        return (
                          <tr 
                            key={m.seller_email}
                            onClick={() => { setBreakdownDrillSeller(m); }}
                            style={{ cursor: 'pointer', background: rowBg, transition: 'background 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,99,30,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                          >
                            <td style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1e', color: '#E5E7EB', fontWeight: 500 }}>
                              {m.seller_name}
                              {isYou && <span style={{ background: '#F4631E', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>(You)</span>}
                            </td>
                            {activeBreakdownCard === 'dot' && (() => {
                              const memberDotMap: Record<string, number> = {}
                              ;(m.dot_rows || []).forEach((row: any) => {
                                memberDotMap[row.dot_month] = (memberDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
                              })
                              return teamDotChartData.map((d, i) => {
                                const monthIdx2 = (currentMonthIndex + i) % 12
                                const year2 = dotCy + Math.floor((currentMonthIndex + i) / 12)
                                if (i < 6) {
                                  const key = `${year2}-${String(monthIdx2 + 1).padStart(2, '0')}`
                                  const val = memberDotMap[key] || 0
                                  return <td key={i} style={{ padding: '14px 10px', textAlign: 'center', borderBottom: '1px solid #1e1e1e', color: val === 0 ? '#555' : '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</td>
                                } else {
                                  let fs = 0
                                  Object.entries(memberDotMap).forEach(([k, v]) => {
                                    const [y2, m2] = k.split('-').map(Number)
                                    if ((y2 - dotCy) * 12 + (m2 - 1 - currentMonthIndex) >= 6) fs += v
                                  })
                                  const val = fs
                                  return <td key={i} style={{ padding: '14px 10px', textAlign: 'center', borderBottom: '1px solid #1e1e1e', color: val === 0 ? '#555' : '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</td>
                                }
                              })
                            })()}
                            {activeBreakdownCard === 'allotment' && (() => {
                              const auto = memberMonthlySum(m, 'auto_allotted')
                              const manual = memberMonthlySum(m, 'manual_allotted')
                              const rtg = memberMonthlySum(m, 'rtg_leads')
                              const nonRtg = memberMonthlySum(m, 'non_rtg_leads')
                              const total = memberMonthlySum(m, 'total_leads_allotted')
                              const cellStyle = (v: any, highlight?: boolean) => ({ padding: '14px 10px', textAlign: 'center' as const, borderBottom: '1px solid #1e1e1e', color: v === 0 ? '#555' : highlight ? '#F4631E' : '#E5E7EB', fontWeight: highlight ? 700 : 600, fontVariantNumeric: 'tabular-nums' as const })
                              return <>
                                <td style={cellStyle(auto)}>{auto}</td>
                                <td style={cellStyle(manual)}>{manual}</td>
                                <td style={cellStyle(rtg, true)}>{rtg}</td>
                                <td style={cellStyle(nonRtg)}>{nonRtg}</td>
                                <td style={{ ...cellStyle(total), fontWeight: 700, color: total === 0 ? '#555' : '#fff' }}>{total}</td>
                              </>
                            })()}
                            {activeBreakdownCard === 'pax' && (() => {
                              const p1 = memberMonthlySum(m, 'pax_1')
                              const p2 = memberMonthlySum(m, 'pax_2')
                              const p3 = memberMonthlySum(m, 'pax_3')
                              const p4 = memberMonthlySum(m, 'pax_4')
                              const p5 = memberMonthlySum(m, 'pax_4_plus')
                              const total = p1 + p2 + p3 + p4 + p5
                              const cellStyle = (v: any) => ({ padding: '14px 10px', textAlign: 'center' as const, borderBottom: '1px solid #1e1e1e', color: v === 0 ? '#555' : '#E5E7EB', fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const })
                              return <>
                                <td style={cellStyle(p1)}>{p1}</td>
                                <td style={cellStyle(p2)}>{p2}</td>
                                <td style={cellStyle(p3)}>{p3}</td>
                                <td style={cellStyle(p4)}>{p4}</td>
                                <td style={cellStyle(p5)}>{p5}</td>
                                <td style={{ ...cellStyle(total), fontWeight: 700, color: total === 0 ? '#555' : '#fff' }}>{total}</td>
                              </>
                            })()}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Monthly MHE Trend Modal ═══════════════ */}
      {showMheTrendModal && (() => {
        // Build day-wise data
        const dayMap: Record<string, { sum: number; count: number }> = {}
        enrichedMembers.forEach((m: any) => {
          ;(m.monthly_lta_logs || []).forEach((r: any) => {
            const d = r.log_date; if (!d) return
            const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
            if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
            dayMap[d].sum += pct; dayMap[d].count += 1
          })
        })
        const sortedDays = Object.keys(dayMap).sort()
        const teamAvgByDay = sortedDays.map(d => ({ date: d, avg: parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)) }))

        // Per-seller summary
        const sellerSummaries = enrichedMembers.map((m: any) => {
          const logs = m.monthly_lta_logs || []
          const avg = logs.length > 0
            ? parseFloat((logs.reduce((s: number, r: any) => s + (typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0), 0) / logs.length).toFixed(1))
            : 0
          return { ...m, mheAvg: avg }
        }).sort((a: any, b: any) => b.mheAvg - a.mheAvg)

        // Drill: current seller logs
        const drillLogs = mheDrillSeller
          ? (mheDrillSeller.monthly_lta_logs || []).map((r: any) => ({
              date: r.log_date,
              pct: typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
            })).sort((a: any, b: any) => a.date.localeCompare(b.date))
          : []

        const activeData = mheDrillSeller ? drillLogs : teamAvgByDay
        const activeLabels = activeData.map((d: any) => new Date(d.date).getDate().toString())
        const activeValues = activeData.map((d: any) => mheDrillSeller ? d.pct : d.avg)
        const chartColor = mheDrillSeller
          ? (mheDrillSeller.mheAvg <= 20 ? '#22C55E' : '#EF4444')
          : (teamAvgByDay.length > 0 && teamAvgByDay[teamAvgByDay.length - 1].avg <= 20 ? '#22C55E' : '#EF4444')

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setShowMheTrendModal(false); setMheDrillSeller(null); }}
          >
            <div
              style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px', width: '820px', maxWidth: '96vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowMheTrendModal(false); setMheDrillSeller(null); }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#E5E7EB', cursor: 'pointer', fontSize: '1rem', padding: '4px 10px', borderRadius: '6px', lineHeight: 1 }}
              >✕</button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                {mheDrillSeller && (
                  <button
                    onClick={() => setMheDrillSeller(null)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#E5E5E5', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                  >← Team</button>
                )}
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: chartColor, flexShrink: 0 }} />
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  {mheDrillSeller ? `${mheDrillSeller.seller_name} — MHE Trend` : 'Monthly MHE Trend · Team Avg'}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#8A8278', marginLeft: '4px' }}>{monthStr}</span>
              </div>
              <p style={{ color: '#8A8278', fontSize: '0.75rem', margin: '0 0 20px 20px' }}>
                {mheDrillSeller ? 'Day-wise MHE % for this seller.' : 'Day-wise avg MHE % across all team sellers.'}
              </p>

              {/* Chart */}
              <div style={{ height: '220px', marginBottom: '24px' }}>
                {activeData.length > 0 ? (
                  <MheTrendChart labels={activeLabels} values={activeValues} color={chartColor} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No MHE data for this month yet.</div>
                )}
              </div>

              {/* Seller list (only in team view) */}
              {!mheDrillSeller && (
                <>
                  <div style={{ fontSize: '0.68rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 600 }}>Seller Breakdown</div>
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #222' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#151515' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Seller</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Avg MHE %</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Days</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellerSummaries.map((s: any, idx: number) => {
                          const isGood = s.mheAvg <= 20
                          const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                          return (
                            <tr
                              key={s.seller_email}
                              style={{ background: rowBg, cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,99,30,0.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                              onClick={() => setMheDrillSeller(s)}
                            >
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e1e', color: '#E5E7EB', fontWeight: 500 }}>
                                {s.seller_name}
                                {s.seller_email === session.email && <span style={{ background: '#F4631E', color: '#fff', fontSize: '0.58rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>(You)</span>}
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e1e', textAlign: 'right', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                                {s.mheAvg}%
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e1e', textAlign: 'right', color: '#8A8278', fontVariantNumeric: 'tabular-nums' }}>
                                {(s.monthly_lta_logs || []).length}
                              </td>
                              <td style={{ padding: '12px 14px', borderBottom: '1px solid #1e1e1e', textAlign: 'center' }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 9px', borderRadius: '100px', background: isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: isGood ? '#22C55E' : '#EF4444' }}>
                                  {isGood ? 'GOOD' : 'HIGH'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ═══════════════ Goal vs SHB Modal ═══════════════ */}
      {showGoalShbTrendModal && (() => {
        // Build day-wise data
        const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
        enrichedMembers.forEach((m: any) => {
          ;(m.monthly_goal_shb || []).forEach((r: any) => {
            const d = r.date; if (!d) return
            const goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
            const shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
            if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
            dayMap[d].goalSum += goalPct; dayMap[d].shbSum += shbPct; dayMap[d].count += 1
          })
        })
        const sortedDays = Object.keys(dayMap).sort()

        let displayDate = sortedDays[sortedDays.length - 1]
        if (date && sortedDays.includes(date)) {
          displayDate = date
        }

        // Pad data up to the current date so we see days 1, 2, 3 etc. even if they are 0
        const [qy, qm] = (date || todayStr()).split('-').map(Number)
        const endDate = new Date(date || todayStr()).getDate()
        const paddedTeamAvg = []
        for (let i = 1; i <= endDate; i++) {
          const dStr = `${qy}-${String(qm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
          if (dayMap[dStr]) {
            paddedTeamAvg.push({
              date: dStr,
              goalAvg: parseFloat((dayMap[dStr].goalSum / dayMap[dStr].count).toFixed(0)),
              shbAvg: parseFloat((dayMap[dStr].shbSum / dayMap[dStr].count).toFixed(0))
            })
          } else {
            paddedTeamAvg.push({ date: dStr, goalAvg: 0, shbAvg: 0 })
          }
        }

        // Per-seller summary
        const sellerSummaries = enrichedMembers.map((m: any) => {
          const logs = m.monthly_goal_shb || []
          const todaysData = logs.find((l: any) => l.date === displayDate)
          return { 
            ...m, 
            goalToday: todaysData ? (todaysData.goal_completion * 100) : 0,
            shbToday: todaysData ? (todaysData.shb_percent * 100) : 0
          }
        }).sort((a: any, b: any) => b.shbToday - a.shbToday)

        // Drill: current seller logs padded
        let drillLogs: any[] = []
        if (goalShbDrillSeller) {
          for (let i = 1; i <= endDate; i++) {
            const dStr = `${qy}-${String(qm).padStart(2, '0')}-${String(i).padStart(2, '0')}`
            const existing = (goalShbDrillSeller.monthly_goal_shb || []).find((r: any) => r.date === dStr)
            drillLogs.push({
              date: dStr,
              goalAvg: existing && typeof existing.goal_completion === 'number' ? existing.goal_completion * 100 : 0,
              shbAvg: existing && typeof existing.shb_percent === 'number' ? existing.shb_percent * 100 : 0
            })
          }
        }

        const activeData = goalShbDrillSeller ? drillLogs : paddedTeamAvg
        const activeLabels = activeData.map((d: any) => new Date(d.date).getDate().toString())
        const activeGoalValues = activeData.map((d: any) => d.goalAvg)
        const activeShbValues = activeData.map((d: any) => d.shbAvg)

        return (
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setShowGoalShbTrendModal(false); setGoalShbDrillSeller(null); }}
          >
            <div
              style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px', width: '820px', maxWidth: '96vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowGoalShbTrendModal(false); setGoalShbDrillSeller(null); }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#E5E7EB', cursor: 'pointer', fontSize: '1rem', padding: '4px 10px', borderRadius: '6px', lineHeight: 1 }}
              >✕</button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                {goalShbDrillSeller && (
                  <button
                    onClick={() => setGoalShbDrillSeller(null)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#E5E5E5', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem' }}
                  >← Team</button>
                )}
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  {goalShbDrillSeller ? `${goalShbDrillSeller.seller_name} — Goal vs SHB` : 'Team Avg Goal vs SHB Trend'}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#8A8278', marginLeft: '4px' }}>{monthStr}</span>
              </div>
              <p style={{ color: '#8A8278', fontSize: '0.75rem', margin: '0 0 20px 20px' }}>
                {goalShbDrillSeller ? 'Day-wise Goal and SHB % for this seller.' : 'Day-wise avg Goal and SHB % across all team sellers.'}
              </p>

              {/* Chart */}
              <div style={{ height: '260px', marginBottom: '24px' }}>
                {activeData.length > 0 ? (
                  <GoalShbTrendChart labels={activeLabels} goalValues={activeGoalValues} shbValues={activeShbValues} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No Goal vs SHB data for this month yet.</div>
                )}
              </div>

              {/* Seller list (only in team view) */}
              {!goalShbDrillSeller && (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                     <div style={{ fontSize: '0.68rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Seller Breakdown</div>
                     <div style={{ fontSize: '0.65rem', color: '#8A8278' }}>Showing data for: <span style={{color: '#fff'}}>{displayDate}</span></div>
                  </div>
                  <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #222' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#111', color: '#666', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 500 }}>Seller Name</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Goal %</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>SHB %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellerSummaries.map((s: any, idx: number) => {
                          const rowBg = idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'
                          return (
                            <tr
                              key={s.seller_email}
                              style={{ background: rowBg, cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = rowBg }}
                              onClick={() => setGoalShbDrillSeller(s)}
                            >
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', color: '#E5E7EB', fontWeight: 500 }}>
                                {s.seller_name}
                                {s.seller_email === session.email && <span style={{ background: '#3B82F6', color: '#fff', fontSize: '0.58rem', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>(You)</span>}
                              </td>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', textAlign: 'right', fontWeight: 700, color: '#3B82F6', fontVariantNumeric: 'tabular-nums' }}>
                                {s.goalToday.toFixed(0)}%
                              </td>
                              <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e1e', textAlign: 'right', fontWeight: 700, color: '#EAB308', fontVariantNumeric: 'tabular-nums' }}>
                                {s.shbToday.toFixed(0)}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* No Leads Modal */}
      {showNoLeadsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNoLeadsModal(false)}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowNoLeadsModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
            >×</button>
            <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E' }} />
              Sellers with no leads yet
            </h3>
            <p style={{ color: '#F4631E', margin: '4px 0 16px', fontSize: '0.9rem' }}>{noLeadsCount} sellers</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '16px', paddingRight: '8px' }}>
              {noLeadsSellers.slice().sort((a: any, b: any) => {
                if (a.seller_email === session.email) return -1;
                if (b.seller_email === session.email) return 1;
                return 0;
              }).map((s: any) => (
                <div key={s.seller_email} style={{ padding: '12px 0', borderBottom: '1px solid #333', color: '#E5E7EB', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {s.seller_name}
                    {s.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                    {s.isAbsent && <span className={styles.absentPill}>Absent</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* S1 KPI Modals */}
      {activeTileS1 && drillSellerS1 && (() => {
        const kekaTime = drillSellerS1.attendance?.first_login;
        const orbitTime = drillSellerS1.orbit?.first_login;
        const lastLogout = drillSellerS1.attendance?.last_logout;
        const totalLoginToLogout = kekaTime && lastLogout ? minutesBetween(kekaTime, lastLogout) : null;
        const ozontellReady = drillSellerS1.cti?.logged_in_at;
        const deltaOzontellFromKeka = minutesBetween(kekaTime, ozontellReady);
        const firstLead = drillSellerS1.allotment?.first_lead_allotted_at_ist;
        const deltaKekaToFirst = minutesBetween(kekaTime, firstLead);
        const deltaOzontellToFirst = minutesBetween(ozontellReady, firstLead);
        
        return (
          <div className={sellerStyles.modalOverlay} onClick={() => setActiveTileS1(null)}>
            <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()}>
              <button className={sellerStyles.modalClose} onClick={() => setActiveTileS1(null)}>✕</button>

              {activeTileS1 === 'keka' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} /><span className={sellerStyles.modalTitle}>Keka Login</span></div>
                  <p className={sellerStyles.modalInsight}>Logged in at {formatTime(kekaTime)}.</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Login</span><strong>{formatTime(kekaTime)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Logout</span><strong>{formatTime(lastLogout)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Session</span><strong>{totalLoginToLogout ? `${Math.floor(totalLoginToLogout / 60)}h ${totalLoginToLogout % 60}m` : '—'}</strong></div>
                    <div className={sellerStyles.modalStat}><span>To Ozontell</span><strong className={sellerStyles.statGood}>{deltaOzontellFromKeka !== null ? `${deltaOzontellFromKeka}m` : '—'}</strong></div>
                  </div>
                </>
              )}
              {activeTileS1 === 'orbit' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#8B7FE8' }} /><span className={sellerStyles.modalTitle}>Orbit Login</span></div>
                  <p className={sellerStyles.modalInsight}>Logged into Orbit at {formatTime(orbitTime)}.</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Login</span><strong>{formatTime(orbitTime)}</strong></div>
                  </div>
                </>
              )}
              {activeTileS1 === 'ozontell' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#33C2C9' }} /><span className={sellerStyles.modalTitle}>Ozontell Ready</span></div>
                  <p className={sellerStyles.modalInsight}>{deltaOzontellFromKeka !== null && deltaOzontellFromKeka <= 5 ? `Ready in ${deltaOzontellFromKeka} min — great!` : `Ready ${deltaOzontellFromKeka ?? '—'} min after Orbit.`}</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Ready at</span><strong>{formatTime(ozontellReady)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>After Orbit</span><strong className={sellerStyles.statGood}>{deltaOzontellFromKeka}m</strong></div>
                    <div className={sellerStyles.modalStat}><span>To lead</span><strong>{deltaOzontellToFirst !== null ? `${deltaOzontellToFirst}m` : '—'}</strong></div>
                  </div>
                </>
              )}
              {activeTileS1 === 'first' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#F4631E' }} /><span className={sellerStyles.modalTitle}>First Lead</span></div>
                  <p className={sellerStyles.modalInsight}>{deltaKekaToFirst !== null && deltaKekaToFirst <= 30 ? `First lead in ${deltaKekaToFirst} min!` : `First lead at ${formatTime(firstLead)}.`}</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Time</span><strong>{formatTime(firstLead)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>After Orbit</span><strong className={sellerStyles.statGood}>{deltaKekaToFirst}m</strong></div>
                    <div className={sellerStyles.modalStat}><span>Total</span><strong>{drillSellerS1.allotment?.rtg_leads || drillSellerS1.allotment?.non_rtg_leads ? (drillSellerS1.allotment?.rtg_leads || 0) + (drillSellerS1.allotment?.non_rtg_leads || 0) : '—'}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Auto/Manual</span><strong>{drillSellerS1.allotment?.auto_allotted || 0}/{drillSellerS1.allotment?.manual_allotted || 0}</strong></div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* S1 Timeline Block Modal */}
      {activeBlockS1 && (
        <div className={sellerStyles.modalOverlay} onClick={() => setActiveBlockS1(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()}>
            <button className={sellerStyles.modalClose} onClick={() => setActiveBlockS1(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: activeBlockS1.leads > 0 ? (activeBlockS1.isLateAllocation ? '#F4631E' : '#33C2C9') : activeBlockS1.eligible ? '#6B6660' : '#3a3a3a' }} />
              <span className={sellerStyles.modalTitle}>{activeBlockS1.hour}</span>
            </div>
            <p className={sellerStyles.modalInsight}>
              {activeBlockS1.isLateAllocation
                ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} late allocation lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Eligible for late allocation (6PM/7PM catch-up).')
                : activeBlockS1.isBreak
                  ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} manual lead${activeBlockS1.leads > 1 ? 's' : ''} landed while on break.` : 'On break (logged out of Orbit). Not eligible for auto-allocation.')
                  : !activeBlockS1.isReady
                    ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} manual lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Not ready on Ozontell. Not eligible for auto-allocation.')
                    : (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} auto lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Eligible, no lead.')
              }
            </p>
          </div>
        </div>
      )}

      {/* Funnel Modal */}
      {drillSellerS7 && (
        <div className={sellerStyles.modalOverlay} onClick={() => setDrillSellerS7(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setDrillSellerS7(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{drillSellerS7.seller_name} — LTA Funnel</span>
            </div>
            
            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGrad2)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const lta = drillSellerS7.lta;
                  const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
                  const stages = [
                    { id: 'planned', label: 'PLANNED LTA', value: lta.planned, color: '#3B82F6', dropText: getFunnelDropText(lta.dynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'DYNAMIC LTA', value: lta.dynLta, color: '#EAB308', dropText: getFunnelDropText(lta.hygLost, 'Hygiene'), width: '88%' },
                    { id: 'hygiene', label: 'HYGIENE LTA', value: lta.hygLta, color: '#F97316', dropText: getFunnelDropText(lta.rev1Lost, 'Goal Complete'), width: '74%' },
                    { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: lta.rev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(lta.rev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'FINAL LTA', value: lta.actual, color: '#22C55E', dropText: null, width: '48%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
                        </div>
                      <div className={sellerStyles.ltaFunnelCardBody}>
                        <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                        <span className={sellerStyles.ltaFunnelCardUnit}>leads</span>
                      </div>
                    </div>
                    {step.dropText && (
                      <div className={sellerStyles.ltaFunnelDropText}>
                        {step.dropText}
                      </div>
                    )}
                  </div>
                ))})()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Funnel Modal */}
      {showTeamFunnel && (
        <div className={sellerStyles.modalOverlay} onClick={() => setShowTeamFunnel(false)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setShowTeamFunnel(false)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>My Team — LTA Funnel</span>
            </div>
            
            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradTeam)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradTeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
                  const stages = [
                    { id: 'planned', label: 'TEAM PLANNED', value: teamPlanned, color: '#3B82F6', dropText: getFunnelDropText(teamDynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'TEAM DYNAMIC', value: teamDynLta, color: '#EAB308', dropText: getFunnelDropText(teamHygLost, 'Hygiene'), width: '85%' },
                    { id: 'hygiene', label: 'TEAM HYGIENE', value: teamHygLta, color: '#F97316', dropText: getFunnelDropText(teamRev1Lost, 'Goal Complete'), width: '70%' },
                    { id: 'goalComplete', label: 'TEAM GOAL COMPLETE', value: teamRev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(teamRev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'TEAM FINAL', value: teamActual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
                        </div>
                        <div className={sellerStyles.ltaFunnelCardBody}>
                          <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                          <span className={sellerStyles.ltaFunnelCardLabel}>Leads</span>
                        </div>
                      </div>
                      {step.dropText && (
                        <div className={sellerStyles.ltaFunnelDrop}>
                          <div className={sellerStyles.ltaFunnelLine} />
                          <div className={sellerStyles.ltaFunnelDropText}>{step.dropText}</div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* S1: Login & Availability Modal */}
      {drillSellerS1 && !activeTileS1 && !activeBlockS1 && (
        <div className={sellerStyles.modalOverlay} onClick={() => setDrillSellerS1(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '700px', maxWidth: '800px', padding: 0 }}>
            <button className={sellerStyles.modalClose} onClick={() => setDrillSellerS1(null)}>✕</button>
            <div style={{ padding: '24px 24px 16px', background: '#111', borderRadius: '16px 16px 0 0' }}>
              <div className={sellerStyles.modalHeader} style={{ marginBottom: '8px' }}>
                <span className={sellerStyles.modalDot} style={{ background: '#F4631E' }} />
                <span className={sellerStyles.modalTitle}>{drillSellerS1.seller_name} — Login & Availability</span>
              </div>
              <div style={{ color: '#8A8278', fontSize: '0.8rem', marginBottom: '16px' }}>Click on a metric to view exact timeline details.</div>
              <div className={styles.kpiRow} style={{ margin: 0, padding: 0 }}>
                <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileS1('keka')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className={styles.kpiLabel}>Keka Login</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.attendance?.first_login)}</span>
                </div>
                <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileS1('orbit')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className={styles.kpiLabel}>Orbit Login</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.orbit?.first_login)}</span>
                </div>
                <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileS1('ozontell')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className={styles.kpiLabel}>Ozontell Ready</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.cti?.logged_in_at)}</span>
                </div>
                <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileS1('first')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span className={styles.kpiLabel}>First Lead</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.allotment?.first_lead_allotted_at_ist)}</span>
                </div>
                <div className={styles.kpiItem} style={{ flex: 1 }}>
                  <span className={styles.kpiLabel}>Total Break</span>
                  <span className={styles.kpiValue}>{parseBreaks(drillSellerS1.attendance?.break_timestamps).totalMinutes}m</span>
                </div>
              </div>
            </div>
            
            <div className={sellerStyles.timelineSection}>
              <div className={sellerStyles.timelineHeader}>
                <div className={sellerStyles.timelineTitle}>Today's lead timeline</div>
                <div className={sellerStyles.timelineSub}>9 AM – 9 PM · hover for details</div>
              </div>
              <div className={sellerStyles.timelineContainer}>
                {(() => {
                  const timelineStartMin = 9 * 60;
                  const timelineEndMin = 21 * 60;
                  const formatMarkerTime = (mins: number) => {
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    let h12 = h % 12;
                    if (h12 === 0) h12 = 12;
                    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                  };

                  const renderMarker = (minOfDay: number | null, color: string, label: string, isTriangle: boolean) => {
                    if (minOfDay === null) return null;
                    let percent = ((minOfDay - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100;
                    if (percent < 0) percent = 0;
                    if (percent > 100) percent = 100;
                    
                    const paddingBottom = isTriangle ? '0' : '8px';
                    
                    return (
                      <div key={label} className="timeline-marker-group" style={{
                        position: 'absolute', left: `${percent}%`, bottom: '100%', transform: 'translateX(-50%)',
                        zIndex: 20, pointerEvents: 'auto', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        paddingBottom
                      }}>
                        <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', backgroundColor: color, padding: '2px 4px', borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', minWidth: '40px', textAlign: 'center' }}>
                          <span className="timeline-marker-label">{label}</span>
                          <span className="timeline-marker-time" style={{ display: 'none' }}>{formatMarkerTime(minOfDay)}</span>
                        </div>
                        {isTriangle ? (
                          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${color}` }} />
                        ) : (
                          <div style={{ width: '2px', height: isTriangle ? '6px' : '28px', background: color, borderRadius: '1px' }} />
                        )}
                      </div>
                    )
                  }

                  const kekaTime = drillSellerS1.attendance?.first_login;
                  const lastLogout = drillSellerS1.attendance?.last_logout;
                  const finalLtaVal = drillSellerS1.daily_lta?.final_lta || 0;

                  const firstLoginMin = kekaTime ? (extractTimeParts(kekaTime)?.h || 0) * 60 + (extractTimeParts(kekaTime)?.m || 0) : null;
                  const lastLogoutMin = lastLogout ? (extractTimeParts(lastLogout)?.h || 0) * 60 + (extractTimeParts(lastLogout)?.m || 0) : null;

                  let runningLeads = 0;
                  let time50: number | null = null;
                  let time100: number | null = null;
                  const target50 = finalLtaVal / 2;
                  const target100 = finalLtaVal;

                  const hourlyData = drillSellerS1.hourly || [];
                  const hourlyMapTemp: Record<string, number> = {};
                  hourlyData.forEach((h: any) => {
                    let bucket: string = (h.hour_bucket?.toString()?.toUpperCase() || '');
                    if (bucket.includes(':')) {
                      const parts = extractTimeParts(bucket);
                      if (parts) {
                        const ampm = parts.h >= 12 ? 'PM' : 'AM';
                        let h12 = parts.h % 12;
                        if (h12 === 0) h12 = 12;
                        bucket = `${h12}${ampm}`;
                      }
                    } else {
                      const match = bucket.match(/^(\d+)/);
                      if (match) {
                        const hr = parseInt(match[1], 10);
                        const ampm = hr >= 12 ? 'PM' : 'AM';
                        let h12 = hr % 12;
                        if (h12 === 0) h12 = 12;
                        bucket = `${h12}${ampm}`;
                      } else {
                        bucket = bucket.replace(/\s+/g, '');
                      }
                    }
                    const numLeads = Number(h.leads_allotted_in_bucket) || 0;
                    hourlyMapTemp[bucket] = (hourlyMapTemp[bucket] || 0) + numLeads;
                  });

                  for (const hour of HOUR_SLOTS) {
                    if (time50 && time100) break;
                    runningLeads += (hourlyMapTemp[hour] || 0);

                    let isAm = hour.includes('AM');
                    let hStr = hour.replace(/[A-Z]/g, '');
                    let h = parseInt(hStr, 10);
                    if (isAm && h === 12) h = 0;
                    if (!isAm && h !== 12) h += 12;
                    const minOfDay = h * 60 + 30; // center of the bucket

                    if (finalLtaVal > 0) {
                      if (runningLeads >= target50 && time50 === null) time50 = minOfDay;
                      if (runningLeads >= target100 && time100 === null) time100 = minOfDay;
                    }
                  }

                  return (
                    <>
                      <style>{`
                        .timeline-marker-group:hover .timeline-marker-label { display: none !important; }
                        .timeline-marker-group:hover .timeline-marker-time { display: inline !important; }
                      `}</style>
                      {renderMarker(firstLoginMin, '#3B82F6', 'Login', true)}
                      {renderMarker(lastLogoutMin, '#EF4444', 'Logout', true)}
                      {renderMarker(time50, '#EAB308', '50% Appetite', false)}
                      {renderMarker(time100, '#22C55E', '100% Appetite', false)}
                    </>
                  )
                })()}
                <div className={sellerStyles.timelineBlocksRow}>
                  {(() => {
                    const timelineStartMin = 9 * 60;
                    const timelineEndMin = 21 * 60;
                    const boundaries = new Set<number>();
                    for (let m = timelineStartMin; m <= timelineEndMin; m += 60) boundaries.add(m);
                    
                    const breaks = parseBreaks(drillSellerS1.attendance?.break_timestamps);
                    const readyWindows = parseReadyWindows(drillSellerS1.cti?.logged_in_at ? `${drillSellerS1.cti.logged_in_at}-${drillSellerS1.attendance?.last_logout || new Date().toISOString()}` : null);
                    const actualReadyWindows = parseReadyWindows(drillSellerS1.cti?.ready_timestamps);
                    const finalReadyWindows = drillSellerS1.cti?.ready_timestamps ? actualReadyWindows : readyWindows;

                    breaks.windows.forEach(w => {
                      const s = w.startH * 60 + w.startM;
                      const e = w.endH * 60 + w.endM;
                      if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s);
                      if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e);
                    });
                    finalReadyWindows.forEach(w => {
                      const s = w.startH * 60 + w.startM;
                      const e = w.endH * 60 + w.endM;
                      if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s);
                      if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e);
                    });

                    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
                    const segments: { start: number, end: number, hourBucket: string, widthPercent: number }[] = [];
                    
                    for (let i = 0; i < sortedBoundaries.length - 1; i++) {
                      const start = sortedBoundaries[i];
                      const end = sortedBoundaries[i + 1];
                      if (start === end) continue;
                      
                      const hour24 = Math.floor(start / 60);
                      let ampm = hour24 >= 12 ? 'PM' : 'AM';
                      let h12 = hour24 % 12;
                      if (h12 === 0) h12 = 12;
                      
                      segments.push({
                        start, end, hourBucket: `${h12}${ampm}`,
                        widthPercent: ((end - start) / (timelineEndMin - timelineStartMin)) * 100
                      });
                    }

                    const hourlyData = drillSellerS1.hourly || [];
                    const hourlyMap: Record<string, number> = {};
                    hourlyData.forEach((h: any) => {
                      let bucket: string = (h.hour_bucket?.toString()?.toUpperCase() || '');
                      if (bucket.includes(':')) {
                        const parts = extractTimeParts(bucket);
                        if (parts) {
                          const ampm = parts.h >= 12 ? 'PM' : 'AM';
                          let h12 = parts.h % 12;
                          if (h12 === 0) h12 = 12;
                          bucket = `${h12}${ampm}`;
                        }
                      } else {
                        const match = bucket.match(/^(\d+)/);
                        if (match) {
                          const hr = parseInt(match[1], 10);
                          const ampm = hr >= 12 ? 'PM' : 'AM';
                          let h12 = hr % 12;
                          if (h12 === 0) h12 = 12;
                          bucket = `${h12}${ampm}`;
                        } else {
                          bucket = bucket.replace(/\s+/g, '');
                        }
                      }
                      const numLeads = Number(h.leads_allotted_in_bucket) || 0;
                      hourlyMap[bucket] = (hourlyMap[bucket] || 0) + numLeads;
                    });
                    const availableLeads = { ...hourlyMap };
                    
                    const formatMinTime = (mins: number) => {
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      let h12 = h % 12;
                      if (h12 === 0) h12 = 12;
                      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                    };

                    const mappedSegments = segments.map((seg, idx) => {
                      const midPoint = seg.start + (seg.end - seg.start) / 2;
                      
                      const overlappingBreak = breaks.windows.find(w => {
                        const s = w.startH * 60 + w.startM;
                        const e = w.endH * 60 + w.endM;
                        return midPoint >= s && midPoint < e;
                      });
                      const isBreak = !!overlappingBreak;
                      
                      const isReady = finalReadyWindows.some(w => {
                        const s = w.startH * 60 + w.startM;
                        const e = w.endH * 60 + w.endM;
                        return midPoint >= s && midPoint < e;
                      });

                      const eligible = !isBreak && isReady;
                      let blockClass = sellerStyles.blockNotEligible;
                      let leads = 0;

                      if (eligible && availableLeads[seg.hourBucket] > 0) {
                         leads = availableLeads[seg.hourBucket];
                         availableLeads[seg.hourBucket] = 0;
                      }
                      
                      const isLastSegmentOfHour = (idx === segments.length - 1) || (segments[idx + 1].hourBucket !== seg.hourBucket);
                      if (isLastSegmentOfHour && availableLeads[seg.hourBucket] > 0) {
                         leads = availableLeads[seg.hourBucket];
                         availableLeads[seg.hourBucket] = 0;
                      }

                      let hoverText = '';
                      let timePrefix = '';
                      if (leads > 0) {
                          if (eligible) {
                            blockClass = sellerStyles.blockLeadReceived;
                            hoverText = `${leads} lead(s) landed`;
                          } else {
                            blockClass = sellerStyles.blockManualLead;
                            hoverText = `${leads} lead(s) landed`;
                            timePrefix = isBreak ? 'On break · ' : 'Not ready on Ozontell · ';
                          }
                      } else if (isBreak) {
                        blockClass = sellerStyles.blockBreak;
                        hoverText = 'Not eligible';
                        timePrefix = 'On break · ';
                      } else if (isReady) {
                        blockClass = sellerStyles.blockEligibleNoLead;
                        hoverText = 'Eligible, no lead';
                      } else {
                        blockClass = sellerStyles.blockNotEligible;
                        hoverText = 'Not eligible';
                        timePrefix = 'Not ready on Ozontell · ';
                      }

                      let isLateAllocation = false;
                      
                      return { ...seg, blockClass, hoverText, timePrefix, leads, eligible, isBreak, isReady, isLateAllocation };
                    });

                    const mergedSegments: typeof mappedSegments = [];
                    let current = mappedSegments[0];
                    for (let i = 1; i < mappedSegments.length; i++) {
                      const next = mappedSegments[i];
                      if (
                        current.blockClass === next.blockClass && 
                        current.hoverText === next.hoverText && 
                        current.timePrefix === next.timePrefix &&
                        current.leads === 0 && next.leads === 0
                      ) {
                        current.end = next.end;
                        current.widthPercent += next.widthPercent;
                      } else {
                        mergedSegments.push(current);
                        current = next;
                      }
                    }
                    if (current) mergedSegments.push(current);

                    return mergedSegments.map((seg, idx) => {
                      const midPoint = seg.start + (seg.end - seg.start) / 2;
                      const percent = ((midPoint - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100;
                      const ttVars = percent < 15
                        ? { '--tt-left': '0', '--tt-right': 'auto', '--tt-tx': '0' }
                        : percent > 85
                          ? { '--tt-left': 'auto', '--tt-right': '0', '--tt-tx': '0' }
                          : { '--tt-left': '50%', '--tt-right': 'auto', '--tt-tx': '-50%' };
                      return (
                        <div key={idx} className={sellerStyles.tooltipContainer} style={{ flex: seg.widthPercent }}>
                          <button
                            className={[sellerStyles.timelineBlock, seg.blockClass].join(' ')}
                            style={{ width: '100%' }}
                            onClick={() => setActiveBlockS1({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: seg.isLateAllocation, isReady: seg.isReady })}
                          >
                            {seg.widthPercent >= 3 ? (
                              seg.leads > 0 ? (
                                <>
                                  <span className={sellerStyles.blockLeadCount}>{seg.leads}</span>
                                  {seg.isBreak && !seg.eligible && <span className={sellerStyles.blockBreakText}>BREAK</span>}
                                </>
                              ) : (
                                seg.isBreak && seg.widthPercent >= 6 ? <span className={sellerStyles.blockBreakText} style={{marginTop: 0}}>BREAK</span> : null
                              )
                            ) : null}
                          </button>
                          <div className={sellerStyles.tooltip} style={ttVars as any}>
                            <div className={sellerStyles.tooltipTime}>{seg.timePrefix}{formatMinTime(seg.start)} – {formatMinTime(seg.end)}</div>
                            <div className={sellerStyles.tooltipText}>{seg.hoverText}</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className={sellerStyles.timelineLabelsRow} style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
                  {HOUR_SLOTS.map((hour, idx) => (
                    <div 
                      key={hour} 
                      className={sellerStyles.timelineLabel} 
                      style={{ 
                        position: 'absolute', 
                        left: `${(idx / (HOUR_SLOTS.length - 1)) * 100}%`, 
                        transform: 'translateX(-50%)',
                        paddingLeft: 0,
                        textAlign: 'center'
                      }}
                    >
                      {hour === '9AM' || hour === '12PM' || hour === '1PM' || hour === '5PM' || hour === '8PM' || hour === '9PM' ? hour : hour.replace('AM', '').replace('PM', '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
