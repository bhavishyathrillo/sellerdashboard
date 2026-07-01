'use client'

import { useState, useEffect } from 'react'
import { UserSession } from '@/lib/session'
import styles from './L2SellerViewPage.module.css'
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

function isHourInBreak(hourLabel: string, windows: BreakWindow[]): boolean {
  if (!windows.length) return false
  const m = hourLabel.match(/^(\d+)(AM|PM)$/i); if (!m) return false
  let h = parseInt(m[1], 10); if (m[2].toUpperCase() === 'PM' && h !== 12) h += 12; if (m[2].toUpperCase() === 'AM' && h === 12) h = 0
  return windows.some(w => {
    const eH = w.endH + (w.endM > 0 ? 1 : 0)
    return h >= w.startH && h < eH
  })
}

// Mock data generator for LTA funnel (as instructed by the spec for missing schema fields)
function getMockLtaData(sellerName: string) {
  const seed = sellerName.charCodeAt(0) % 10;
  const planned = 40 + seed * 2;
  const dynLost = Math.floor(planned * (0.05 + (seed % 3) * 0.02));
  const dynLta = planned - dynLost;
  const hygLost = Math.floor(dynLta * (0.02 + (seed % 2) * 0.03));
  const hygLta = dynLta - hygLost;
  const rev1Lost = Math.floor(hygLta * (0.04 + (seed % 4) * 0.01));
  const rev1Lta = hygLta - rev1Lost;
  const rev2Lost = Math.floor(rev1Lta * 0.02);
  const actual = rev1Lta - rev2Lost;
  
  return {
    planned,
    dynLost, dynLta,
    hygLost, hygLta,
    rev1Lost, rev1Lta,
    rev2Lost, actual,
    totalLost: dynLost + hygLost + rev1Lost + rev2Lost
  }
}

