'use client'

import React, { useState, useEffect } from 'react'
import { UserSession } from '@/lib/session'
import styles from './L1SellerViewPage.module.css'
import sellerStyles from './SellerViewPage.module.css'
import SellerViewPage from './SellerViewPage'

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

export default function L1SellerViewPage({ session }: { session: UserSession }) {
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
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
  const [expandedTlS10, setExpandedTlS10] = useState<string | null>(null)

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

  if (loading) return <div className={styles.page}>Loading CM dashboard...</div>

  const pct = (v: number, t: number) => t > 0 ? Math.round((v / t) * 100) : 0

  // Process data for each TL group
  const processedGroups = l2Groups.map((g: any) => {
    let members = g.members || []
    
    members = members.map((m: any) => {
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
    
    const teamPlanned = members.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : m.lta.planned), 0)
    const teamActual = members.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : m.lta.actual), 0)

    const noLeadsCount = members.filter((m: any) => ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0).length

    // S1 specific
    const tlTotalBreak = members.reduce((s:number, m:any) => s + m.b.totalMinutes, 0)
    const tlTotalBreakCount = members.reduce((s:number, m:any) => s + m.b.count, 0)
    const tlLongestBreak = members.reduce((s:number, m:any) => Math.max(s, m.b.longestMinutes), 0)
    
    const tlAvgBreak = members.length > 0 ? Math.round(tlTotalBreak / members.length) : 0
    const totalLoginMins = members.reduce((s:number, m:any) => {
        const p = parseLogin(m)
        return s + (p !== null ? p : 0)
    }, 0)
    const validLogins = members.filter((m:any) => parseLogin(m) !== null).length
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
    const pax1 = members.reduce((s:number, m:any) => s + (m.allotment?.pax_1 || 0), 0)
    const pax2 = members.reduce((s:number, m:any) => s + (m.allotment?.pax_2 || 0), 0)
    const pax3 = members.reduce((s:number, m:any) => s + (m.allotment?.pax_3 || 0), 0)
    const pax4 = members.reduce((s:number, m:any) => s + (m.allotment?.pax_4 || 0), 0)
    const pax4Plus = members.reduce((s:number, m:any) => s + (m.allotment?.pax_4_plus || 0), 0)
    const totalPax = pax1 + pax2 + pax3 + pax4 + pax4Plus

    // S4: Appetite (final_lta) & C→A time (median_creation_to_allotment_mins)
    const teamAppetite = members.reduce((s:number, m:any) => s + (m.isAbsent ? 0 : (m.daily_lta?.final_lta || 0)), 0)
    const caVals = members.filter((m:any) => !m.isAbsent && m.allotment?.median_creation_to_allotment_mins != null).map((m:any) => m.allotment.median_creation_to_allotment_mins)
    const teamMedianCA = caVals.length > 0 ? Math.round(caVals.reduce((s:number, v:number) => s + v, 0) / caVals.length) : null

    // S6: DOT Month Distribution
    const dotMap: Record<string, number> = {}
    members.forEach((m:any) => {
      (m.dot_rows || []).forEach((d:any) => {
        const month = d.dot_month || 'Unknown'
        dotMap[month] = (dotMap[month] || 0) + (d.total_leads_allotted || 0)
      })
    })

    // S8: MHE %
    const mheMembers = members.filter((m:any) => !m.isAbsent && m.daily_lta)
    const teamMishandled = mheMembers.reduce((s:number, m:any) => s + (m.daily_lta?.mishandled_enquiries || 0), 0)
    const teamOpenEnq = mheMembers.reduce((s:number, m:any) => s + (m.daily_lta?.open_enquiries || 0), 0)
    const teamMhePct = mheMembers.length > 0
      ? (mheMembers.reduce((s:number, m:any) => s + (m.daily_lta?.mishandled_pct || 0), 0) / mheMembers.length)
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
            {session.name} &middot; {date === new Date().toISOString().split('T')[0] ? 'Today' : date}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className={styles.controls} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className={`${styles.filterBtn} ${date === new Date().toISOString().split('T')[0] ? styles.activeFilter : ''}`} 
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              style={{ background: date === new Date().toISOString().split('T')[0] ? 'rgba(244, 99, 30, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: date === new Date().toISOString().split('T')[0] ? '#F4631E' : '#8A8278', border: date === new Date().toISOString().split('T')[0] ? '1px solid #F4631E' : '1px solid #333', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Today
            </button>
            <div className={styles.datePicker}>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                max={new Date().toISOString().split('T')[0]} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #333', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{globalLeads}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Total Leads</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#E5E7EB', margin: '0 0 2px 0' }}>{globalAuto}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Auto</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#9CA3AF', margin: '0 0 2px 0' }}>{globalManual}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Manual</p>
          </div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{globalRtgPct}%</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG %</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#378ADD', margin: '0 0 2px 0' }}>{globalRtg}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG Count</p>
          </div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: globalNoLeads > 0 ? 'pointer' : 'default' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>{globalNoLeads}</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Sellers with no leads yet</p>
        </div>
      </div>

      {/* S1: Login & Availability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's1' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S1 · Login & Availability</h2>
        </div>
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
                          <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} style={late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}}>
                            <td style={{ paddingLeft: '32px' }}>
                              {m.seller_name}
                              {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                            </td>
                            <td>{m.isAbsent ? '—' : formatTime(m.attendance?.first_login)}</td>
                            <td>{m.isAbsent ? '—' : `${m.b.totalMinutes}m`}</td>
                            <td>—</td>
                          </tr>
                        )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S2: Break / Unavailability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's2' ? null : 's2')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's2' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S2 · Break / Unavailability</h2>
        </div>
      </div>
      {activeSectionModal === 's2' && (
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
                      <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                        <td style={{ paddingLeft: '32px' }}>
                          {m.seller_name}
                          {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                        </td>
                        <td style={{color: m.b.totalMinutes > 75 ? '#EF4444' : 'inherit'}}>{m.isAbsent ? '—' : `${m.b.totalMinutes}m`}</td>
                        <td>{m.isAbsent ? '—' : m.b.count}</td>
                        <td>{m.isAbsent ? '—' : `${m.b.longestMinutes}m`}</td>
                        <td>{m.isAbsent ? '—' : `${Math.round((m.b.totalMinutes / (9*60))*100)}%`}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S3: RTG vs Non-RTG */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's3' ? null : 's3')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's3' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S3 · RTG vs Non-RTG</h2>
        </div>
      </div>
      {activeSectionModal === 's3' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Total Leads</th>
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
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
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
      )}
      
      {/* S5: Pax Bifurcation (CM EXCLUSIVE) */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's5' ? null : 's5')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's5' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S5 · Pax Bifurcation (CM View Exclusive)</h2>
        </div>
      </div>
      {activeSectionModal === 's5' && (
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
                      <td style={{color: '#F4631E', fontWeight: 600}}>{g.agg.totalPax}</td>
                    </tr>
                    
                    {expandedTlS5 === g.l2_email && g.members.map((m: any) => {
                      const p1 = m.allotment?.pax_1 || 0
                      const p2 = m.allotment?.pax_2 || 0
                      const p3 = m.allotment?.pax_3 || 0
                      const p4 = m.allotment?.pax_4 || 0
                      const p4plus = m.allotment?.pax_4_plus || 0
                      const tot = p1 + p2 + p3 + p4 + p4plus
                      return (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{p1}</td>
                          <td>{p2}</td>
                          <td>{p3}</td>
                          <td>{p4}</td>
                          <td>{p4plus}</td>
                          <td style={{color: '#F4631E'}}>{tot}</td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S7: First Lead Received Time (CM EXCLUSIVE) */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's7_cm' ? null : 's7_cm')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's7_cm' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S7 · First Lead Received Time (CM View Exclusive)</h2>
        </div>
      </div>
      {activeSectionModal === 's7_cm' && (
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
                  const withLeads = g.members.filter((m:any) => parseFirstLead(m) !== null)
                  const totalFLMins = withLeads.reduce((s:number, m:any) => s + parseFirstLead(m)!, 0)
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
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{m.isAbsent ? '—' : tStr}</td>
                          <td>—</td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S9: Lead Time Availability (LTA) */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's9' ? null : 's9')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's9' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S9 · LTA (Lead Time Availability)</h2>
        </div>
      </div>
      {activeSectionModal === 's9' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Team Planned LTA</th>
                  <th>Team Final LTA</th>
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
                      <td style={{color: '#22C55E', fontWeight: 600}}>{g.agg.teamActual}</td>
                    </tr>
                    
                    {expandedTlS9 === g.l2_email && g.members.map((m: any) => {
                      const lostPct = m.lta.planned > 0 ? (m.lta.totalLost / m.lta.planned) * 100 : 0
                      const actualColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#F59E0B' : '#EF4444'
                      return (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{m.isAbsent ? '—' : m.lta.planned}</td>
                          <td style={{color: m.isAbsent ? 'inherit' : actualColor, fontWeight: 600}}>
                            {m.isAbsent ? '—' : m.lta.actual}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S4: Appetite Fulfillment & C→A Time */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's4' ? null : 's4')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's4' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S4 · Appetite Fulfillment & C→A Time</h2>
        </div>
      </div>
      {activeSectionModal === 's4' && (
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
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
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
      )}

      {/* S6: DOT Month Distribution */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's6' ? null : 's6')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's6' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S6 · DOT Month Distribution</h2>
        </div>
      </div>
      {activeSectionModal === 's6' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  {(() => {
                    const allMonths = new Set<string>()
                    processedGroups.forEach((g: any) => Object.keys(g.agg.dotMap).forEach(k => allMonths.add(k)))
                    return Array.from(allMonths).sort().map(m => <th key={m}>{m}</th>)
                  })()}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allMonths = new Set<string>()
                  processedGroups.forEach((g: any) => Object.keys(g.agg.dotMap).forEach(k => allMonths.add(k)))
                  const sortedMonths = Array.from(allMonths).sort()
                  
                  return processedGroups.map((g: any) => (
                    <React.Fragment key={g.l2_email}>
                      <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS6, expandedTlS6)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                        <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                          <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS6 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                          {g.l2_name}
                        </td>
                        {sortedMonths.map(mo => (
                          <td key={mo} style={{ color: '#F4631E', fontWeight: 600 }}>{g.agg.dotMap[mo] || 0}</td>
                        ))}
                      </tr>
                      
                      {expandedTlS6 === g.l2_email && g.members.map((m: any) => {
                        const sellerDot: Record<string, number> = {}
                        ;(m.dot_rows || []).forEach((d: any) => {
                          sellerDot[d.dot_month || 'Unknown'] = (sellerDot[d.dot_month || 'Unknown'] || 0) + (d.total_leads_allotted || 0)
                        })
                        return (
                          <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                            <td style={{ paddingLeft: '32px' }}>
                              {m.seller_name}
                              {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                            </td>
                            {sortedMonths.map(mo => (
                              <td key={mo}>{m.isAbsent ? '—' : (sellerDot[mo] || 0)}</td>
                            ))}
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  ))
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S8: MHE % (Mishandled Enquiries) */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's8' ? null : 's8')}>
        <div className={styles.headerLeft}>
          <span className={styles.chevron} style={{ transform: activeSectionModal === 's8' ? 'rotate(90deg)' : 'none' }}>▶</span>
          <h2 className={styles.sectionTitle}>S8 · MHE % (Mishandled Enquiries)</h2>
        </div>
      </div>
      {activeSectionModal === 's8' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Mishandled</th>
                  <th>Open Enquiries</th>
                  <th>MHE %</th>
                </tr>
              </thead>
              <tbody>
                {processedGroups.map((g: any) => (
                  <React.Fragment key={g.l2_email}>
                    <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS8, expandedTlS8)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                        <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS8 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                        {g.l2_name}
                      </td>
                      <td>{g.agg.teamMishandled}</td>
                      <td>{g.agg.teamOpenEnq}</td>
                      <td style={{ color: g.agg.teamMhePct > 20 ? '#EF4444' : g.agg.teamMhePct > 10 ? '#F59E0B' : '#22C55E', fontWeight: 600 }}>
                        {Math.round(g.agg.teamMhePct)}%
                      </td>
                    </tr>
                    
                    {expandedTlS8 === g.l2_email && g.members.map((m: any) => {
                      const mh = m.daily_lta?.mishandled_enquiries || 0
                      const oe = m.daily_lta?.open_enquiries || 0
                      const mhPct = m.daily_lta?.mishandled_pct || 0
                      return (
                        <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`}>
                          <td style={{ paddingLeft: '32px' }}>
                            {m.seller_name}
                            {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                          </td>
                          <td>{m.isAbsent ? '—' : mh}</td>
                          <td>{m.isAbsent ? '—' : oe}</td>
                          <td style={{ color: m.isAbsent ? 'inherit' : mhPct > 20 ? '#EF4444' : mhPct > 10 ? '#F59E0B' : '#22C55E', fontWeight: 600 }}>
                            {m.isAbsent ? '—' : `${Math.round(mhPct)}%`}
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* S10: Goal % & At-Risk (data not available yet) */}
      <div style={{marginBottom: '16px'}}>
        <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's10' ? null : 's10')}>
          <div className={styles.headerLeft}>
            <span className={styles.chevron} style={{ transform: activeSectionModal === 's10' ? 'rotate(90deg)' : 'none' }}>▶</span>
            <h2 className={styles.sectionTitle}>S10 · Goal % & At-Risk</h2>
          </div>
        </div>
        {activeSectionModal === 's10' && (
          <div className={sellerStyles.sectionContent}>
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8A8278', fontStyle: 'italic' }}>
              Goal % data not available yet
            </div>
          </div>
        )}
      </div>
      
    </div>
  )
}
