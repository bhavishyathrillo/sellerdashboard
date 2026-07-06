'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './SellerViewPage.module.css'
import Loader from '@/components/ui/Loader'

interface MonthlyTotals {
  total_leads_allotted: number
  auto_allotted: number
  manual_allotted: number
  rtg_leads: number
  non_rtg_leads: number
  pax_1: number
  pax_2: number
  pax_3: number
  pax_4: number
  pax_4_plus: number
  days_with_data: number
  revised_lta?: number
}

interface DotChartItem {
  label: string
  value: number
  color: string
}

interface SellerViewData {
  date: string
  month: string
  isRange: boolean
  allotment: {
    total_leads_allotted: number
    first_lead_allotted_at_ist: string | null
    median_creation_to_allotment_mins: number | null
    auto_allotted: number
    manual_allotted: number
    rtg_leads: number
    non_rtg_leads: number
    pax_1: number
    pax_2: number
    pax_3: number
    pax_4: number
    pax_4_plus: number
}
  monthly: MonthlyTotals
  goal_vs_shb_trend?: any[]
  goal_vs_shb?: any
  attendance: {
    first_login: string | null
    last_logout: string | null
    break_timestamps: string | null
  }
  cti: {
    logged_in_at: string | null
    ready_timestamps: string | null
  }
  hourly: { hour_bucket: string; leads_allotted_in_bucket: number }[]
  dot_distribution?: { total_leads_allotted: number; dot_month: string } | null
  dot_chart?: DotChartItem[]
  daily_lta?: any
  lta_trend?: any[]
  mhe_trend?: any[]
  kalpit?: any[]
}

const HOUR_SLOTS = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM']

// Extracts literal hour and minute numbers from a DB string, ignoring timezones.
// Handles both "2026-06-30 10:39:42+00" and "10:39"
function extractTimeParts(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null
  const s = raw.trim()
  // Match "HH:MM" anywhere (e.g., after a space or 'T', or at the start)
  const match = s.match(/(?:^|T|\s)(\d{1,2}):(\d{2})/)
  if (match) {
    return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) }
  }
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

