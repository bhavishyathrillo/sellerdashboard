'use client'

import React, { useState, useEffect, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './L1SellerViewPage.module.css'
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

// S1/S2 Helpers
function parseLogin(m: any) {
  const raw = m.attendance?.first_login
  if (!raw) return null
  const p = extractTimeParts(raw)
  return p ? (p.h * 60 + p.m) : null
}
function isLate(m: any) {
  const mins = parseLogin(m)
  return mins !== null && mins > 10 * 60 // After 10 AM
}
function parseFirstLead(m: any) {
  const raw = m.allotment?.first_lead_allotted_at_ist
  if (!raw) return null
  const p = extractTimeParts(raw)
  return p ? (p.h * 60 + p.m) : null
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
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.parsed.y}% MHE` } } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { max: 100, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels.join(','), values.join(','), color])
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

export default function L1SellerViewPage({ session }: { session: UserSession }) {
  const [teamData, setTeamData] = useState<any>(null)
  const [drillSellerTimeline, setDrillSellerTimeline] = useState<any>(null)
  const [activeTileTimeline, setActiveTileTimeline] = useState<string | null>(null)
  const [activeBlockTimeline, setActiveBlockTimeline] = useState<any>(null)
  const [showTeamFunnel, setShowTeamFunnel] = useState<boolean>(false)
  const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)
  const [activeSellerFunnel, setActiveSellerFunnel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => {
    return todayStr()
  })

  // Section Modal State
  const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)

  // Drill-down states
  const [expandedTlS1, setExpandedTlS1] = useState<string | null>(null)
  const [expandedTlS2, setExpandedTlS2] = useState<string | null>(null)
  const [expandedTlS3, setExpandedTlS3] = useState<string | null>(null)
  const [expandedTlS4, setExpandedTlS4] = useState<string | null>(null)
  const [expandedTlS5, setExpandedTlS5] = useState<string | null>(null)
  const [expandedTlS6, setExpandedTlS6] = useState<string | null>(null)
  const [expandedTlS7, setExpandedTlS7] = useState<string | null>(null)
  const [expandedTlS8, setExpandedTlS8] = useState<string | null>(null)
  const [expandedTlS9, setExpandedTlS9] = useState<string | null>(null)


  // Modals and drill-downs
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [showMheTrendModal, setShowMheTrendModal] = useState(false)
  const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)
  const [showGoalShbTrendModal, setShowGoalShbTrendModal] = useState(false)
  const [goalShbDrillSeller, setGoalShbDrillSeller] = useState<any>(null)
  const [goalShbExpandedTl, setGoalShbExpandedTl] = useState<string | null>(null)

  const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)
  const [breakdownDrillSeller, setBreakdownDrillSeller] = useState<any>(null)
  const [breakdownExpandedTl, setBreakdownExpandedTl] = useState<string | null>(null)

  const [drillSellerS7, setDrillSellerS7] = useState<any>(null)


  useEffect(() => {
    setLoading(true)
    fetch(`/api/seller/cm-team-day?email=${encodeURIComponent(session.email)}&date=${date}`)
      .then(r => r.json())
      .then(d => {
        setTeamData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session.email, date])

  const l2Groups = teamData?.l2Groups || []

  if (loading) return <Loader text="Loading CM dashboard..." />

  const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0

  // Process data for each TL group
  const processedGroups = l2Groups.map((g: any) => {
    let members = g.members || []

    members = members.map((m: any) => {
      const dailyLta = m.daily_lta || {}
      const ltaLeadGoal = dailyLta.lead_goal || 0
      const ltaWd = dailyLta.wd || 0
      const planned = ltaWd > 0 ? Math.floor(ltaLeadGoal / ltaWd) : 0
      const dynLta = dailyLta.real_dynamic_lta || 0
      const hygLta = dailyLta.hygiene_lta || 0
      const rev1Lta = dailyLta.goal_completion_logic_lta || 0
      const actual = dailyLta.final_lta || 0
      const dynLost = planned - dynLta
      const hygLost = dynLta - hygLta
      const rev1Lost = hygLta - rev1Lta
      const rev2Lost = rev1Lta - actual
      const totalLost = dynLost + hygLost + rev1Lost + rev2Lost

      const b = parseBreaks(m.attendance?.break_timestamps)

      return {
        ...m,
        isAbsent: !m.attendance?.first_login,
        lta: { planned, dynLost, dynLta, hygLost, hygLta, rev1Lost, rev1Lta, rev2Lost, actual, totalLost },
        b
      }
    })

    const totalRtg = members.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0), 0)
    const totalNonRtg = members.reduce((sum: number, m: any) => sum + (m.allotment?.non_rtg_leads || 0), 0)
    const totalLeads = totalRtg + totalNonRtg
    const totalAuto = members.reduce((sum: number, m: any) => sum + (m.allotment?.auto_allotted || 0), 0)
    const totalManual = members.reduce((sum: number, m: any) => sum + (m.allotment?.manual_allotted || 0), 0)
    const absentCount = members.filter((m: any) => m.isAbsent).length
    const onlineCount = members.length - absentCount

    const teamPlanned = members.reduce((sum: number, m: any) => sum + m.lta.planned, 0)
    const teamActual = members.reduce((sum: number, m: any) => sum + m.lta.actual, 0)

    const noLeadsCount = members.filter((m: any) => ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0).length

    // S1 specific
    const tlTotalBreak = members.reduce((s: number, m: any) => s + m.b.totalMinutes, 0)
    const tlTotalBreakCount = members.reduce((s: number, m: any) => s + m.b.count, 0)
    const tlLongestBreak = members.reduce((s: number, m: any) => Math.max(s, m.b.longestMinutes), 0)

    const tlAvgBreak = members.length > 0 ? Math.round(tlTotalBreak / members.length) : 0
    const totalLoginMins = members.reduce((s: number, m: any) => {
      const p = parseLogin(m)
      return s + (p !== null ? p : 0)
    }, 0)
    const validLogins = members.filter((m: any) => parseLogin(m) !== null).length
    const avgLogin = validLogins > 0 ? Math.round(totalLoginMins / validLogins) : null

    // Convert mins to HH:MM format for avgLogin
    let avgLoginStr = '—'
    if (avgLogin !== null) {
      const h = Math.floor(avgLogin / 60)
      const m = avgLogin % 60
      const ampm = h >= 12 ? 'pm' : 'am'
      const h12 = h % 12 || 12
      avgLoginStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
    }

    // Pax
    const pax1 = members.reduce((s: number, m: any) => s + (m.allotment?.pax_1 || 0), 0)
    const pax2 = members.reduce((s: number, m: any) => s + (m.allotment?.pax_2 || 0), 0)
    const pax3 = members.reduce((s: number, m: any) => s + (m.allotment?.pax_3 || 0), 0)
    const pax4 = members.reduce((s: number, m: any) => s + (m.allotment?.pax_4 || 0), 0)
    const pax4Plus = members.reduce((s: number, m: any) => s + (m.allotment?.pax_4_plus || 0), 0)
    const totalPax = pax1 + pax2 + pax3 + pax4 + pax4Plus

    // S4: Appetite (final_lta) & C→A time (median_creation_to_allotment_mins)
    const teamAppetite = members.reduce((s: number, m: any) => s + (m.daily_lta?.final_lta || 0), 0)
    const caVals = members.filter((m: any) => !m.isAbsent && m.allotment?.median_creation_to_allotment_mins != null).map((m: any) => m.allotment.median_creation_to_allotment_mins)
    const teamMedianCA = caVals.length > 0 ? Math.round(caVals.reduce((s: number, v: number) => s + v, 0) / caVals.length) : null

    const teamAppetiteMonthly = members.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + (r.final_lta || 0), 0), 0)
    const teamFulfPctMonthly = teamAppetiteMonthly > 0 ? pct(totalLeads, teamAppetiteMonthly) : 0
    const teamMonthlyCaRows = members.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
    const sumTCA = teamMonthlyCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
    const sumTLeads = teamMonthlyCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
    const teamAvgCaMonthly = sumTLeads > 0 ? Math.round(sumTCA / sumTLeads) : null


    // S6: DOT Month Distribution
    const dotMap: Record<string, number> = {}
    members.forEach((m: any) => {
      (m.dot_rows || []).forEach((d: any) => {
        const month = d.dot_month || 'Unknown'
        dotMap[month] = (dotMap[month] || 0) + (d.total_leads_allotted || 0)
      })
    })

    // S8: MHE %
    const mheMembers = members.filter((m: any) => !m.isAbsent && m.daily_lta)
    const teamMishandled = mheMembers.reduce((s: number, m: any) => s + (m.daily_lta?.mishandled_enquiries || 0), 0)
    const teamOpenEnq = mheMembers.reduce((s: number, m: any) => s + (m.daily_lta?.open_enquiries || 0), 0)
    const teamMhePct = mheMembers.length > 0
      ? (mheMembers.reduce((s: number, m: any) => s + (m.daily_lta?.mishandled_pct || 0), 0) / mheMembers.length)
      : 0

    return {
      ...g,
      members,
      agg: {
        totalRtg, totalNonRtg, totalLeads, totalAuto, totalManual, absentCount, onlineCount,
        teamPlanned, teamActual, noLeadsCount,
        tlAvgBreak, avgLoginStr,
        tlTotalBreak, tlTotalBreakCount, tlLongestBreak,
        pax1, pax2, pax3, pax4, pax4Plus, totalPax,
        teamAppetite, teamMedianCA,
        dotMap,
        teamMishandled, teamOpenEnq, teamMhePct
      }
    }
  })

  // Global Aggregates
  const globalLeads = processedGroups.reduce((sum: number, g: any) => sum + g.agg.totalLeads, 0)
  const globalAuto = processedGroups.reduce((sum: number, g: any) => sum + g.agg.totalAuto, 0)
  const globalManual = processedGroups.reduce((sum: number, g: any) => sum + g.agg.totalManual, 0)
  const globalRtg = processedGroups.reduce((sum: number, g: any) => sum + g.agg.totalRtg, 0)
  const globalNonRtg = processedGroups.reduce((sum: number, g: any) => sum + g.agg.totalNonRtg, 0)
  const globalRtgPct = globalLeads > 0 ? Math.round((globalRtg / globalLeads) * 100) : 0
  const globalNoLeads = processedGroups.reduce((sum: number, g: any) => sum + g.agg.noLeadsCount, 0)
  const globalPlannedLta = processedGroups.reduce((sum: number, g: any) => sum + g.agg.teamPlanned, 0)
  const globalFinalLta = processedGroups.reduce((sum: number, g: any) => sum + g.agg.teamActual, 0)

  // ── CM Monthly Breakdown Aggregation ──
  // Monthly allotment aggregation
  let allMembers: any[] = []
  processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })

  const cmMonthlySum = (key: string) => allMembers.reduce((sum: number, m: any) => {
    return sum + (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
  }, 0)

  const cmMonthlyTotalLeads = cmMonthlySum('total_leads_allotted')
  const cmMonthlyAutoAllotted = cmMonthlySum('auto_allotted')
  const cmMonthlyManualAllotted = cmMonthlySum('manual_allotted')
  const cmMonthlyRtgLeads = cmMonthlySum('rtg_leads')
  const cmMonthlyNonRtgLeads = cmMonthlySum('non_rtg_leads')
  const cmMonthlyPax1 = cmMonthlySum('pax_1')
  const cmMonthlyPax2 = cmMonthlySum('pax_2')
  const cmMonthlyPax3 = cmMonthlySum('pax_3')
  const cmMonthlyPax4 = cmMonthlySum('pax_4')
  const cmMonthlyPax4Plus = cmMonthlySum('pax_4_plus')
  const cmMonthlyTotalPax = cmMonthlyPax1 + cmMonthlyPax2 + cmMonthlyPax3 + cmMonthlyPax4 + cmMonthlyPax4Plus


  const cmMonthlyAppetite = allMembers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + (r.final_lta || 0), 0), 0);
  const cmMonthlyFulfPct = cmMonthlyAppetite > 0 ? pct(cmMonthlyTotalLeads, cmMonthlyAppetite) : 0;
  const allCAMonthlyRows = allMembers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null);
  const sumCta = allCAMonthlyRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0);
  const sumCtaLeads = allCAMonthlyRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0);
  const cmMonthlyAvgCA = sumCtaLeads > 0 ? Math.round(sumCta / sumCtaLeads) : null;
  const cmMonthlyCaRows = [
    { label: 'Leads Allotted', value: cmMonthlyTotalLeads, color: '#E5E7EB' },
    { label: 'Appetite (LTA)', value: cmMonthlyAppetite, color: '#F4631E' },
  ];

  const cmAllotmentRows = [
    { label: 'Auto Allotted', value: cmMonthlyAutoAllotted, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: cmMonthlyManualAllotted, color: '#9CA3AF' },
    { label: 'RTG Leads', value: cmMonthlyRtgLeads, color: '#F4631E' },
    { label: 'Non-RTG', value: cmMonthlyNonRtgLeads, color: '#4B5563' },
  ]

  const cmPaxRows = [
    { label: '1-pax', value: cmMonthlyPax1, color: '#F3F4F6' },
    { label: '2-pax', value: cmMonthlyPax2, color: '#E5E7EB' },
    { label: '3-pax', value: cmMonthlyPax3, color: '#D1D5DB' },
    { label: '4-pax', value: cmMonthlyPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: cmMonthlyPax4Plus, color: '#6B7280' },
  ]

  const dotMonthsConfig = [
    { label: 'July', key: '07' },
    { label: 'August', key: '08' },
    { label: 'Sept', key: '09' },
    { label: 'Oct', key: '10' },
    { label: 'Nov', key: '11' },
    { label: 'Dec', key: '12' }
  ];

  const cmDotMap: Record<string, number> = {}
  allMembers.forEach((m: any) => {
    ; (m.dot_rows || []).forEach((row: any) => {
      cmDotMap[row.dot_month] = (cmDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
    })
  })

  const cmDotChartData: { label: string; value: number; color: string }[] = []
  dotMonthsConfig.forEach(mo => {
    let val = 0;
    Object.entries(cmDotMap).forEach(([k, v]) => {
      if (k.endsWith('-' + mo.key)) val += v;
    });
    cmDotChartData.push({ label: mo.label, value: val, color: '#F4631E' })
  });

  let futureSum = 0
  Object.entries(cmDotMap).forEach(([k, v]) => {
    const isMainMonth = dotMonthsConfig.some(mo => k.endsWith('-' + mo.key));
    if (!isMainMonth) futureSum += v;
  });
  cmDotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })

  const maxCmDotValue = Math.max(...cmDotChartData.map(d => d.value), 1)

  const currentMonthIndex = new Date().getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthStr = `${monthNames[currentMonthIndex]} ${new Date().getFullYear()}`




  const toggleTl = (tlEmail: string, stateSetter: any, currentState: string | null) => {
    stateSetter(currentState === tlEmail ? null : tlEmail)
  }

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

            <div className={styles.summaryStrip} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        
        {/* LEADS ALLOTTED */}
        <div className={styles.summaryCard} style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', flex: 1.5, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #F4631E, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #F4631E' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E', boxShadow: '0 0 10px #F4631E' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Leads Allotted</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{globalLeads}</span>
            <span style={{ fontSize: '1rem', color: '#71717A', fontWeight: 400 }}>/ {globalFinalLta}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#E5E7EB' }}>{globalAuto}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Manual</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#9CA3AF' }}>{globalManual}</span>
            </div>
          </div>
        </div>

        {/* RTG BREAKDOWN */}
        <div className={styles.summaryCard} style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #378ADD, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #378ADD' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#378ADD', boxShadow: '0 0 10px #378ADD' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>RTG Breakdown</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{globalRtgPct}</span>
            <span style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#378ADD' }}>{globalRtg}</span>
          </div>
        </div>

        {/* SELLERS WITH NO LEADS */}
        <div
          className={styles.summaryCard}
          style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', cursor: globalNoLeads > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}
          onClick={() => {
            if (globalNoLeads > 0) setShowNoLeadsModal(true);
          }}
          onMouseEnter={e => { if(globalNoLeads > 0) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #EF4444, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #EF4444' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Sellers No Leads</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{globalNoLeads}</span>
          </div>
        </div>

        {/* Monthly MHE Trend KPI Card */}
        {(() => {
          const dayMap: Record<string, { sum: number; count: number }> = {}
          allMembers.forEach((m: any) => {
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
          const targetDay = date || todayStr();
          const latestAvg = dayMap[targetDay] ? parseFloat((dayMap[targetDay].sum / dayMap[targetDay].count).toFixed(1)) : 0;
          const isGood = teamAvgMhePct <= 20

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', flex: 1.2,
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = isGood ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${isGood ? '#22C55E' : '#EF4444'}, transparent)`, opacity: 0.6, boxShadow: `0 0 20px 2px ${isGood ? '#22C55E' : '#EF4444'}` }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isGood ? '#22C55E' : '#EF4444', boxShadow: `0 0 10px ${isGood ? '#22C55E' : '#EF4444'}` }} />
                  <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>MHE Trend</div>
                </div>
                <span style={{ fontSize: '0.55rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginLeft: '8px' }}>Tap to View ▶</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvg}</span>
                <span style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#22C55E' }}>20%</span>
              </div>
            </div>
          )
        })()}

        {/* Goal vs SHB KPI Card */}
        {(() => {
          const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
          allMembers.forEach((m: any) => {
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
          const targetDay = date || todayStr();
          const latestAvgGoal = dayMap[targetDay] ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0
          const latestAvgShb = dayMap[targetDay] ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0
          
          return (
            <div
              className={styles.summaryCard}
              style={{
                background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '16px 20px', borderRadius: '16px', flex: 1.2,
                border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #3B82F6' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 10px #3B82F6' }} />
                  <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Goal vs SHB</div>
                </div>
                <span style={{ fontSize: '0.55rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginLeft: '8px' }}>Tap to View ▶</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvgGoal}</span>
                  <span style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvgShb}</span>
                  <span style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.65rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal</span>
                <span style={{ fontSize: '0.65rem', color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SHB</span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* S1: Login & Availability */}

      {/* ═══════════════ 3 CARDS: DOT | ALLOTMENT | PAX ═══════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#F4631E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Breakdown · {monthStr}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'dot' ? null : 'dot'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cmDotChartData.map((bar, i) => {
              const totalDOT = cmDotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = totalDOT > 0 ? Math.round((bar.value / totalDOT) * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                  <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${(bar.value / maxCmDotValue) * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${bar.color}40, ${bar.color}90)`,
                      borderRadius: '6px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      minWidth: bar.value > 0 ? '4px' : '0',
                    }} />
                  </div>
                  <div style={{ width: '30px', fontSize: '0.6rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
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
          onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'allotment' ? null : 'allotment'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cmAllotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: `${item.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {cmMonthlyTotalLeads > 0 ? Math.round((item.value / cmMonthlyTotalLeads) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'pax' ? null : 'pax'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cmPaxRows.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: p.color,
                  background: `${p.color}15`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {cmMonthlyTotalPax > 0 ? Math.round((p.value / cmMonthlyTotalPax) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>


        {/* ✨ Appetite & C->A Time (Monthly) ✨ */}
        <div
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'ca' ? null : 'ca'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appetite & C→A Time</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Horizontal Bar for Fulfillment % */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.64rem', color: '#8A8278', fontWeight: 600, textTransform: 'uppercase' }}>Fulfillment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cmMonthlyFulfPct >= 90 ? '#22C55E' : cmMonthlyFulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>{cmMonthlyFulfPct}%</span>
              </div>
              <div style={{ width: '100%', height: '18px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(cmMonthlyFulfPct, 100)}%`,
                  height: '100%',
                  background: cmMonthlyFulfPct >= 90 ? 'linear-gradient(90deg, #22C55E40, #22C55E90)' : cmMonthlyFulfPct >= 70 ? 'linear-gradient(90deg, #F59E0B40, #F59E0B90)' : 'linear-gradient(90deg, #EF444440, #EF444490)',
                  borderRadius: '6px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Appetite (LTA)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F4631E' }}>{cmMonthlyAppetite}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Leads Allotted</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{cmMonthlyTotalLeads}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Avg C→A Time</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{cmMonthlyAvgCA != null ? `${cmMonthlyAvgCA}m` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's9' ? null : 's9')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's9' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center' }}>
      LTA (Lead Time Availability)
      <span style={{ fontSize: '0.8rem', marginLeft: '16px', color: '#8A8278', fontWeight: 'normal', display: 'inline-flex', gap: '12px', alignItems: 'center' }}>
        <span><span style={{ color: '#E5E5E5', fontWeight: 600 }}>{globalPlannedLta}</span> Planned</span>
        <span style={{ color: '#444' }}>|</span>
        <span><span style={{ color: '#22C55E', fontWeight: 600 }}>{globalFinalLta}</span> Final</span>
      </span>
    </h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's9' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Team Planned LTA</th>
              <th>Team Final LTA</th>
              <th>Team Leads Allotted</th>
              <th>Team Fulfillment %</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => (
              <React.Fragment key={g.l2_email}>
                <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS9, expandedTlS9)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS9 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {g.l2_name}
                  </td>
                  <td>{g.agg.teamPlanned}</td>
                  <td style={{ color: '#22C55E', fontWeight: 600 }}>{g.agg.teamActual}</td>
                  <td>{g.agg.totalLeads}</td>
                  <td>{g.agg.teamActual > 0 ? Math.round((g.agg.totalLeads / g.agg.teamActual) * 100) : 0}%</td>
                </tr>

                {expandedTlS9 === g.l2_email && (
                  <tr className={styles.sellerRow}>
                    <td colSpan={5} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveFunnelTl(g); setShowTeamFunnel(true); }}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        📊 View Team Funnel
                      </button>
                    </td>
                  </tr>
                )}
                {expandedTlS9 === g.l2_email && g.members.map((m: any) => {
                  const lostPct = m.lta.planned > 0 ? (m.lta.totalLost / m.lta.planned) * 100 : 0
                  const actualColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#F59E0B' : '#EF4444'
                  return (
                    <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setActiveSellerFunnel(m)} style={{ cursor: 'pointer' }}>
                      <td style={{ paddingLeft: '32px' }}>
                        {m.seller_name}
                        
                      </td>
                      <td>{m.lta.planned}</td>
                      <td style={{ color: m.isAbsent ? 'inherit' : actualColor, fontWeight: 600 }}>
                        {m.lta.actual}
                      </td>
                      <td>{(m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)}</td>
                      <td>{m.lta.actual > 0 ? Math.round((((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) / m.lta.actual) * 100) : 0}%</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{/* S4: Appetite Fulfillment & C→A Time */ }
<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's3' ? null : 's3')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's3' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center' }}>
      RTG vs Non-RTG
      <span style={{ fontSize: '0.8rem', marginLeft: '16px', color: '#8A8278', fontWeight: 'normal', display: 'inline-flex', gap: '12px', alignItems: 'center' }}>
        <span><span style={{ color: '#E5E5E5', fontWeight: 600 }}>{globalLeads}</span> Total</span>
        <span style={{ color: '#444' }}>|</span>
        <span><span style={{ color: '#3B82F6', fontWeight: 600 }}>{globalRtg}</span> RTG</span>
        <span style={{ color: '#444' }}>|</span>
        <span><span style={{ color: '#F4631E', fontWeight: 600 }}>{globalNonRtg}</span> Non-RTG</span>
        <span style={{ color: '#444' }}>|</span>
        <span style={{ color: '#22C55E', fontWeight: 600 }}>{globalRtgPct}% RTG</span>
      </span>
    </h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's3' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Total Leads Allotted</th>
              <th>RTG</th>
              <th>Non-RTG</th>
              <th>RTG %</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => (
              <React.Fragment key={g.l2_email}>
                <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS3, expandedTlS3)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS3 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {g.l2_name}
                  </td>
                  <td>{g.agg.totalLeads}</td>
                  <td>{g.agg.totalRtg}</td>
                  <td>{g.agg.totalNonRtg}</td>
                  <td>{pct(g.agg.totalRtg, g.agg.totalLeads)}%</td>
                </tr>

                {expandedTlS3 === g.l2_email && g.members.map((m: any) => {
                  const rtg = m.allotment?.rtg_leads || 0
                  const nonRtg = m.allotment?.non_rtg_leads || 0
                  const tot = rtg + nonRtg
                  return (
                    <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                      <td style={{ paddingLeft: '32px' }}>
                        {m.seller_name}
                        
                      </td>
                      <td>{tot}</td>
                      <td>{rtg}</td>
                      <td>{nonRtg}</td>
                      <td>{pct(rtg, tot)}%</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{/* S5: Pax Bifurcation (CM EXCLUSIVE) */ }
<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's4' ? null : 's4')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's4' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}>Appetite Fulfillment & C→A Time</h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's4' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Appetite (Final LTA)</th>
              <th>Leads Allotted</th>
              <th>Fulfillment %</th>
              <th>Avg C→A (mins)</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => (
              <React.Fragment key={g.l2_email}>
                <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS4, expandedTlS4)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS4 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {g.l2_name}
                  </td>
                  <td>{g.agg.teamAppetite}</td>
                  <td>{g.agg.totalLeads}</td>
                  <td style={{ color: g.agg.teamAppetite > 0 && pct(g.agg.totalLeads, g.agg.teamAppetite) >= 90 ? '#22C55E' : g.agg.teamAppetite > 0 && pct(g.agg.totalLeads, g.agg.teamAppetite) >= 70 ? '#F59E0B' : '#EF4444' }}>
                    {g.agg.teamAppetite > 0 ? pct(g.agg.totalLeads, g.agg.teamAppetite) : 0}%
                  </td>
                  <td>{g.agg.teamMedianCA != null ? `${g.agg.teamMedianCA}m` : '—'}</td>
                </tr>

                {expandedTlS4 === g.l2_email && g.members.map((m: any) => {
                  const appetite = m.daily_lta?.final_lta || 0
                  const leads = (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)
                  const ca = m.allotment?.median_creation_to_allotment_mins
                  const fulfPct = appetite > 0 ? pct(leads, appetite) : 0
                  return (
                    <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                      <td style={{ paddingLeft: '32px' }}>
                        {m.seller_name}
                        
                      </td>
                      <td>{m.isAbsent ? '—' : appetite}</td>
                      <td>{leads}</td>
                      <td style={{ color: m.isAbsent ? 'inherit' : fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>
                        {m.isAbsent ? '—' : `${fulfPct}%`}
                      </td>
                      <td>{m.isAbsent ? '—' : ca != null ? `${Math.round(ca)}m` : '—'}</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


{/* S10: Goal % & At-Risk (data not available yet) */ }
<div style={{ marginBottom: '16px' }}>
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's1' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>Login & Availability</h2>
        </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
      </div>
      {activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Avg Login Time</th>
                  <th>Avg Break</th>
                </tr>
              </thead>
              <tbody>
                {processedGroups.map((g: any) => (
                  <React.Fragment key={g.l2_email}>
                    <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS1, expandedTlS1)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                        <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS1 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                        {g.l2_name}
                      </td>
                      <td>{g.agg.avgLoginStr}</td>
                      <td>{g.agg.tlAvgBreak}m</td>
                    </tr>
      {expandedTlS1 === g.l2_email && g.members.map((m: any) => {
        const late = isLate(m)
        return (
          <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer', ...(late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}) }}>
            <td style={{ paddingLeft: '32px' }}>
              {m.seller_name}
              
            </td>
            <td>{formatTime(m.attendance?.first_login)}</td>
            <td>{m.b.totalMinutes > 0 ? `${m.b.totalMinutes}m` : '—'}</td>
          </tr>
        )
      })}
    </React.Fragment>
  ))
}
              </tbody >
            </table >
          </div >
  { drillSellerTimeline && !activeTileTimeline && !activeBlockTimeline && (
    <div className={sellerStyles.modalOverlay} onClick={() => setDrillSellerTimeline(null)}>
      <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '700px', maxWidth: '800px', padding: 0 }}>
        <button className={sellerStyles.modalClose} onClick={() => setDrillSellerTimeline(null)}>✕</button>
        <div style={{ padding: '24px 24px 16px', background: '#111', borderRadius: '16px 16px 0 0' }}>
          <div className={sellerStyles.modalHeader} style={{ marginBottom: '8px' }}>
            <span className={sellerStyles.modalDot} style={{ background: '#F4631E' }} />
            <span className={sellerStyles.modalTitle}>{drillSellerTimeline.seller_name} — Login & Availability</span>
          </div>
          <div style={{ color: '#8A8278', fontSize: '0.8rem', marginBottom: '16px' }}>Click on a metric to view exact timeline details.</div>
          <div className={styles.kpiRow} style={{ margin: 0, padding: 0 }}>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('keka')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Keka Login</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.attendance?.first_login)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('orbit')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Orbit Login</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.orbit?.first_login)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('ozontell')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Ozontell Ready</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.cti?.logged_in_at)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('first')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>First Lead</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.allotment?.first_lead_allotted_at_ist)}</span>
            </div>
            <div className={styles.kpiItem} style={{ flex: 1 }}>
              <span className={styles.kpiLabel}>Total Break</span>
              <span className={styles.kpiValue}>{parseBreaks(drillSellerTimeline.attendance?.break_timestamps).totalMinutes}m</span>
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

              const kekaTime = drillSellerTimeline.attendance?.first_login;
              const orbitTime = (drillSellerTimeline as any)?.orbit?.first_login || null;
              const lastLogout = drillSellerTimeline.attendance?.last_logout;
              const finalLtaVal = drillSellerTimeline.daily_lta?.final_lta || 0;

              const firstLoginMin = kekaTime ? (extractTimeParts(kekaTime)?.h || 0) * 60 + (extractTimeParts(kekaTime)?.m || 0) : null;
              const lastLogoutMin = lastLogout ? (extractTimeParts(lastLogout)?.h || 0) * 60 + (extractTimeParts(lastLogout)?.m || 0) : null;

              let runningLeads = 0;
              let time50: number | null = null;
              let time100: number | null = null;
              const target50 = finalLtaVal / 2;
              const target100 = finalLtaVal;

              const hourlyData = drillSellerTimeline.hourly || [];
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
            <div className={sellerStyles.timelineBlocksRow}>
              {(() => {
                const timelineStartMin = 9 * 60;
                const timelineEndMin = 21 * 60;
                const boundaries = new Set<number>();
                for (let m = timelineStartMin; m <= timelineEndMin; m += 60) boundaries.add(m);

                const orbitTime = (drillSellerTimeline as any)?.orbit?.first_login || null;
                const breaks = parseBreaks(drillSellerTimeline.attendance?.break_timestamps);
                const readyWindows = parseReadyWindows(drillSellerTimeline.cti?.logged_in_at ? `${drillSellerTimeline.cti.logged_in_at}-${drillSellerTimeline.attendance?.last_logout || new Date().toISOString()}` : null);
                const actualReadyWindows = parseReadyWindows(drillSellerTimeline.cti?.ready_timestamps);
                const finalReadyWindows = drillSellerTimeline.cti?.ready_timestamps ? actualReadyWindows : readyWindows;

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

                const hourlyData = drillSellerTimeline.hourly || [];
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

                  const isOrbitOnly = !!orbitTime && isBreak && isReady;
                  const eligible = (!isBreak && isReady) || isOrbitOnly;
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
                        onClick={() => setActiveBlockTimeline({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: seg.isLateAllocation, isReady: seg.isReady })}
                      >
                        {seg.widthPercent >= 3 ? (
                          seg.leads > 0 ? (
                            <>
                              <span className={sellerStyles.blockLeadCount}>{seg.leads}</span>
                              {seg.isBreak && !seg.eligible && <span className={sellerStyles.blockBreakText}>BREAK</span>}
                            </>
                          ) : (
                            seg.isBreak && seg.widthPercent >= 6 ? <span className={sellerStyles.blockBreakText} style={{ marginTop: 0 }}>BREAK</span> : null
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

        </div >
      )}

{/* S2: Break / Unavailability */ }
<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's2' ? null : 's2')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's2' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}>Break / Unavailability</h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's2' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Total Team Break</th>
              <th>Instances</th>
              <th>Longest Break (Max)</th>
              <th>Avg Break %</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => (
              <React.Fragment key={g.l2_email}>
                <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS2, expandedTlS2)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS2 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {g.l2_name}
                  </td>
                  <td>{g.agg.tlTotalBreak}m</td>
                  <td>{g.agg.tlTotalBreakCount}</td>
                  <td>{g.agg.tlLongestBreak}m</td>
                  <td>{g.agg.onlineCount > 0 ? Math.round((g.agg.tlTotalBreak / (g.agg.onlineCount * 9 * 60)) * 100) : 0}%</td>
                </tr>

                {expandedTlS2 === g.l2_email && g.members.map((m: any) => (
                  <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                    <td style={{ paddingLeft: '32px' }}>
                      {m.seller_name}
                      
                    </td>
                    <td style={{ color: m.b.totalMinutes > 75 ? '#EF4444' : 'inherit' }}>{m.b.totalMinutes > 0 ? `${m.b.totalMinutes}m` : '—'}</td>
                    <td>{m.b.count > 0 ? m.b.count : '—'}</td>
                    <td>{m.b.longestMinutes > 0 ? `${m.b.longestMinutes}m` : '—'}</td>
                    <td>{m.isAbsent ? '—' : `${Math.round((m.b.totalMinutes / (9 * 60)) * 100)}%`}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{/* S3: RTG vs Non-RTG */ }
<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's5' ? null : 's5')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's5' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}>Pax Bifurcation</h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's5' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>1-Pax</th>
              <th>2-Pax</th>
              <th>3-Pax</th>
              <th>4-Pax</th>
              <th>4+ Pax</th>
              <th>Total Pax</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => (
              <React.Fragment key={g.l2_email}>
                <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS5, expandedTlS5)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                  <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                    <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS5 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                    {g.l2_name}
                  </td>
                  <td>{g.agg.pax1}</td>
                  <td>{g.agg.pax2}</td>
                  <td>{g.agg.pax3}</td>
                  <td>{g.agg.pax4}</td>
                  <td>{g.agg.pax4Plus}</td>
                  <td style={{ color: '#F4631E', fontWeight: 600 }}>{g.agg.totalPax}</td>
                </tr>

                {expandedTlS5 === g.l2_email && g.members.map((m: any) => {
                  const p1 = m.allotment?.pax_1 || 0
                  const p2 = m.allotment?.pax_2 || 0
                  const p3 = m.allotment?.pax_3 || 0
                  const p4 = m.allotment?.pax_4 || 0
                  const p4plus = m.allotment?.pax_4_plus || 0
                  const tot = p1 + p2 + p3 + p4 + p4plus
                  return (
                    <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                      <td style={{ paddingLeft: '32px' }}>
                        {m.seller_name}
                        
                      </td>
                      <td>{p1}</td>
                      <td>{p2}</td>
                      <td>{p3}</td>
                      <td>{p4}</td>
                      <td>{p4plus}</td>
                      <td style={{ color: '#F4631E' }}>{tot}</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

{/* S7: First Lead Received Time (CM EXCLUSIVE) */ }
<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's7_cm' ? null : 's7_cm')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's7_cm' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}>First Lead Received Time</h2>
  </div>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
</div>
{
  activeSectionModal === 's7_cm' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Avg First Lead Time</th>
              <th>Sellers Got Leads</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => {
              const withLeads = g.members.filter((m: any) => parseFirstLead(m) !== null)
              const totalFLMins = withLeads.reduce((s: number, m: any) => s + parseFirstLead(m)!, 0)
              const avgFLMins = withLeads.length > 0 ? Math.round(totalFLMins / withLeads.length) : null
              let avgFLStr = '—'
              if (avgFLMins !== null) {
                const h = Math.floor(avgFLMins / 60)
                const m = avgFLMins % 60
                const ampm = h >= 12 ? 'pm' : 'am'
                const h12 = h % 12 || 12
                avgFLStr = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
              }

              return (
                <React.Fragment key={g.l2_email}>
                  <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS7, expandedTlS7)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                      <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS7 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {g.l2_name}
                    </td>
                    <td>{avgFLStr}</td>
                    <td>{withLeads.length} / {g.agg.onlineCount}</td>
                  </tr>

                  {expandedTlS7 === g.l2_email && g.members.map((m: any) => {
                    const tStr = formatTime(m.allotment?.first_lead_allotted_at_ist)
                    return (
                      <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                        <td style={{ paddingLeft: '32px' }}>
                          {m.seller_name}
                          
                        </td>
                        <td>{m.isAbsent ? '—' : tStr}</td>
                        <td>—</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

</div>


{/* Team Funnel Modal */ }
{
  showTeamFunnel && activeFunnelTl && (
    <div className={sellerStyles.modalOverlay} onClick={() => setShowTeamFunnel(false)}>
      <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
        <button className={sellerStyles.modalClose} onClick={() => setShowTeamFunnel(false)}>✕</button>
        <div className={sellerStyles.modalHeader}>
          <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
          <span className={sellerStyles.modalTitle}>{activeFunnelTl.l2_name} — LTA Funnel</span>
        </div>

        <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradTeamL1)" opacity="0.08" />
            <defs>
              <linearGradient id="funnelGradTeamL1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
          </svg>
          <div className={sellerStyles.ltaFunnelStack}>
            {(() => {
              const mList = activeFunnelTl.members || [];
              const tfPlanned = mList.reduce((sum: number, m: any) => sum + m.lta.planned, 0);
              const tfDynLta = mList.reduce((sum: number, m: any) => sum + m.lta.dynLta, 0);
              const tfHygLta = mList.reduce((sum: number, m: any) => sum + m.lta.hygLta, 0);
              const tfRev1Lta = mList.reduce((sum: number, m: any) => sum + m.lta.rev1Lta, 0);
              const tfActual = mList.reduce((sum: number, m: any) => sum + m.lta.actual, 0);

              const tfDynLost = mList.reduce((sum: number, m: any) => sum + m.lta.dynLost, 0);
              const tfHygLost = mList.reduce((sum: number, m: any) => sum + m.lta.hygLost, 0);
              const tfRev1Lost = mList.reduce((sum: number, m: any) => sum + m.lta.rev1Lost, 0);
              const tfRev2Lost = mList.reduce((sum: number, m: any) => sum + m.lta.rev2Lost, 0);

              const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
              const stages = [
                { id: 'planned', label: 'TEAM PLANNED', value: tfPlanned, color: '#3B82F6', dropText: getFunnelDropText(tfDynLost, 'Dynamic'), width: '100%' },
                { id: 'dynamic', label: 'TEAM DYNAMIC', value: tfDynLta, color: '#EAB308', dropText: getFunnelDropText(tfHygLost, 'Hygiene'), width: '85%' },
                { id: 'hygiene', label: 'TEAM HYGIENE', value: tfHygLta, color: '#F97316', dropText: getFunnelDropText(tfRev1Lost, 'Goal Complete'), width: '70%' },
                { id: 'goalComplete', label: 'TEAM GOAL COMPLETE', value: tfRev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(tfRev2Lost, 'Final'), width: '60%' },
                { id: 'final', label: 'TEAM FINAL', value: tfActual, color: '#22C55E', dropText: null, width: '50%' },
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
  )
}
{/* Individual Seller Funnel Modal */ }
{
  activeSellerFunnel && (
    <div className={sellerStyles.modalOverlay} onClick={() => setActiveSellerFunnel(null)}>
      <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '550px', width: '600px' }}>
        <button className={sellerStyles.modalClose} onClick={() => setActiveSellerFunnel(null)}>✕</button>
        <div className={sellerStyles.modalHeader}>
          <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
          <span className={sellerStyles.modalTitle}>{activeSellerFunnel.seller_name} — LTA Funnel</span>
        </div>

        <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', width: '100%', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
          <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradL1)" opacity="0.08" />
            <defs>
              <linearGradient id="funnelGradL1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
          </svg>
          <div className={sellerStyles.ltaFunnelStack}>
            {(() => {
              const lta = activeSellerFunnel.lta;
              const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
              const stages = [
                { id: 'planned', label: 'PLANNED LTA', value: lta.planned, color: '#3B82F6', dropText: getFunnelDropText(lta.dynLost, 'Dynamic'), width: '100%' },
                { id: 'dynamic', label: 'DYNAMIC LTA', value: lta.dynLta, color: '#EAB308', dropText: getFunnelDropText(lta.hygLost, 'Hygiene'), width: '88%' },
                { id: 'hygiene', label: 'HYGIENE LTA', value: lta.hygLta, color: '#F97316', dropText: getFunnelDropText(lta.rev1Lost, 'Goal Complete'), width: '74%' },
                { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: lta.rev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(lta.rev2Lost, 'Final'), width: '62%' },
                { id: 'final', label: 'FINAL LTA', value: lta.actual, color: '#22C55E', dropText: null, width: '50%' },
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
  )
}

</div >
  )
}
