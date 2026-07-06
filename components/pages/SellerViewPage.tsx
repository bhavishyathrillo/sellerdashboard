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

function minutesBetween(a: string | null, b: string | null): number | null {
  const pa = extractTimeParts(a)
  const pb = extractTimeParts(b)
  if (!pa || !pb) return null
  let minsA = pa.h * 60 + pa.m
  let minsB = pb.h * 60 + pb.m
  // basic wrap-around assuming next day if b is smaller
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
  const [activeBlock, setActiveBlock] = useState<{ hour: string; start: number; end: number; leads: number; eligible: boolean; isBreak: boolean; isLateAllocation: boolean; isReady: boolean; isOrbitOnly: boolean } | null>(null)
  const [closing, setClosing] = useState(false)
  const [showHourlyView, setShowHourlyView] = useState(false)
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
        const plannedVals = trendData.map((d: any) => d.wd > 0 ? Math.floor(d.lead_goal / d.wd) : 0)
        const finalVals = trendData.map((d: any) => d.final_lta || 0)
        const allVals = [...plannedVals, ...finalVals].filter(Boolean)
        const yMax = allVals.length > 0 ? Math.max(...allVals) + 2 : 10

        // Create elegant gradient backgrounds
        const gradientFinal = ctx.createLinearGradient(0, 0, 0, 200)
        gradientFinal.addColorStop(0, 'rgba(244, 99, 30, 0.25)')
        gradientFinal.addColorStop(1, 'rgba(244, 99, 30, 0.0)')

        const gradientPlanned = ctx.createLinearGradient(0, 0, 0, 200)
        gradientPlanned.addColorStop(0, 'rgba(59, 130, 246, 0.1)')
        gradientPlanned.addColorStop(1, 'rgba(59, 130, 246, 0.0)')

        trendChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Final Daily Target',
                data: finalVals,
                borderColor: '#F4631E',
                backgroundColor: gradientFinal,
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#F4631E',
                pointHoverRadius: 6,
                pointRadius: 3,
                pointHoverBackgroundColor: '#FFFFFF',
                pointHoverBorderColor: '#F4631E',
                pointHoverBorderWidth: 2,
              },
              {
                label: 'Base Planned Target',
                data: plannedVals,
                borderColor: '#3B82F6',
                backgroundColor: gradientPlanned,
                borderWidth: 1.5,
                borderDash: [5, 4],
                tension: 0.2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                  color: '#8A8278',
                  font: { size: 10 },
                  usePointStyle: true,
                  boxWidth: 6,
                  padding: 15
                }
              },
              tooltip: {
                backgroundColor: '#111111',
                titleColor: '#FFFFFF',
                bodyColor: '#E5E7EB',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  title: (ctx: any) => `Day ${ctx[0].label}`,
                  label: (ctx: any) => {
                    const d = trendData[ctx.dataIndex]
                    if (!d) return ''
                    const p = d.wd > 0 ? Math.floor(d.lead_goal / d.wd) : 0
                    const fin = d.final_lta ?? p
                    if (ctx.datasetIndex === 0) {
                      return `Final Target: ${fin} leads`
                    }
                    return `Base Planned: ${p} leads`
                  },
                  afterBody: (context: any) => {
                    if (!context?.length) return []
                    const d = trendData[context[0].dataIndex]
                    if (!d) return []
                    
                    const p = d.wd > 0 ? Math.floor(d.lead_goal / d.wd) : 0
                    const dyn = d.real_dynamic_lta ?? p
                    const hyg = d.hygiene_lta ?? dyn
                    const gl = d.goal_completion_logic_lta ?? hyg
                    const fin = d.final_lta ?? gl

                    const fmtDiff = (v: number) => {
                      if (v === 0) return 'no change'
                      return v > 0 ? `+${v}` : `${v}`
                    }

                    return [
                      `──────────────────────────────`,
                      `  Planned Base   : ${p} leads`,
                      `  Dynamic LTA    : ${dyn} (${fmtDiff(dyn - p)})`,
                      `  After Hygiene  : ${hyg} (${fmtDiff(hyg - dyn)})`,
                      `  After Goal     : ${gl} (${fmtDiff(gl - hyg)})`,
                      `  Final Target   : ${fin} (${fmtDiff(fin - gl)})`,
                      `──────────────────────────────`
                    ]
                  }
                }
              }
            },
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: {
                ticks: { color: '#8A8278', font: { size: 9 } },
                grid: { display: false }
              },
              y: {
                ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 },
                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                beginAtZero: true,
                suggestedMax: yMax
              }
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
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const existing = data.goal_vs_shb_trend!.find((d: any) => d.date === dateStr);
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

  const deltaOrbitFromKeka = minutesBetween(kekaTime, orbitTime)
  const deltaOzontellFromKeka = minutesBetween(kekaTime, ozontellReady)
  const deltaOzontellToFirst = minutesBetween(ozontellReady, firstLead)
  const deltaKekaToFirst = minutesBetween(kekaTime, firstLead)
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
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Login Timestamps</span></div>
      <div className={styles.loginStrip}>
        {[
          { key: 'keka', cls: styles.loginTileKeka, label: 'Keka Login', value: formatTime(kekaTime), sub: ' ' },
          { key: 'orbit', cls: styles.loginTileOrbit, label: 'Orbit Login', value: formatTime(orbitTime), sub: deltaOrbitFromKeka !== null ? `+${deltaOrbitFromKeka} min from Keka` : '—' },
          { key: 'ozontell', cls: styles.loginTileOzontell, label: 'Ozontell Ready', value: formatTime(ozontellReady), sub: deltaOzontellFromKeka !== null ? (deltaOzontellFromKeka > 0 ? `+${deltaOzontellFromKeka} min from Keka` : `${deltaOzontellFromKeka} min from Keka`) : '—' },
          { key: 'first', cls: styles.loginTileFirst, label: 'First Lead', value: formatTime(firstLead), sub: deltaOzontellToFirst !== null ? `+${deltaOzontellToFirst} min from Ozontell` : '—' },
        ].map((t: { key: string; cls: string; label: string; value: string; sub: string; muted?: boolean }) => (
          <div key={t.key} className={`${styles.loginTile} ${t.cls}`} style={{ cursor: 'default' }}>
            <div className={styles.loginTileLabel}>{t.label}</div>
            <div className={styles.loginTileValue} style={t.muted ? { color: '#6B7280' } : undefined}>{t.value}</div>
            <div className={styles.loginTileDelta}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* KPI Grid */}
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Key Metrics</span></div>
      <div className={styles.kpiGrid}>
        {/* Total received — expandable hourly breakdown */}
        <div className={styles.kpiTile} style={{ gridColumn: showHourlyView ? '1 / -1' : undefined, transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className={styles.kpiLabel}>Total received</div>
              <div className={`${styles.kpiValue} ${totalLeads > 0 ? styles.kpiValueRed : styles.kpiValueMuted}`}>{totalLeads}</div>
              <div className={styles.kpiSub}>Auto: {data?.allotment?.auto_allotted || 0} · Manual: {data?.allotment?.manual_allotted || 0}</div>
            </div>
            {totalLeads > 0 && (
              <button
                onClick={() => setShowHourlyView(v => !v)}
                style={{
                  background: showHourlyView ? 'rgba(244,99,30,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${showHourlyView ? 'rgba(244,99,30,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: showHourlyView ? '#F4631E' : '#6B7280',
                  borderRadius: '6px', padding: '3px 8px', fontSize: '0.6rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px', whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {showHourlyView ? '↑ hide' : '↓ hourly'}
              </button>
            )}
          </div>

          {showHourlyView && (() => {
            // Build hourly data with cumulative %
            let cumLeads = 0
            let hit50Hour = ''
            let hit100Hour = ''
            const hourRows = HOUR_SLOTS.map(hour => {
              const count = hourlyMap[hour] || 0
              cumLeads += count
              const cumPct = finalLtaVal > 0 ? Math.min(100, Math.round((cumLeads / finalLtaVal) * 100)) : 0
              const justHit50 = finalLtaVal > 0 && cumLeads >= finalLtaVal / 2 && !hit50Hour
              const justHit100 = finalLtaVal > 0 && cumLeads >= finalLtaVal && !hit100Hour
              if (justHit50) hit50Hour = hour
              if (justHit100) hit100Hour = hour
              return { hour, count, cumLeads, cumPct }
            })
            const maxCount = Math.max(...hourRows.map(r => r.count), 1)

            return (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hourly breakdown · {finalLtaVal > 0 ? `LTA = ${finalLtaVal} leads` : 'LTA not set'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '4px' }}>
                  {hourRows.map(({ hour, count, cumLeads: cum, cumPct }) => {
                    const is50 = hour === hit50Hour
                    const is100 = hour === hit100Hour
                    const barColor = is100 ? '#22C55E' : is50 ? '#EAB308' : count > 0 ? '#F4631E' : 'rgba(255,255,255,0.06)'
                    const barH = count > 0 ? Math.max(6, Math.round((count / maxCount) * 52)) : 3
                    return (
                      <div key={hour} className={styles.tooltipContainer} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', display: 'flex', height: '60px', position: 'relative' }}>
                        {(is50 || is100) && (
                          <div style={{ position: 'absolute', top: 0, fontSize: '0.42rem', fontWeight: 700, color: is100 ? '#22C55E' : '#EAB308', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.1 }}>
                            {is100 ? '100%' : '50%'}
                          </div>
                        )}
                        <div style={{ width: '100%', background: barColor, height: `${barH}px`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', position: 'relative' }}>
                          {count > 0 && barH >= 12 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.5rem', fontWeight: 800, color: '#fff' }}>{count}</div>
                          )}
                        </div>
                        <div className={styles.tooltip}>
                          <div className={styles.tooltipTime}>{hour}</div>
                          <div className={styles.tooltipText}>{count} lead{count !== 1 ? 's' : ''}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: '2px' }}>Running: {cum} ({cumPct}%{finalLtaVal > 0 ? ` of ${finalLtaVal}` : ''}){is50 ? ' 🟡 50%' : ''}{is100 ? ' 🟢 100%' : ''}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Hour labels */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {HOUR_SLOTS.map(h => {
                    const num = parseInt(h.replace(/[AP]M/, ''), 10)
                    const nextNum = num === 12 ? 1 : num + 1
                    return (
                      <div key={h} style={{ flex: 1, fontSize: '0.42rem', color: '#4A4642', textAlign: 'center', overflow: 'hidden', lineHeight: 1.3 }}>
                        {num}–{nextNum}
                      </div>
                    )
                  })}
                </div>
                {/* Appetite milestone legend */}
                {finalLtaVal > 0 && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.58rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EAB308', flexShrink: 0 }} />
                      50% appetite{hit50Hour ? ` — by end of ${hit50Hour}` : ' — not yet'}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#22C55E', flexShrink: 0 }} />
                      100% appetite{hit100Hour ? ` — by end of ${hit100Hour}` : ' — not yet'}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
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
          <div style={{ color: '#F4631E', fontSize: '12px', padding: '10px 0' }}>
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
              // Position marker at END of the bucket (h+1)*60 so the displayed
              // time reflects "appetite reached by this point", not a fake :30
              const bucketEndMin = Math.min((h + 1) * 60, timelineEndMin);

              if (finalLtaVal > 0) {
                if (runningLeads >= target50 && time50 === null) time50 = bucketEndMin;
                if (runningLeads >= target100 && time100 === null) {
                  time100 = bucketEndMin;
                  if (time100 === time50) time100 = Math.min(time50 + 15, timelineEndMin);
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
                const eligible = (!isBreak && isReady) || isOrbitOnly

                // Pull leads for this segment
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

                // ── 8-state classification ────────────────────────────────
                // WITH LEAD:
                //   1. Normal          — eligible + lead                   → green
                //   2. On-break lead   — on break (exception) + lead        → amber
                //   3. Not-ready lead  — Ozontell not ready (exception) + lead → orange
                //   4. Orbit lead      — Orbit-eligible + lead              → violet
                // WITHOUT LEAD:
                //   5. Eligible wait   — ready, no break, no lead yet       → dim teal
                //   6. On break        — on Keka break, no lead             → dim red
                //   7. Not ready       — Keka logged in, Ozontell not ready → dark gray
                //   8. Orbit wait      — Orbit-eligible, no lead            → dim violet
                // ─────────────────────────────────────────────────────────
                let blockClass: string
                let stateLabel: string
                let hoverTitle: string
                let hoverDetail: string

                if (leads > 0) {
                  if (isOrbitOnly) {
                    blockClass = styles.blockLeadOrbit
                    stateLabel = 'ORBIT'
                    hoverTitle = `${leads} lead${leads > 1 ? 's' : ''} received via Orbit`
                    hoverDetail = 'Keka break active · Orbit kept you eligible'
                  } else if (eligible) {
                    blockClass = styles.blockLeadNormal
                    stateLabel = ''
                    hoverTitle = `${leads} lead${leads > 1 ? 's' : ''} received`
                    hoverDetail = 'Ozontell ready · eligible window'
                  } else if (isBreak) {
                    blockClass = styles.blockLeadOnBreak
                    stateLabel = 'BREAK'
                    hoverTitle = `${leads} lead${leads > 1 ? 's' : ''} received during break`
                    hoverDetail = 'Exception — lead landed while you were on break'
                  } else {
                    blockClass = styles.blockLeadNotReady
                    stateLabel = '!'
                    hoverTitle = `${leads} lead${leads > 1 ? 's' : ''} received — not ready`
                    hoverDetail = 'Exception — Ozontell was not in Ready state'
                  }
                } else {
                  if (isOrbitOnly) {
                    blockClass = styles.blockOrbitWait
                    stateLabel = 'ORBIT'
                    hoverTitle = 'Orbit eligible · no lead'
                    hoverDetail = 'Keka break active · Orbit kept you eligible'
                  } else if (eligible) {
                    blockClass = styles.blockEligibleWait
                    stateLabel = ''
                    hoverTitle = 'Open window — no lead received'
                    hoverDetail = 'Ozontell ready · eligible but no lead came'
                  } else if (isBreak) {
                    blockClass = styles.blockOnBreak
                    stateLabel = 'BREAK'
                    hoverTitle = 'On break — not eligible'
                    hoverDetail = 'Keka break logged · auto-allocation paused'
                  } else {
                    blockClass = styles.blockNotReady
                    stateLabel = ''
                    hoverTitle = 'Not ready on Ozontell'
                    hoverDetail = 'Keka logged in · Ozontell not in Ready state'
                  }
                }
                const timePrefix = '' // no longer needed — detail is in hoverDetail


                return { ...seg, blockClass, stateLabel, hoverTitle, hoverDetail, leads, eligible, isBreak, isReady, isOrbitOnly }
              })

              // 2. Merge identical adjacent segments (no-lead segments only)
              const mergedSegments: typeof mappedSegments = []
              let current = mappedSegments[0]
              for (let i = 1; i < mappedSegments.length; i++) {
                const next = mappedSegments[i]
                if (
                  current.blockClass === next.blockClass &&
                  current.leads === 0 && next.leads === 0
                ) {
                  current = { ...current, end: next.end, widthPercent: current.widthPercent + next.widthPercent }
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
                      onClick={() => setActiveBlock({ hour: seg.hourBucket, start: seg.start, end: seg.end, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: false, isReady: seg.isReady, isOrbitOnly: seg.isOrbitOnly })}
                    >
                      {seg.widthPercent >= 3 ? (
                        seg.leads > 0 ? (
                          <>
                            <span className={styles.blockLeadCount}>{seg.leads}</span>
                            {seg.stateLabel && <span className={styles.blockTag}>{seg.stateLabel}</span>}
                          </>
                        ) : (
                          seg.stateLabel && seg.widthPercent >= 5
                            ? <span className={styles.blockTag} style={{ marginTop: 0 }}>{seg.stateLabel}</span>
                            : null
                        )
                      ) : null}
                    </button>
                    <div className={styles.tooltip} style={ttVars as any}>
                      <div className={styles.tooltipTime}>{formatTime(seg.start)} – {formatTime(seg.end)}</div>
                      <div className={styles.tooltipText}>{seg.hoverTitle}</div>
                      <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: '3px' }}>{seg.hoverDetail}</div>
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

          {/* Legend */}
          <div className={styles.timelineLegend}>
            {[
              { color: '#16A34A', label: 'Lead received' },
              { color: '#D97706', label: 'Lead during break (exception)' },
              { color: '#EA580C', label: 'Lead — not ready on Ozontell (exception)' },
              { color: '#7C3AED', label: 'Lead via Orbit' },
              { color: 'rgba(20,184,166,0.35)', border: 'rgba(20,184,166,0.5)', label: 'Eligible — waiting for lead' },
              { color: 'rgba(153,27,27,0.55)', border: 'rgba(185,28,28,0.4)', label: 'On break' },
              { color: 'rgba(39,39,42,0.8)', border: '#3F3F46', label: 'Not ready on Ozontell' },
              { color: 'rgba(124,58,237,0.25)', border: 'rgba(124,58,237,0.35)', label: 'Orbit eligible — waiting' },
            ].map((item, i) => (
              <div key={i} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: item.color, border: item.border ? `1px solid ${item.border}` : 'none' }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ═══════════ LTA SECTION — clean, fresher-friendly ═══════════ */}
      <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
        <span className={styles.sectionTitle}>Today's Lead Target (LTA)</span>
        <span className={styles.sectionHint}>how many leads you should get today</span>
      </div>

      {/* Big LTA number + plain-english step breakdown */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '24px 20px', marginBottom: '14px' }}>

        {/* Top: Final LTA big number */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Your target for today</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '3.2rem', fontWeight: 800, color: finalLtaVal > 0 ? '#F4631E' : '#4A4642', lineHeight: 1 }}>{finalLtaVal}</span>
              <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>leads</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '180px', paddingBottom: '6px' }}>
            <div style={{ fontSize: '0.7rem', color: '#6B7280', marginBottom: '6px' }}>Progress towards appetite</div>
            <div style={{ height: '8px', background: '#1E1E1E', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: finalLtaVal > 0 ? `${Math.min(100, Math.round((totalLeads / finalLtaVal) * 100))}%` : '0%',
                background: totalLeads >= finalLtaVal ? '#22C55E' : totalLeads >= finalLtaVal * 0.5 ? '#EAB308' : '#F4631E',
                borderRadius: '8px',
                transition: 'width 0.6s ease'
              }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: '4px' }}>
              {totalLeads} received · {finalLtaVal > 0 ? Math.min(100, Math.round((totalLeads / finalLtaVal) * 100)) : 0}% done
            </div>
          </div>
        </div>

        {/* Step-by-step breakdown — plain English */}
        <div style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
          How today's target was calculated
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
          {(() => {
            const steps = [
              {
                id: 'planned',
                label: 'Base target',
                sublabel: 'Monthly goal ÷ working days',
                value: plannedLtaVal,
                color: '#3B82F6',
                drop: dropPlannedToDynamic,
                dropLabel: dropPlannedToDynamic > 0 ? 'Late login / inactive' : dropPlannedToDynamic < 0 ? 'Bonus added' : null,
              },
              {
                id: 'dynamic',
                label: 'Dynamic LTA',
                sublabel: 'Adjusted for when you were online',
                value: dynamicLtaVal,
                color: '#EAB308',
                drop: dropDynamicToHygiene,
                dropLabel: dropDynamicToHygiene > 0 ? 'Hygiene penalty' : dropDynamicToHygiene < 0 ? 'Bonus added' : null,
              },
              {
                id: 'hygiene',
                label: 'After hygiene',
                sublabel: 'Adjusted for call quality',
                value: hygieneLtaVal,
                color: '#F97316',
                drop: dropHygieneToGoal,
                dropLabel: dropHygieneToGoal > 0 ? 'Goal correction' : dropHygieneToGoal < 0 ? 'Bonus added' : null,
              },
              {
                id: 'goalComplete',
                label: 'After goal check',
                sublabel: 'Adjusted for goal completion',
                value: goalCompleteLtaVal,
                color: '#8B5CF6',
                drop: dropGoalToFinal,
                dropLabel: dropGoalToFinal > 0 ? 'Final adjustment' : dropGoalToFinal < 0 ? 'Bonus added' : null,
              },
              {
                id: 'final',
                label: "Today's final target",
                sublabel: 'Your lead appetite today',
                value: finalLtaVal,
                color: '#22C55E',
                drop: null,
                dropLabel: null,
              },
            ]
            return steps.map((step, idx) => {
              // Collaborator logic: check if the particular logic stage was NOT used
              const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                (data as any)?.kalpit?.find((k: any) => k.name === (step.id === 'goalComplete' ? 'goal' : step.id))?.value === 0;

              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0, opacity: isNotUsed ? 0.6 : 1 }}>
                  {/* Step card */}
                  <div style={{
                    background: '#0D0D0D', border: `1px solid ${isNotUsed ? '#333' : `${step.color}40`}`,
                    borderRadius: '10px', padding: '10px 14px', minWidth: '120px', flexShrink: 0,
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ fontSize: '0.58rem', color: isNotUsed ? '#555' : step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                      {isNotUsed && (
                        <span style={{ fontSize: '0.45rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>NOT USED</span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isNotUsed ? '#555' : '#F0EDE8', lineHeight: 1 }}>{step.value}</div>
                  <div style={{ fontSize: '0.55rem', color: '#5A5650', marginTop: '3px', lineHeight: 1.3 }}>{step.sublabel}</div>
                </div>

                {/* Arrow + drop indicator */}
                {idx < steps.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px', minWidth: '64px' }}>
                    {step.drop !== null && step.drop !== 0 && (
                      <div style={{
                        fontSize: '0.58rem', fontWeight: 700,
                        color: step.drop > 0 ? '#EF4444' : '#22C55E',
                        background: step.drop > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        padding: '2px 6px', borderRadius: '6px', marginBottom: '4px',
                        whiteSpace: 'nowrap',
                      }}>
                        {step.drop > 0 ? `−${step.drop}` : `+${Math.abs(step.drop)}`}
                      </div>
                    )}
                    <div style={{ fontSize: '0.55rem', color: '#4A4642', textAlign: 'center', lineHeight: 1.2, marginBottom: '4px' }}>
                      {step.dropLabel}
                    </div>
                    <span style={{ color: '#3A3A3A', fontSize: '1rem' }}>→</span>
                  </div>
                )}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* ── Monthly LTA — full panel ── */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
        <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '18px' }}>
          Monthly LTA · {monthStr}
        </div>

        {/* Row 1: Lead Goal | SHB (Per Planned) | Revised LTA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: '0', marginBottom: '16px' }}>
          {/* Lead Goal */}
          <div style={{ padding: '0 16px 0 0' }}>
            <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Lead Goal</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1 }}>{dailyLta?.lead_goal || 0}</span>
              <span style={{ fontSize: '0.58rem', color: '#5A5650' }}>leads</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#4A4642', marginTop: '4px' }}>Monthly target assigned</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', width: '1px', alignSelf: 'stretch' }} />
          {/* Lead SHB */}
          <div style={{ padding: '0 16px' }}>
            <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Lead SHB <span style={{ color: '#3A3A3A', fontWeight: 400 }}>(Per Planned)</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#EAB308', lineHeight: 1 }}>{dailyLta?.leads_shb || 0}</span>
              <span style={{ fontSize: '0.58rem', color: '#5A5650' }}>leads</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#4A4642', marginTop: '4px' }}>Sales Handled Business target</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', width: '1px', alignSelf: 'stretch' }} />
          {/* Revised Monthly LTA */}
          <div style={{ padding: '0 0 0 16px' }}>
            <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Revised Monthly LTA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: monthly?.revised_lta ? '#8B5CF6' : '#3A3A3A', lineHeight: 1 }}>{monthly?.revised_lta || 0}</span>
              <span style={{ fontSize: '0.58rem', color: '#5A5650' }}>leads</span>
            </div>
            <div style={{ fontSize: '0.58rem', color: '#4A4642', marginTop: '4px' }}>Planned target for month</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '16px' }} />

        {/* Row 2: Leads Received — Overall + Planned Region */}
        <div style={{ fontSize: '0.6rem', color: '#5A5650', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Leads Received</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Overall */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 500, marginBottom: '6px' }}>Overall (all regions)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: (dailyLta?.leads_actual || 0) > 0 ? '#22C55E' : '#3A3A3A', lineHeight: 1 }}>{dailyLta?.leads_actual || 0}</span>
              <span style={{ fontSize: '0.58rem', color: '#5A5650' }}>leads</span>
            </div>
            {(monthly?.revised_lta || 0) > 0 && (
              <>
                <div style={{ height: '4px', background: '#1E1E1E', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round(((dailyLta?.leads_actual || 0) / (monthly?.revised_lta || 1)) * 100))}%`, background: '#22C55E', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: '#5A5650', marginTop: '4px' }}>{Math.min(100, Math.round(((dailyLta?.leads_actual || 0) / (monthly?.revised_lta || 1)) * 100))}% of revised monthly goal</div>
              </>
            )}
          </div>
          {/* Planned Region */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.58rem', color: '#5A5650', fontWeight: 500, marginBottom: '6px' }}>Planned region only</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: (dailyLta?.leads_actual_planned_region || 0) > 0 ? '#F97316' : '#3A3A3A', lineHeight: 1 }}>{dailyLta?.leads_actual_planned_region || 0}</span>
              <span style={{ fontSize: '0.58rem', color: '#5A5650' }}>leads</span>
            </div>
            {(monthly?.revised_lta || 0) > 0 && (
              <>
                <div style={{ height: '4px', background: '#1E1E1E', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round(((dailyLta?.leads_actual_planned_region || 0) / (monthly?.revised_lta || 1)) * 100))}%`, background: '#F97316', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: '#5A5650', marginTop: '4px' }}>{Math.min(100, Math.round(((dailyLta?.leads_actual_planned_region || 0) / (monthly?.revised_lta || 1)) * 100))}% of revised monthly goal</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* LTA Trend chart */}
      <div style={{ background: '#111', border: '1px solid #1E1E1E', borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>LTA trend — this month</div>
            <div style={{ fontSize: '0.58rem', color: '#4A4642', marginTop: '3px' }}>Solid curve = actual target allotted · dashed line = base planned target baseline</div>
          </div>
        </div>
        <div style={{ height: '200px', marginTop: '16px' }}>
          <canvas ref={trendChartRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>


      {/* ═══════════════ 3 CARDS: DOT | ALLOTMENT | PAX ═══════════════ */}
      <div className={styles.sectionHeader} style={{ marginTop: '28px' }}>
        <span className={styles.sectionTitle}>Monthly Breakdown · {monthStr}</span>
        <span className={styles.sectionHint}>{monthly?.days_with_data || 0} days of data</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Distribution ── */}
        {(() => {
          const totalDOT = dotChartData.reduce((s, b) => s + b.value, 0)
          return (
            <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
              <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '14px' }}>Date-of-travel spread · {totalDOT} leads</div>
              {/* Stacked track */}
              <div style={{ display: 'flex', height: '8px', borderRadius: '8px', overflow: 'hidden', gap: '2px', marginBottom: '16px' }}>
                {dotChartData.filter(b => b.value > 0).map((bar, i) => (
                  <div key={i} style={{ flex: bar.value, background: bar.color, transition: 'flex 0.6s ease', minWidth: '3px' }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dotChartData.map((bar, i) => {
                  const barPct = pct(bar.value, totalDOT)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: bar.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.6rem', color: '#8A8278', fontWeight: 500 }}>{bar.label}</div>
                      <div style={{ flex: 2, height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(bar.value / maxDotValue) * 100}%`, height: '100%', background: `${bar.color}80`, transition: 'width 0.6s ease', minWidth: bar.value > 0 ? '3px' : '0' }} />
                      </div>
                      <div style={{ width: '24px', fontSize: '0.68rem', fontWeight: 700, color: bar.value > 0 ? '#F0EDE8' : '#3A3A3A', textAlign: 'right', flexShrink: 0 }}>{bar.value}</div>
                      <div style={{ width: '34px', fontSize: '0.55rem', fontWeight: 600, color: bar.value > 0 ? bar.color : '#3A3A3A', background: bar.value > 0 ? `${bar.color}15` : 'transparent', padding: '1px 5px', borderRadius: '100px', textAlign: 'center', flexShrink: 0 }}>{barPct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Allotment Breakdown ── */}
        {(() => {
          const autoColor = '#3B82F6', manualColor = '#8B5CF6', rtgColor = '#F4631E', nonRtgColor = '#4B5563'
          const autoVal = monthly?.auto_allotted || 0
          const manualVal = monthly?.manual_allotted || 0
          const rtgVal = monthly?.rtg_leads || 0
          const nonRtgVal = monthly?.non_rtg_leads || 0
          return (
            <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
              <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '14px' }}>How leads were assigned · {monthTotalLeads} total</div>
              {/* Auto vs Manual stacked track */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.55rem', color: '#4A4642', marginBottom: '4px' }}>Auto vs Manual</div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '8px', overflow: 'hidden', gap: '2px' }}>
                  {autoVal > 0 && <div style={{ flex: autoVal, background: autoColor, transition: 'flex 0.6s ease' }} />}
                  {manualVal > 0 && <div style={{ flex: manualVal, background: manualColor, transition: 'flex 0.6s ease' }} />}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280' }}><span style={{ color: autoColor, fontWeight: 700 }}>{autoVal}</span> auto ({pct(autoVal, monthTotalLeads)}%)</div>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280' }}><span style={{ color: manualColor, fontWeight: 700 }}>{manualVal}</span> manual ({pct(manualVal, monthTotalLeads)}%)</div>
                </div>
              </div>
              {/* RTG vs Non-RTG stacked track */}
              <div>
                <div style={{ fontSize: '0.55rem', color: '#4A4642', marginBottom: '4px' }}>RTG vs Non-RTG</div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '8px', overflow: 'hidden', gap: '2px' }}>
                  {rtgVal > 0 && <div style={{ flex: rtgVal, background: rtgColor, transition: 'flex 0.6s ease' }} />}
                  {nonRtgVal > 0 && <div style={{ flex: nonRtgVal, background: nonRtgColor, transition: 'flex 0.6s ease' }} />}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280' }}><span style={{ color: rtgColor, fontWeight: 700 }}>{rtgVal}</span> RTG ({pct(rtgVal, monthTotalLeads)}%)</div>
                  <div style={{ fontSize: '0.6rem', color: '#6B7280' }}><span style={{ color: '#8A8278', fontWeight: 700 }}>{nonRtgVal}</span> non-RTG ({pct(nonRtgVal, monthTotalLeads)}%)</div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── PAX Distribution ── */}
        {(() => {
          const paxColors = ['#F9FAFB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563']
          const paxLabels = ['Solo (1)', '2 pax', '3 pax', '4 pax', '4+ pax']
          const paxVals = [monthly?.pax_1 || 0, monthly?.pax_2 || 0, monthly?.pax_3 || 0, monthly?.pax_4 || 0, monthly?.pax_4_plus || 0]
          return (
            <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
              <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '14px' }}>Pax mix across {monthTotalLeads} leads</div>
              {/* Segmented stacked track */}
              <div style={{ display: 'flex', height: '8px', borderRadius: '8px', overflow: 'hidden', gap: '2px', marginBottom: '16px' }}>
                {paxVals.map((v, i) => v > 0 ? <div key={i} style={{ flex: v, background: paxColors[i], transition: 'flex 0.6s ease', minWidth: '3px' }} /> : null)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {paxLabels.map((label, i) => {
                  const val = paxVals[i]
                  const barPct = pct(val, monthTotalPax)
                  const maxPax = Math.max(...paxVals, 1)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: paxColors[i], flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: '0.6rem', color: '#8A8278', fontWeight: 500 }}>{label}</div>
                      <div style={{ flex: 2, height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${(val / maxPax) * 100}%`, height: '100%', background: `${paxColors[i]}70`, transition: 'width 0.6s ease', minWidth: val > 0 ? '3px' : '0' }} />
                      </div>
                      <div style={{ width: '24px', fontSize: '0.68rem', fontWeight: 700, color: val > 0 ? '#F0EDE8' : '#3A3A3A', textAlign: 'right', flexShrink: 0 }}>{val}</div>
                      <div style={{ width: '34px', fontSize: '0.55rem', fontWeight: 600, color: val > 0 ? paxColors[i] : '#3A3A3A', background: val > 0 ? `${paxColors[i]}15` : 'transparent', padding: '1px 5px', borderRadius: '100px', textAlign: 'center', flexShrink: 0 }}>{barPct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
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
                  <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{deltaOzontellFromKeka !== null ? `${deltaOzontellFromKeka}m` : '—'}</strong></div>
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
                      <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{minutesBetween(orbitTime, ozontellReady) !== null ? (minutesBetween(orbitTime, ozontellReady)! > 0 ? `+${minutesBetween(orbitTime, ozontellReady)}m` : `${minutesBetween(orbitTime, ozontellReady)}m`) : '—'}</strong></div>
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
                    <div className={styles.modalStat}><span>To Ozontell</span><strong className={styles.statGood}>{deltaOzontellFromKeka !== null ? `${deltaOzontellFromKeka}m` : '—'}</strong></div>
                  </div>
                </div>
                <div className={styles.modalCard}>
                  <h4 className={styles.modalH4}>Login Speed</h4>
                  <div className={styles.modalMetricRow}>
                    <div className={styles.modalMetricBlock}>
                      <div className={styles.modalMetricVal}>{deltaOzontellFromKeka !== null ? `${deltaOzontellFromKeka}m` : '—'}</div>
                      <div className={styles.modalMetricLabel}>Keka to Ozontell</div>
                    </div>
                    <div className={styles.modalMetricBlock}>
                      <div className={styles.modalMetricVal}>{deltaOzontellToFirst !== null ? `${deltaOzontellToFirst}m` : '—'}</div>
                      <div className={styles.modalMetricLabel}>Ready to 1st Lead</div>
                    </div>
                  </div>
                  <p className={styles.modalInsight}>{deltaOzontellFromKeka !== null && deltaOzontellFromKeka <= 5 ? `Ready in ${deltaOzontellFromKeka} min — great!` : `Ready ${deltaOzontellFromKeka ?? '—'} min after Keka.`}</p>
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
              <span className={styles.modalTitle}>
                {activeBlock.start !== undefined && activeBlock.end !== undefined
                  ? (() => {
                      const fmt = (mins: number) => {
                        const h = Math.floor(mins / 60)
                        const m = mins % 60
                        const ap = h >= 12 ? 'PM' : 'AM'
                        let h12 = h % 12
                        if (h12 === 0) h12 = 12
                        return `${h12}:${m.toString().padStart(2, '0')} ${ap}`
                      }
                      return `${fmt(activeBlock.start)} – ${fmt(activeBlock.end)}`
                    })()
                  : activeBlock.hour
                }
              </span>
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