function minutesBetween(a: string | null, b: string | null, allowNegative: boolean = false): number | null {
  const pa = extractTimeParts(a)
  const pb = extractTimeParts(b)
  if (!pa || !pb) return null
  let minsA = pa.h * 60 + pa.m
  let minsB = pb.h * 60 + pb.m
  
  if (allowNegative) {
    let diff = minsB - minsA
    if (diff < -12 * 60) diff += 24 * 60
    else if (diff > 12 * 60) diff -= 24 * 60
    return diff
  } else {
    // basic wrap-around assuming next day if b is smaller
    if (minsB < minsA) minsB += 24 * 60
    return minsB - minsA
  }
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

function isHourInReadyWindow(hourLabel: string, windows: { startH: number; startM: number; endH: number; endM: number }[]): boolean {
  if (!windows.length) return false
  const m = hourLabel.match(/^(\d+)(AM|PM)$/i); if (!m) return false
  let h = parseInt(m[1], 10); if (m[2].toUpperCase() === 'PM' && h !== 12) h += 12; if (m[2].toUpperCase() === 'AM' && h === 12) h = 0
  return windows.some(w => {
    // Round end hour up if there are any minutes past the hour
    const eH = w.endH + (w.endM > 0 ? 1 : 0)
    return h >= w.startH && h < eH
  })
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

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthStr(date: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [y, m] = date.split('-')
  return `${months[parseInt(m) - 1]} ${y}`
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export default function SellerViewPage({ session, headerCenterContent }: { session: UserSession, headerCenterContent?: React.ReactNode }) {
  const [data, setData] = useState<SellerViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [activeTile, setActiveTile] = useState<string | null>(null)
  const [activeBlock, setActiveBlock] = useState<{ hour: string; leads: number; eligible: boolean; isBreak: boolean; isLateAllocation: boolean; isReady: boolean; isOrbitOnly: boolean } | null>(null)
  const [closing, setClosing] = useState(false)
  const isToday = selectedDate === todayStr()
  const trendChartRef = useRef<HTMLCanvasElement>(null)
  const trendChartInstance = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        setLoading(true); setError('')
        try {
          const res = await fetch(`/api/seller/seller-view?email=${encodeURIComponent(session.email)}&date=${selectedDate}`)
          const json = await res.json()
          if (cancelled) return
          if (!res.ok) { setError(json.error || 'Failed'); return }
          setData(json)
        } catch { if (!cancelled) setError('Failed to load data') }
        finally { if (!cancelled) setLoading(false) }
      })()
    return () => { cancelled = true }
  }, [session.email, selectedDate])

  const closeModal = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setActiveTile(null); setActiveBlock(null); setClosing(false) }, 180)
  }, [])

  useEffect(() => {
    if (!activeTile && !activeBlock) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTile, activeBlock, closeModal])

  useEffect(() => {
    const trendData = data?.lta_trend || []
    if (!trendData.length) return
    
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active) return
      const Chart = mod.default || mod
      if (trendChartRef.current) {
        if (trendChartInstance.current) trendChartInstance.current.destroy()
        const ctx = trendChartRef.current.getContext('2d')
        if (!ctx) return
        
        const labels = trendData.map((d: any) => new Date(d.log_date).getDate().toString())
        const maxPlanned = Math.max(...trendData.map((d: any) => d.wd > 0 ? Math.floor(d.lead_goal / d.wd) : 0), 0)
        const ySuggestedMax = maxPlanned > 5 ? 10 : 5
        
        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              { label: 'Planned', data: trendData.map((d: any) => d.wd > 0 ? Math.floor(d.lead_goal / d.wd) : 0), borderColor: '#3B82F6', backgroundColor: '#3B82F6', tension: 0.3, pointRadius: 2 },
              { label: 'Dynamic', data: trendData.map((d: any) => d.real_dynamic_lta || 0), borderColor: '#EAB308', backgroundColor: '#EAB308', tension: 0.3, pointRadius: 2 },
              { label: 'Hygiene', data: trendData.map((d: any) => d.hygiene_lta || 0), borderColor: '#F97316', backgroundColor: '#F97316', tension: 0.3, pointRadius: 2 },
              { label: 'Goal Complete', data: trendData.map((d: any) => d.goal_completion_logic_lta || 0), borderColor: '#8B5CF6', backgroundColor: '#8B5CF6', tension: 0.3, pointRadius: 2 },
              { label: 'Final', data: trendData.map((d: any) => d.final_lta || 0), borderColor: '#22C55E', backgroundColor: 'rgba(34, 197, 94, 0.15)', tension: 0.3, pointRadius: 4, borderWidth: 3, fill: true, pointBackgroundColor: '#22C55E' }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { color: '#8A8278', font: { size: 10 }, usePointStyle: true, boxWidth: 6, padding: 20 } },
              tooltip: {
                callbacks: {
                  afterBody: (context: any) => {
                    if (!context || !context.length) return []
                    const dataIndex = context[0].dataIndex
                    const d = trendData[dataIndex]
                    if (!d) return []
                    
                    const p = d.wd > 0 ? Math.round(d.lead_goal / d.wd) : 0
                    const dyn = d.real_dynamic_lta || 0
                    const hyg = d.hygiene_lta || 0
                    const gl = d.goal_completion_logic_lta || 0
                    const fin = d.final_lta || 0

                    const getDiffText = (a: number, b: number, stage: string) => {
                      const diff = a - b
                      if (diff < 0) return `Gained in ${stage}: ${Math.abs(diff)} leads`
                      return `Lost to ${stage}: ${diff} leads`
                    }

                    return [
                      '------------------------------',
                      getDiffText(p, dyn, 'dynamic'),
                      getDiffText(dyn, hyg, 'hygiene'),
                      getDiffText(hyg, gl, 'goal completion'),
                      getDiffText(gl, fin, 'final adjustment')
                    ]
                  }
                }
              }
            },
            interaction: { mode: 'index', intersect: false, axis: 'x' },
            scales: {
              x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true, suggestedMax: ySuggestedMax }
            }
          }
        })
      }
    })
    return () => {
      active = false
      if (trendChartInstance.current) trendChartInstance.current.destroy()
    }
  }, [data?.lta_trend])

  // Chart: MHE % Trend
  const mheChartRef = useRef<HTMLCanvasElement | null>(null)
  const goalShbChartRef = useRef<HTMLCanvasElement | null>(null)
  const goalShbChartInstance = useRef<any>(null)
  useEffect(() => {
    if (activeTile !== 'mhe' || !mheChartRef.current || !data?.mhe_trend) return

    let chartInstance: any = null
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default
      const ctx = mheChartRef.current?.getContext('2d')
      if (ctx) {
        const labels = data.mhe_trend!.map((d: any) => {
          const dt = new Date(d.date)
          return `${dt.getDate()}`
        })
        const pcts = data.mhe_trend!.map((d: any) => d.mhePct)
        const maxMheVal = Math.max(...pcts.map(Number), 0);
        const yMaxMhe = Math.max(20, Math.ceil((maxMheVal + 5) / 10) * 10);

        chartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'MHE %',
              data: pcts,
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointBackgroundColor: '#3B82F6',
              pointRadius: 4,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { 
                max: yMaxMhe,
                ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v) => `${v}%` }, 
                grid: { color: 'rgba(255,255,255,0.06)' }, 
                beginAtZero: true 
              }
            }
          }
        })
      }
    })
    return () => {
      if (chartInstance) chartInstance.destroy()
    }
  }, [activeTile, data?.mhe_trend])

  useEffect(() => {
    if (activeTile !== 'goal_shb' || !goalShbChartRef.current || !data?.goal_vs_shb_trend || !data?.date) return

    let chartInstance: any = null
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default
      const ctx = goalShbChartRef.current?.getContext('2d')
      if (ctx) {
        const endDate = new Date(data.date).getDate();
        const y = new Date(data.date).getFullYear();
        const m = new Date(data.date).getMonth();
        
        const paddedData = [];
        for (let i = 1; i <= endDate; i++) {
          const dateStr = `${y}-${String(m+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const existing = data.goal_vs_shb_trend!.find((d:any) => d.date === dateStr);
          paddedData.push(existing || { date: dateStr, goal_completion: 0, shb_percent: 0 });
        }

        const labels = paddedData.map((d: any) => new Date(d.date).getDate().toString())
        const goalPcts = paddedData.map((d: any) => (d.goal_completion * 100).toFixed(0))
        const shbPcts = paddedData.map((d: any) => (d.shb_percent * 100).toFixed(0))

        const maxDataVal = Math.max(...goalPcts.map(Number), ...shbPcts.map(Number), 0);
        const yMax = Math.max(20, Math.ceil((maxDataVal + 5) / 10) * 10);

        chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                type: 'line',
                label: 'SHB %',
                data: shbPcts,
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
                data: goalPcts,
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
            plugins: { legend: { display: true, labels: { color: '#8A8278' } } },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } },
              y: { 
                max: yMax,
                ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v) => `${v}%` }, 
                grid: { color: 'rgba(255,255,255,0.06)' }, 
                beginAtZero: true 
              }
            }
          }
        })
      }
    })
    return () => {
      if (chartInstance) chartInstance.destroy()
    }
  }, [activeTile, data?.goal_vs_shb_trend, data?.date])

  const breaks = useMemo(() => parseBreaks(data?.attendance?.break_timestamps || null), [data])
  const readyWindows = useMemo(() => parseReadyWindows(data?.cti?.ready_timestamps || null), [data])
  const hourlyMap = useMemo(() => {
    const m: Record<string, number> = {}
    data?.hourly?.forEach(h => { 
      let bucket = h.hour_bucket?.toString()?.toUpperCase() || ''
      if (bucket.includes(':')) {
        const parts = extractTimeParts(bucket)
        if (parts) {
          const ampm = parts.h >= 12 ? 'PM' : 'AM'
          let h12 = parts.h % 12
          if (h12 === 0) h12 = 12
          bucket = `${h12}${ampm}`
        }
      } else {
        // Handle "9", "9-10", "14-15"
        const match = bucket.match(/^(\d+)/)
        if (match) {
          const hr = parseInt(match[1], 10)
          const ampm = hr >= 12 ? 'PM' : 'AM'
          let h12 = hr % 12
          if (h12 === 0) h12 = 12
          bucket = `${h12}${ampm}`
        } else {
          bucket = bucket.replace(/\s+/g, '')
        }
      }
      const numLeads = Number(h.leads_allotted_in_bucket) || 0
      m[bucket] = (m[bucket] || 0) + numLeads 
    })
    return m
  }, [data])

  const totalLeads = data?.allotment?.total_leads_allotted || 0
  const kekaTime = data?.attendance?.first_login || null
  const firstLead = data?.allotment?.first_lead_allotted_at_ist || null
  const lastLogout = data?.attendance?.last_logout || null
  const orbitTime = (data as any)?.orbit?.first_login || null

  const ozontellReady = data?.cti?.ready_timestamps
    ? (() => { const f = data.cti.ready_timestamps!.split(/[,;]/)[0]?.trim(); if (!f) return null; const s = f.split(/[-→]/)[0]?.trim(); return s || null })()
    : null

  const hasDailyPresence = !!kekaTime || !!orbitTime || !!ozontellReady

  const deltaOrbitFromKeka = minutesBetween(kekaTime, orbitTime, true)
  const deltaOzontellFromKeka = minutesBetween(kekaTime, ozontellReady, true)
  const deltaOzontellToFirst = minutesBetween(ozontellReady, firstLead, true)
  const deltaKekaToFirst = minutesBetween(kekaTime, firstLead, true)
  const totalLoginToLogout = minutesBetween(kekaTime, lastLogout)
  const breakAmber = breaks.windows.length > 3 || breaks.totalMinutes > 45

  const monthly = data?.monthly
  const monthTotalLeads = monthly?.total_leads_allotted || 0
  const monthTotalPax = (monthly?.pax_1 || 0) + (monthly?.pax_2 || 0) + (monthly?.pax_3 || 0) + (monthly?.pax_4 || 0) + (monthly?.pax_4_plus || 0)
  const monthStr = getMonthStr(selectedDate)

  const dotChartData = data?.dot_chart || []
  const maxDotValue = Math.max(...dotChartData.map(d => d.value), 1)

  const dailyLta = data?.daily_lta || {}
  const ltaLeadGoal = dailyLta.lead_goal || 0
  const ltaWd = dailyLta.wd || 0
  
  const plannedLtaVal = ltaWd > 0 ? Math.floor(ltaLeadGoal / ltaWd) : 0
  const dynamicLtaVal = dailyLta.real_dynamic_lta || 0
  const hygieneLtaVal = dailyLta.hygiene_lta || 0
  const goalCompleteLtaVal = dailyLta.goal_completion_logic_lta || 0
  const finalLtaVal = dailyLta.final_lta || 0

  const dropPlannedToDynamic = plannedLtaVal - dynamicLtaVal
  const dropDynamicToHygiene = dynamicLtaVal - hygieneLtaVal
  const dropHygieneToGoal = hygieneLtaVal - goalCompleteLtaVal
  const dropGoalToFinal = goalCompleteLtaVal - finalLtaVal

  // MHE calculations
  const mheTrend = data?.mhe_trend || []
  let todayMhe = { pct: 0 }
  let yesterdayMhe = { pct: 0 }
  if (mheTrend.length > 0) {
    const todayData = mheTrend.find((r: any) => r.date === selectedDate)
    if (todayData) todayMhe = { pct: todayData.mhePct }
    
    const todayObj = new Date(selectedDate)
    todayObj.setDate(todayObj.getDate() - 1)
    const yesterdayStr = todayObj.toISOString().split('T')[0]
    const yesterdayData = mheTrend.find((r: any) => r.date === yesterdayStr)
    if (yesterdayData) yesterdayMhe = { pct: yesterdayData.mhePct }
  }

  const allotmentRows = [
    { label: 'Auto Allotted', value: monthly?.auto_allotted || 0, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: monthly?.manual_allotted || 0, color: '#9CA3AF' },
    { label: 'RTG Leads', value: monthly?.rtg_leads || 0, color: '#F4631E' },
    { label: 'Non-RTG', value: monthly?.non_rtg_leads || 0, color: '#4B5563' },
  ]

  const paxRows = [
    { label: '1-pax', value: monthly?.pax_1 || 0, color: '#F3F4F6' },
    { label: '2-pax', value: monthly?.pax_2 || 0, color: '#E5E7EB' },
    { label: '3-pax', value: monthly?.pax_3 || 0, color: '#D1D5DB' },
    { label: '4-pax', value: monthly?.pax_4 || 0, color: '#9CA3AF' },
    { label: '4+ pax', value: monthly?.pax_4_plus || 0, color: '#6B7280' },
  ]

  if (loading) return <Loader text="Loading..." />
  if (error) return <div className={styles.errorWrap}><span className={styles.errorIcon}>⚠</span><p>{error}</p></div>

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Lead <span className={styles.pageTitleAccent}>Allocation</span></h1>
          <p className={styles.pageSubtitle}>{session.name} · {isToday ? 'Today' : selectedDate}</p>
        </div>
        {headerCenterContent && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            {headerCenterContent}
          </div>
        )}
        <div className={styles.headerRight}>
          <button className={`${styles.todayBtn} ${isToday ? styles.todayBtnActive : ''}`} onClick={() => setSelectedDate(todayStr())}>Today</button>
          <input type="date" className={styles.dateInput} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={todayStr()} />
        </div>
      </div>

      {/* Login Strip */}
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Login Timestamps</span><span className={styles.sectionHint}>tap for details</span></div>
      <div className={styles.loginStrip}>
        {[
          { key: 'keka', cls: styles.loginTileKeka, label: 'Keka Login', value: formatTime(kekaTime), sub: ' ' },
          { key: 'orbit', cls: styles.loginTileOrbit, label: 'Orbit Login', value: formatTime(orbitTime), sub: deltaOrbitFromKeka !== null ? (deltaOrbitFromKeka > 0 ? `+${deltaOrbitFromKeka} min from Keka` : `${deltaOrbitFromKeka} min from Keka`) : '—' },
          { key: 'ozontell', cls: styles.loginTileOzontell, label: 'Ozontell Ready', value: formatTime(ozontellReady), sub: deltaOzontellFromKeka !== null ? (deltaOzontellFromKeka > 0 ? `+${deltaOzontellFromKeka} min from Keka` : `${deltaOzontellFromKeka} min from Keka`) : '—' },
          { key: 'first', cls: styles.loginTileFirst, label: 'First Lead', value: formatTime(firstLead), sub: deltaOzontellToFirst !== null ? (deltaOzontellToFirst > 0 ? `+${deltaOzontellToFirst} min from Ozontell` : `${deltaOzontellToFirst} min from Ozontell`) : '—' },
        ].map((t: { key: string; cls: string; label: string; value: string; sub: string; muted?: boolean }) => (
          <button key={t.key} className={`${styles.loginTile} ${t.cls}`} onClick={() => setActiveTile(t.key)}>
            <div className={styles.loginTileLabel}>{t.label}</div>
            <div className={styles.loginTileValue} style={t.muted ? { color: '#6B7280' } : undefined}>{t.value}</div>
            <div className={styles.loginTileDelta}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Key Metrics</span></div>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiTile}>
          <div className={styles.kpiLabel}>Total received</div>
          <div className={`${styles.kpiValue} ${totalLeads > 0 ? styles.kpiValueRed : styles.kpiValueMuted}`}>{totalLeads}</div>
          <div className={styles.kpiSub}>Auto: {data?.allotment?.auto_allotted || 0} · Manual: {data?.allotment?.manual_allotted || 0}</div>
        </div>
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => setActiveTile('goal_shb')}>
          <div className={styles.kpiLabel}>Goal % vs SHB <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Goal</div>
              <div className={`${styles.kpiValue} ${data?.goal_vs_shb ? '' : styles.kpiValueMuted}`}>
                {data?.goal_vs_shb?.goal_completion !== undefined ? `${(data.goal_vs_shb.goal_completion * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
            <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>SHB</div>
              <div className={`${styles.kpiValue} ${data?.goal_vs_shb ? '' : styles.kpiValueMuted}`}>
                {data?.goal_vs_shb?.shb_percent !== undefined ? `${(data.goal_vs_shb.shb_percent * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => setActiveTile('mhe')}>
          <div className={styles.kpiLabel}>MHE % <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Yesterday</div>
              <div className={`${styles.kpiValue} ${styles.kpiValueMuted}`}>{yesterdayMhe.pct}%</div>
            </div>
            <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Today</div>
              <div className={`${styles.kpiValue} ${styles.kpiValueMuted}`}>{todayMhe.pct}%</div>
            </div>
          </div>
        </div>
        <div className={styles.kpiTile}>
          <div className={styles.kpiLabel}>Breaks today</div>
          <div className={`${styles.kpiValue} ${breakAmber ? styles.kpiValueRed : styles.kpiValueAmber}`}>{breaks.windows.length}</div>
          <div className={styles.kpiSub}>{breaks.totalMinutes > 0 ? `Total: ${breaks.totalMinutes} min` : 'No breaks'}</div>
        </div>
        <div className={`${styles.kpiTile} ${styles.kpiOrange}`}>
          <div className={styles.kpiLabel}>Today's LTA</div>
          <div className={`${styles.kpiValue} ${styles.kpiValueOrange}`}>{finalLtaVal} <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>leads</span></div>
        </div>
      </div>

      {/* Lead Timeline */}
      <div className={styles.timelineSection}>
        <div className={styles.timelineHeader}>
          <div className={styles.timelineTitle}>Today's lead timeline</div>
          <div className={styles.timelineSub}>9 AM – 9 PM · hover for details</div>
        </div>
        {Object.entries(hourlyMap).some(([k]) => !HOUR_SLOTS.includes(k)) && (
          <div style={{color: '#F4631E', fontSize: '12px', padding: '10px 0'}}>
            Note: Some leads were allotted outside the 9 AM - 9 PM window: 
            {Object.entries(hourlyMap).filter(([k]) => !HOUR_SLOTS.includes(k)).map(([k, v]) => ` ${k} (${v} leads)`).join(',')}
          </div>
        )}
        <div className={styles.timelineContainer}>
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
              
              // alternate height for appetite vs login to reduce overlap
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
            const firstLoginMin = kekaTime ? (extractTimeParts(kekaTime)?.h || 0) * 60 + (extractTimeParts(kekaTime)?.m || 0) : null;
            const lastLogoutMin = lastLogout ? (extractTimeParts(lastLogout)?.h || 0) * 60 + (extractTimeParts(lastLogout)?.m || 0) : null;

            let runningLeads = 0;
            let time50: number | null = null;
            let time100: number | null = null;
            const target50 = finalLtaVal / 2;
            const target100 = finalLtaVal;

            for (const hour of HOUR_SLOTS) {
              if (time50 && time100) break;
              runningLeads += (hourlyMap[hour] || 0);

              let isAm = hour.includes('AM');
              let hStr = hour.replace(/[A-Z]/g, '');
              let h = parseInt(hStr, 10);
              if (isAm && h === 12) h = 0;
              if (!isAm && h !== 12) h += 12;
              const minOfDay = h * 60 + 30; // center of the bucket

              if (finalLtaVal > 0) {
                if (runningLeads >= target50 && time50 === null) time50 = minOfDay;
                if (runningLeads >= target100 && time100 === null) {
                  time100 = minOfDay;
                  if (time100 === time50) time100 += 20;
                }
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
          <div className={styles.timelineBlocksRow}>
            {(() => {
              const timelineStartMin = 9 * 60
              const timelineEndMin = 21 * 60
              const boundaries = new Set<number>()
              for (let m = timelineStartMin; m <= timelineEndMin; m += 60) boundaries.add(m)
              
              breaks.windows.forEach(w => {
                const s = w.startH * 60 + w.startM
                const e = w.endH * 60 + w.endM
                if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s)
                if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e)
              })
              readyWindows.forEach(w => {
                const s = w.startH * 60 + w.startM
                const e = w.endH * 60 + w.endM
                if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s)
                if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e)
              })

              const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b)
              const segments: { start: number, end: number, hourBucket: string, widthPercent: number }[] = []
              
              for (let i = 0; i < sortedBoundaries.length - 1; i++) {
                const start = sortedBoundaries[i]
                const end = sortedBoundaries[i + 1]
                if (start === end) continue
                
                const hour24 = Math.floor(start / 60)
                let ampm = hour24 >= 12 ? 'PM' : 'AM'
                let h12 = hour24 % 12
                if (h12 === 0) h12 = 12
                
                segments.push({
                  start,
                  end,
                  hourBucket: `${h12}${ampm}`,
                  widthPercent: ((end - start) / (timelineEndMin - timelineStartMin)) * 100
                })
              }

              const availableLeads = { ...hourlyMap }
              
              const formatTime = (mins: number) => {
                const h = Math.floor(mins / 60)
                const m = mins % 60
                const ampm = h >= 12 ? 'PM' : 'AM'
                let h12 = h % 12
                if (h12 === 0) h12 = 12
                return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
              }

              // 1. Map raw segments to their exact state
              const mappedSegments = segments.map((seg, idx) => {
                const midPoint = seg.start + (seg.end - seg.start) / 2
                
                const overlappingBreak = breaks.windows.find(w => {
                  const s = w.startH * 60 + w.startM
                  const e = w.endH * 60 + w.endM
                  return midPoint >= s && midPoint < e
                })
                const isBreak = !!overlappingBreak
                
                const isReady = readyWindows.some(w => {
                  const s = w.startH * 60 + w.startM
                  const e = w.endH * 60 + w.endM
                  return midPoint >= s && midPoint < e
                })

                const isOrbitOnly = !!orbitTime && isBreak && isReady
                let eligible = (!isBreak && isReady) || isOrbitOnly
                let blockClass = styles.blockNotEligible
                let leads = 0

                if (eligible && availableLeads[seg.hourBucket] > 0) {
                   leads = availableLeads[seg.hourBucket]
                   availableLeads[seg.hourBucket] = 0
                }
                
                const isLastSegmentOfHour = (idx === segments.length - 1) || (segments[idx + 1].hourBucket !== seg.hourBucket)
                if (isLastSegmentOfHour && availableLeads[seg.hourBucket] > 0) {
                   leads = availableLeads[seg.hourBucket]
                   availableLeads[seg.hourBucket] = 0
                }

                let hoverText = ''
                let timePrefix = ''
                if (leads > 0) {
                    if (isOrbitOnly) {
                      blockClass = styles.blockOrbit
                      timePrefix = 'Orbit logged out · '
                      hoverText = `${leads} lead(s) landed via Orbit`
                    } else if (eligible) {
                      blockClass = styles.blockLeadReceived
                      hoverText = `${leads} lead(s) landed`
                    } else {
                      blockClass = styles.blockLeadReceived
                      hoverText = `${leads} lead(s) landed (Exception)`
                      timePrefix = isBreak ? 'On break · ' : 'Not ready on Ozontell · '
                    }
                  } else {
                    if (isOrbitOnly) {
                      blockClass = styles.blockOrbit
                      timePrefix = 'Orbit logged out · '
                      hoverText = 'Eligible via Orbit, no lead'
                    } else if (eligible) {
                      blockClass = styles.blockEligible
                      hoverText = 'Eligible for lead'
                    } else if (isBreak) {
                      blockClass = styles.blockBreak
                      hoverText = 'Not eligible'
                      timePrefix = 'On break · '
                    } else {
                      blockClass = styles.blockNotEligible
                      hoverText = 'Not eligible'
                      timePrefix = 'Not ready on Ozontell · '
                    }
                  }


                return { ...seg, blockClass, hoverText, timePrefix, leads, eligible, isBreak, isReady, isOrbitOnly }
              })

              // 2. Merge identical adjacent segments to remove barcode gaps
              const mergedSegments = []
              let current = mappedSegments[0]
              for (let i = 1; i < mappedSegments.length; i++) {
                const next = mappedSegments[i]
                if (
                  current.blockClass === next.blockClass && 
                  current.hoverText === next.hoverText && 
                  current.timePrefix === next.timePrefix &&
                  current.leads === 0 && next.leads === 0
                ) {
                  current.end = next.end
                  current.widthPercent += next.widthPercent
                } else {
                  mergedSegments.push(current)
                  current = next
                }
              }
              if (current) mergedSegments.push(current)

              // 3. Render
              return mergedSegments.map((seg, idx) => {
                const midPoint = seg.start + (seg.end - seg.start) / 2
                const percent = ((midPoint - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100
                const ttVars = percent < 15 
                  ? { '--tt-left': '0', '--tt-right': 'auto', '--tt-tx': '0' }
                  : percent > 85 
                    ? { '--tt-left': 'auto', '--tt-right': '0', '--tt-tx': '0' }
                    : { '--tt-left': '50%', '--tt-right': 'auto', '--tt-tx': '-50%' }

                return (
                  <div key={idx} className={styles.tooltipContainer} style={{ flex: seg.widthPercent }}>
                    <button 
                      className={[styles.timelineBlock, seg.blockClass].join(' ')} 
                      style={{ width: '100%' }}
                      onClick={() => setActiveBlock({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: false, isReady: seg.isReady, isOrbitOnly: seg.isOrbitOnly })}
                    >
                      {seg.widthPercent >= 3 ? (
                        seg.leads > 0 ? (
                          <>
                            <span className={styles.blockLeadCount}>{seg.leads}</span>
                            {seg.isOrbitOnly && <span className={styles.blockOrbitText}>ORBIT</span>}
                            {seg.isBreak && !seg.eligible && <span className={styles.blockBreakText}>BREAK</span>}
                          </>
                        ) : (
                          seg.isOrbitOnly ? <span className={styles.blockOrbitText} style={{marginTop: 0}}>ORBIT</span> 
                          : seg.isBreak && seg.widthPercent >= 6 ? <span className={styles.blockBreakText} style={{marginTop: 0}}>BREAK</span> : null
                        )
                      ) : null}
                    </button>
                    <div className={styles.tooltip} style={ttVars as any}>
                      <div className={styles.tooltipTime}>{seg.timePrefix}{formatTime(seg.start)} – {formatTime(seg.end)}</div>
                      <div className={styles.tooltipText}>{seg.hoverText}</div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          <div className={styles.timelineLabelsRow} style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
            {HOUR_SLOTS.map((hour, idx) => (
              <div 
                key={hour} 
                className={styles.timelineLabel} 
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

      {/* LTA & Goal */}
      <div className={styles.placeholderGrid}>
        <div style={{ padding: '20px 0', width: '100%' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Daily LTA Funnel</div>
          <div className={styles.ltaFunnel3DContainer}>
            <svg className={styles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
              <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGrad)" opacity="0.08" />
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#22C55E" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.ltaFunnelStack}>
              {(() => {
                const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
                const stages = [
                  { id: 'planned', label: 'PLANNED LTA', value: plannedLtaVal, color: '#3B82F6', dropText: getFunnelDropText(dropPlannedToDynamic, 'Dynamic'), width: '100%' },
                  { id: 'dynamic', label: 'DYNAMIC LTA', value: dynamicLtaVal, color: '#EAB308', dropText: getFunnelDropText(dropDynamicToHygiene, 'Hygiene'), width: '85%' },
                  { id: 'hygiene', label: 'HYGIENE LTA', value: hygieneLtaVal, color: '#F97316', dropText: getFunnelDropText(dropHygieneToGoal, 'Goal Complete'), width: '70%' },
                  { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: goalCompleteLtaVal, color: '#8B5CF6', dropText: getFunnelDropText(dropGoalToFinal, 'Final'), width: '60%' },
                  { id: 'final', label: 'FINAL LTA', value: finalLtaVal, color: '#22C55E', dropText: null, width: '50%' },
                ]
                return stages.map((step, idx) => (
                  <div key={step.id} className={styles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                    <div className={styles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                      {((step.id === 'dynamic' && data?.kalpit?.find((k: any) => k.name === 'dynamic')?.value === 0) ||
                         (step.id === 'hygiene' && data?.kalpit?.find((k: any) => k.name === 'hygiene')?.value === 0) ||
                         (step.id === 'goalComplete' && data?.kalpit?.find((k: any) => k.name === 'goal')?.value === 0)) && (
                        <div className={styles.strikethroughLine} />
                      )}
                      <div className={styles.ltaFunnelCardHeader}>
                        <span className={styles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                        {step.id === 'planned' && <span className={styles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
                      </div>
                    <div className={styles.ltaFunnelCardBody}>
                      <span className={styles.ltaFunnelCardValue}>{step.value}</span>
                      <span className={styles.ltaFunnelCardUnit}>leads</span>
                    </div>
                  </div>
                  {step.dropText && (
                    <div className={styles.ltaFunnelDropText}>
                      {step.dropText}
                    </div>
                  )}
                </div>
              ))})()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '20px 0', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#F4631E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly LTA</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            
            {/* LEAD GOAL */}
            <div style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #F4631E, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #F4631E' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E', boxShadow: '0 0 10px #F4631E' }} />
                <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Lead Goal</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{dailyLta?.lead_goal || 0}</span>
              </div>
            </div>

            {/* LEADS SHB AS PER PLANNED */}
            <div style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #378ADD, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #378ADD' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#378ADD', boxShadow: '0 0 10px #378ADD' }} />
                <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Leads SHB as per planned</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{dailyLta?.leads_shb || 0}</span>
              </div>
            </div>

            {/* REVISED LTA */}
            <div style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #C9A84C' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 10px #C9A84C' }} />
                <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Revised LTA</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: 'auto' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{monthly?.revised_lta || 0}</span>
              </div>
            </div>

            {/* LEADS (PLANNED REGION / ACTUAL) */}
            <div style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #22C55E, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #22C55E' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
                <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Leads</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{dailyLta?.leads_actual_planned_region || 0}</span>
                  <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planned Region</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{dailyLta?.leads_actual || 0}</span>
                  <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className={`${styles.placeholderCard} ${styles.placeholderCardFull}`}>
          <div className={styles.placeholderTitle}>LTA Day-on-Day Trend</div>
          <div className={styles.chartPlaceholder} style={{ background: 'transparent', border: 'none', height: '200px', maxWidth: '900px', margin: '0 auto' }}>
            <canvas ref={trendChartRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>

      {/* ═══════════════ 3 CARDS: DOT | ALLOTMENT | PAX ═══════════════ */}
      <div className={styles.sectionHeader} style={{ marginTop: '28px' }}>
        <span className={styles.sectionTitle}>Monthly Breakdown · {monthStr}</span>
        <span className={styles.sectionHint}>{monthly?.days_with_data || 0} days of data</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div style={{
          background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dotChartData.map((bar, i) => {
              const totalDOT = dotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = pct(bar.value, totalDOT)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                  <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${(bar.value / maxDotValue) * 100}%`,
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
        <div style={{
          background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {pct(item.value, monthTotalLeads)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div style={{
          background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paxRows.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: p.color,
                  background: `${p.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {pct(p.value, monthTotalPax)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeTile && (
        <div className={`${styles.modalOverlay} ${closing ? styles.modalOverlayOut : ''}`} onClick={closeModal}>
          <div className={`${styles.modalCard} ${closing ? styles.modalCardOut : ''} ${(activeTile === 'mhe' || activeTile === 'goal_shb') ? styles.modalCardWide : ''}`} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>✕</button>

            {activeTile === 'goal_shb' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#3B82F6' }} /><span className={styles.modalTitle}>Goal % vs SHB Trend</span></div>
                <p className={styles.modalInsight}>Goal vs Sales Handled Business across the current month.</p>
                <div style={{ height: '220px', width: '100%', marginTop: '20px' }}>
                  <canvas ref={goalShbChartRef} style={{ width: '100%', height: '100%' }} />
                </div>
              </>
            )}

            {activeTile === 'mhe' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#3B82F6' }} /><span className={styles.modalTitle}>MHE % Trend</span></div>
                <p className={styles.modalInsight}>Mishandled Leads over the current month.</p>
                <div style={{ height: '220px', width: '100%', marginTop: '20px' }}>
                  <canvas ref={mheChartRef} style={{ width: '100%', height: '100%' }} />
                </div>
              </>
            )}
            {activeTile === 'keka' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#3B82F6' }} /><span className={styles.modalTitle}>Keka Login</span></div>
                <p className={styles.modalInsight}>Logged in at {formatTime(kekaTime)}.</p>
                <div className={styles.modalStatGrid}>
                  <div className={styles.modalStat}><span>Login</span><strong>{formatTime(kekaTime)}</strong></div>
                  <div className={styles.modalStat}><span>Logout</span><strong>{formatTime(lastLogout)}</strong></div>
                  <div className={styles.modalStat}><span>Session</span><strong>{totalLoginToLogout ? `${Math.floor(totalLoginToLogout / 60)}h ${totalLoginToLogout % 60}m` : '—'}</strong></div>
                  <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{deltaOzontellFromKeka !== null ? (deltaOzontellFromKeka > 0 ? `+${deltaOzontellFromKeka}m` : `${deltaOzontellFromKeka}m`) : '—'}</strong></div>
                </div>
              </>
            )}
            {activeTile === 'orbit' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#8B7FE8' }} /><span className={styles.modalTitle}>Orbit Login</span></div>
                {orbitTime ? (
                  <>
                    <p className={styles.modalInsight}>Logged in at {formatTime(orbitTime)}.</p>
                    <div className={styles.modalStatGrid}>
                      <div className={styles.modalStat}><span>Orbit Login</span><strong>{formatTime(orbitTime)}</strong></div>
                      <div className={styles.modalStat}><span>From Keka</span><strong className={styles.statGood}>{deltaOrbitFromKeka !== null ? (deltaOrbitFromKeka > 0 ? `+${deltaOrbitFromKeka}m` : `${deltaOrbitFromKeka}m`) : '—'}</strong></div>
                      <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{minutesBetween(orbitTime, ozontellReady, true) !== null ? (minutesBetween(orbitTime, ozontellReady, true)! > 0 ? `+${minutesBetween(orbitTime, ozontellReady, true)}m` : `${minutesBetween(orbitTime, ozontellReady, true)}m`) : '—'}</strong></div>
                    </div>
                  </>
                ) : (
                  <p className={styles.modalInsight}>Orbit CRM not connected yet.</p>
                )}
              </>
            )}
            {activeTile === 'ozontell' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#33C2C9' }} /><span className={styles.modalTitle}>Ozontell Ready</span></div>
                <div className={styles.modalCard}>
                  <div className={styles.modalStatGrid}>
                    <div className={styles.modalStat}><span>Login</span><strong>{formatTime(kekaTime)}</strong></div>
                    <div className={styles.modalStat}><span>1st Lead</span><strong>{formatTime(firstLead)}</strong></div>
                    <div className={styles.modalStat}><span>Ozontell Ready</span><strong>{formatTime(ozontellReady)}</strong></div>
                    <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{deltaOzontellFromKeka !== null ? (deltaOzontellFromKeka > 0 ? `+${deltaOzontellFromKeka}m` : `${deltaOzontellFromKeka}m`) : '—'}</strong></div>
                  </div>
                </div>
              </>
            )}
            {activeTile === 'first' && (
              <>
                <div className={styles.modalHeader}><span className={styles.modalDot} style={{ background: '#F4631E' }} /><span className={styles.modalTitle}>First Lead</span></div>
                <p className={styles.modalInsight}>{deltaKekaToFirst !== null && deltaKekaToFirst <= 30 ? `First lead in ${deltaKekaToFirst} min!` : `First lead at ${formatTime(firstLead)}.`}</p>
                <div className={styles.modalStatGrid}>
                  <div className={styles.modalStat}><span>Time</span><strong>{formatTime(firstLead)}</strong></div>
                  <div className={styles.modalStat}><span>After Keka</span><strong className={styles.statGood}>{deltaKekaToFirst}m</strong></div>
                  <div className={styles.modalStat}><span>Total</span><strong>{totalLeads}</strong></div>
                  <div className={styles.modalStat}><span>Auto/Manual</span><strong>{data?.allotment?.auto_allotted || 0}/{data?.allotment?.manual_allotted || 0}</strong></div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeBlock && (
        <div className={`${styles.modalOverlay} ${closing ? styles.modalOverlayOut : ''}`} onClick={closeModal}>
          <div className={`${styles.modalCard} ${closing ? styles.modalCardOut : ''}`} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>✕</button>
            <div className={styles.modalHeader}>
              <span className={styles.modalDot} style={{ background: activeBlock.leads > 0 ? (activeBlock.isLateAllocation ? '#F4631E' : '#33C2C9') : activeBlock.eligible ? '#6B6660' : '#3a3a3a' }} />
              <span className={styles.modalTitle}>{activeBlock.hour}</span>
            </div>
            <p className={styles.modalInsight}>
              {activeBlock.isLateAllocation
                ? (activeBlock.leads > 0 ? `${activeBlock.leads} late allocation lead${activeBlock.leads > 1 ? 's' : ''} landed.` : 'Eligible for late allocation (6PM/7PM catch-up).')
                : activeBlock.isBreak
                  ? (activeBlock.leads > 0 ? `${activeBlock.leads} manual lead${activeBlock.leads > 1 ? 's' : ''} landed while on break.` : 'On break (logged out of Orbit). Not eligible for auto-allocation.')
                  : !activeBlock.isReady
                    ? (activeBlock.leads > 0 ? `${activeBlock.leads} manual lead${activeBlock.leads > 1 ? 's' : ''} landed.` : 'Not ready on Ozontell. Not eligible for auto-allocation.')
                    : (activeBlock.leads > 0 ? `${activeBlock.leads} auto lead${activeBlock.leads > 1 ? 's' : ''} landed.` : 'Eligible, no lead.')
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}