export default function L2SellerViewPage({ session }: { session: UserSession }) {
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('team')
  const [teamData, setTeamData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })
  
  // Section Collapse State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const toggleSection = (id: string) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  
  // Drill-down states
  const [drillSellerS1, setDrillSellerS1] = useState<any>(null)
  const [drillSellerS2, setDrillSellerS2] = useState<any>(null)
  const [drillSellerS3, setDrillSellerS3] = useState<any>(null)
  const [drillSellerS7, setDrillSellerS7] = useState<any>(null)
  const [drillSellerS8, setDrillSellerS8] = useState<any>(null)

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
    return (
      <div className={styles.page} style={{ paddingTop: '16px', paddingBottom: 0 }}>
        {members.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div className={styles.toggleContainer}>
              <button className={`${styles.toggleBtn} ${viewMode === 'personal' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('personal')}>Personal</button>
              <button className={`${styles.toggleBtn} ${viewMode === 'team' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('team')}>My Team</button>
            </div>
          </div>
        )}
        {/* We reuse the exact SellerViewPage completely isolated */}
        <div style={{ margin: '-24px' }}>
          <SellerViewPage session={session} />
        </div>
      </div>
    )
  }

  if (loading) return <div className={styles.page}>Loading TL dashboard...</div>

  
  // Make sure the TL is in the members list if not already (backend usually does, but just in case)
  let enrichedMembers = members.map((m: any) => ({
    ...m,
    isAbsent: false, // In a real scenario, check Keka login
    lta: m.lta || getMockLtaData(m.seller_name)
  }))
  
  const teamPlanned = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : m.lta.planned), 0)
  const teamActual = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : m.lta.actual), 0)
  const teamLost = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : m.lta.totalLost), 0)
  
  // Real Top Summary Metrics
  const totalRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : (m.allotment?.rtg_leads || 0)), 0)
  const totalNonRtg = enrichedMembers.reduce((sum: number, m: any) => sum + (m.isAbsent ? 0 : (m.allotment?.non_rtg_leads || 0)), 0)
  const totalLeads = totalRtg + totalNonRtg
  const absentCount = enrichedMembers.filter((m: any) => m.isAbsent).length
  const onlineCount = enrichedMembers.length - absentCount
  const noLeadsCount = enrichedMembers.filter((m: any) => !m.isAbsent && ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0).length
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>TL Lead Allocation Dashboard</h1>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className={styles.toggleContainer}>
            <button className={`${styles.toggleBtn} ${viewMode === 'personal' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('personal')}>Personal</button>
            <button className={`${styles.toggleBtn} ${viewMode === 'team' ? styles.toggleBtnActive : ''}`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
          </div>
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

      <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #F59E0B', padding: '12px 16px', borderRadius: '4px', marginBottom: '12px', fontSize: '0.85rem' }}>
        <strong>Alert:</strong> Late logins — None
      </div>
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #EF4444', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '0.85rem' }}>
        <strong>Alert:</strong> Below 70% Goal — None
      </div>

      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>0</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Total Leads</p>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>0%</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Team RTG %</p>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>0 / 0</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Online Now</p>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>0</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>No Leads Yet</p>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333' }}>
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>0 / 0</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>At Risk / Absent</p>
        </div>
      </div>


      {/* S1: Login & Availability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => toggleSection('s1')}>
        <div className={styles.headerLeft}>
          <span className={`${styles.chevron} ${openSections['s1'] ? styles.chevronOpen : ''}`}>▶</span>
          <h2 className={styles.sectionTitle}>S1 · Login & Availability</h2>
        </div>
      </div>
      {openSections['s1'] && (
        <div className={styles.sectionContent}>
          {drillSellerS1 ? (
            <div className={styles.drillDownContainer}>
              <div className={styles.drillHeader}>
                <h3 className={styles.drillTitle}>{drillSellerS1.seller_name} — Login & Availability</h3>
                <button className={styles.backBtn} onClick={() => setDrillSellerS1(null)}>← Back to team</button>
              </div>
              <div className={styles.kpiRow}>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Keka Login</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.attendance?.first_login)}</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Ozontell Ready</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.cti?.logged_in_at)}</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>First Lead</span>
                  <span className={styles.kpiValue}>{formatTime(drillSellerS1.allotment?.first_lead_allotted_at_ist)}</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Total Break</span>
                  <span className={styles.kpiValue}>{parseBreaks(drillSellerS1.attendance?.break_timestamps).totalMinutes}m</span>
                </div>
              </div>
              <div className={styles.timelineWrapper}>
                <div className={styles.timelineGrid}>
                  {HOUR_SLOTS.slice(0,12).map((_, i) => (
                    <div key={i} className={`${styles.timelineBlock} ${i===2 ? styles.blockBreak : i%3===0 ? styles.blockLeadReceived : styles.blockEligibleNoLead}`} />
                  ))}
                </div>
                <div className={styles.timelineLabels}>
                  {HOUR_SLOTS.slice(0,12).map((h, i) => <div key={i} className={styles.timeLabel}>{h}</div>)}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Keka Login</th>
                    <th>Ready Time</th>
                    <th>Delta</th>
                    <th>First Lead</th>
                    <th>Total Break</th>
                    <th>Break %</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedMembers.slice().sort((a,b) => (parseLogin(a) || 9999) - (parseLogin(b) || 9999)).map((m: any) => {
                    const late = isLate(m)
                    const b = parseBreaks(m.attendance?.break_timestamps)
                    const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at)
                    return (
                      <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} style={late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}} onClick={() => setDrillSellerS1(m)}>
                        <td>
                          {m.seller_name}
                          {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
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
          )}
        </div>
      )}

      {/* S2: Break / Unavailability */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => toggleSection('s2')}>
        <div className={styles.headerLeft}>
          <span className={`${styles.chevron} ${openSections['s2'] ? styles.chevronOpen : ''}`}>▶</span>
          <h2 className={styles.sectionTitle}>S2 · Break / Unavailability</h2>
        </div>
      </div>
      {openSections['s2'] && (
        <div className={styles.sectionContent}>
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
                  {enrichedMembers.map((m: any) => ({ ...m, b: parseBreaks(m.attendance?.break_timestamps) })).sort((a: any,b: any) => b.b.totalMinutes - a.b.totalMinutes).map((m: any) => (
                    <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerS2(m)}>
                      <td>
                        {m.seller_name}
                        {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
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
      <div className={styles.sectionHeaderCollapsible} onClick={() => toggleSection('s3')}>
        <div className={styles.headerLeft}>
          <span className={`${styles.chevron} ${openSections['s3'] ? styles.chevronOpen : ''}`}>▶</span>
          <h2 className={styles.sectionTitle}>S3 · RTG vs Non-RTG</h2>
        </div>
      </div>
      {openSections['s3'] && (
        <div className={styles.sectionContent}>
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
                {enrichedMembers.map((m: any) => {
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
      <div className={styles.sectionHeaderCollapsible} onClick={() => toggleSection('s7')}>
        <div className={styles.headerLeft}>
          <span className={`${styles.chevron} ${openSections['s7'] ? styles.chevronOpen : ''}`}>▶</span>
          <h2 className={styles.sectionTitle}>S7 · LTA (Lead Time Availability)</h2>
        </div>
      </div>
      {openSections['s7'] && (
        <div className={styles.sectionContent}>

        {drillSellerS7 ? (
          <div className={styles.drillDownContainer}>
            <div className={styles.drillHeader}>
              <h3 className={styles.drillTitle}>{drillSellerS7.seller_name} — LTA Funnel</h3>
              <button className={styles.backBtn} onClick={() => setDrillSellerS7(null)}>← Back to team</button>
            </div>
            
            <div className={styles.funnelContainer}>
              <div className={styles.funnelLevel}>
                <div className={styles.funnelBox}>
                  <div className={styles.funnelLabel}>Planned LTA</div>
                  <div className={styles.funnelCount}>{drillSellerS7.lta.planned}</div>
                </div>
                <div className={styles.funnelConnector} />
                <div className={styles.lostConnector} />
                <div className={styles.lostLabel}>Lost to dynamic overallocation: {drillSellerS7.lta.dynLost} leads</div>
              </div>
              
              <div className={styles.funnelLevel}>
                <div className={styles.funnelBox}>
                  <div className={styles.funnelLabel}>Dynamic LTA</div>
                  <div className={styles.funnelCount}>{drillSellerS7.lta.dynLta}</div>
                </div>
                <div className={styles.funnelConnector} />
                <div className={styles.lostConnector} />
                <div className={styles.lostLabel}>Lost to hygiene violations: {drillSellerS7.lta.hygLost} leads</div>
              </div>

              <div className={styles.funnelLevel}>
                <div className={styles.funnelBox}>
                  <div className={styles.funnelLabel}>Hygiene LTA</div>
                  <div className={styles.funnelCount}>{drillSellerS7.lta.hygLta}</div>
                </div>
                <div className={styles.funnelConnector} />
                <div className={styles.lostConnector} />
                <div className={styles.lostLabel}>Lost to MHE + Goal + Avail: {drillSellerS7.lta.rev1Lost} leads</div>
              </div>

              <div className={styles.funnelLevel}>
                <div className={styles.funnelBox}>
                  <div className={styles.funnelLabel}>Revised LTA 1</div>
                  <div className={styles.funnelCount}>{drillSellerS7.lta.rev1Lta}</div>
                </div>
                <div className={styles.funnelConnector} />
                <div className={styles.lostConnector} />
                <div className={styles.lostLabel}>Lost to overallocation adjust: {drillSellerS7.lta.rev2Lost} leads</div>
              </div>

              <div className={styles.funnelLevel}>
                <div className={styles.funnelBox} style={{ border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                  <div className={styles.funnelLabel}>Revised LTA 2 (Final Actual)</div>
                  <div className={styles.funnelCount} style={{color: '#22C55E'}}>{drillSellerS7.lta.actual}</div>
                </div>
              </div>
              
              <div style={{marginTop: '32px', fontSize: '0.85rem', color: '#8A8278', textAlign: 'center'}}>
                Total lost: <strong style={{color: '#EF4444'}}>{drillSellerS7.lta.totalLost} leads</strong> ({((drillSellerS7.lta.totalLost / drillSellerS7.lta.planned) * 100).toFixed(1)}%)
                <br />
                Planned {drillSellerS7.lta.planned} → Actual {drillSellerS7.lta.actual}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.kpiRow}>
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>Team Planned LTA</span>
                <span className={styles.kpiValue}>{teamPlanned}</span>
              </div>
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>Team Actual LTA</span>
                <span className={styles.kpiValue}>{teamActual}</span>
              </div>
              <div className={styles.kpiItem}>
                <span className={styles.kpiLabel}>Total Leads Lost</span>
                <span className={styles.kpiValue} style={{color: '#EF4444'}}>{teamLost}</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Planned LTA</th>
                    <th>Actual LTA</th>
                    <th>Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedMembers.map((m: any) => {
                    const isYou = m.seller_email === session.email
                    const lostPct = (m.lta.totalLost / m.lta.planned) * 100
                    const actualColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#F59E0B' : '#EF4444'
                    const lostColor = m.lta.totalLost < 3 ? '#22C55E' : m.lta.totalLost <= 6 ? '#F59E0B' : '#EF4444'
                    
                    return (
                      <tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : ''}`} onClick={() => setDrillSellerS7(m)}>
                        <td>
                          {m.seller_name}
                          {isYou && <span className={styles.youBadge}>(You)</span>}
                          {m.isAbsent && <span className={styles.absentBadge}>Absent</span>}
                        </td>
                        <td>{m.isAbsent ? '—' : m.lta.planned}</td>
                        <td style={{color: m.isAbsent ? 'inherit' : actualColor, fontWeight: 600}}>
                          {m.isAbsent ? '—' : m.lta.actual}
                        </td>
                        <td style={{color: m.isAbsent ? 'inherit' : lostColor}}>
                          {m.isAbsent ? '—' : m.lta.totalLost}
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
      )}

      {/* S8: Goal % & At-Risk */}
      <div className={styles.sectionHeaderCollapsible} onClick={() => toggleSection('s8')}>
        <div className={styles.headerLeft}>
          <span className={`${styles.chevron} ${openSections['s8'] ? styles.chevronOpen : ''}`}>▶</span>
          <h2 className={styles.sectionTitle}>S8 · Goal % & At-Risk</h2>
        </div>
      </div>
      {openSections['s8'] && (
        <div className={styles.sectionContent}>
          {drillSellerS8 ? (
            <div className={styles.drillDownContainer}>
              <div className={styles.drillHeader}>
                <h3 className={styles.drillTitle}>{drillSellerS8.seller_name} — Goal Trend</h3>
                <button className={styles.backBtn} onClick={() => setDrillSellerS8(null)}>← Back to team</button>
              </div>
              <div className={styles.kpiRow}>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Current Goal %</span>
                  <span className={styles.kpiValue}>65%</span> {/* Mocked */}
                </div>
              </div>
              <div className={styles.chartContainer}>
                <p style={{color: '#8A8278', fontSize: '0.85rem'}}>Chart placeholder: Monthly goal trend vs 70% and 85% thresholds for {drillSellerS8.seller_name}</p>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.kpiRow}>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Team Avg Goal %</span>
                  <span className={styles.kpiValue}>0%</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>At-Risk Count (&lt;70%)</span>
                  <span className={styles.kpiValue} style={{color: '#EF4444'}}>0</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>On-Track Count (&gt;85%)</span>
                  <span className={styles.kpiValue} style={{color: '#22C55E'}}>0</span>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>At-Risk Seller</th>
                      <th>Goal Today</th>
                      <th>Days &lt;70%</th>
                      <th>Trend</th>
                      <th>Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedMembers.filter((m: any) => !m.isAbsent && (m.goal_achieved_percent || 0) < 70).map((m: any, i: number) => {
                      const daysBelow = 2 + (i % 3); // Mocking historical days for UI flavor
                      return (
                      <tr key={m.seller_email} className={styles.sellerRow} onClick={() => setDrillSellerS8(m)}>
                        <td>
                          {m.seller_name}
                          {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                        </td>
                        <td style={{color: '#EF4444', fontWeight: 600}}>{m.goal_achieved_percent || 0}%</td>
                        <td>{daysBelow}</td>
                        <td style={{color: '#EF4444'}}>↘ Down</td>
                        <td>{daysBelow >= 3 ? 'Escalate to CM' : 'Coach today'}</td>
                      </tr>
                    )})}
                    {enrichedMembers.filter((m: any) => !m.isAbsent && (m.goal_achieved_percent || 0) < 70).length === 0 && (
                      <tr>
                        <td colSpan={5} style={{textAlign: 'center', color: '#8A8278', padding: '16px'}}>No sellers currently at risk.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
