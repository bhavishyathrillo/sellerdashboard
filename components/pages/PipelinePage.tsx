'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PipelinePage.module.css'
import Loader from '@/components/ui/Loader'
import { useStickyState } from '@/components/hooks/useStickyState'

interface PipelineSubmission {
  id: number
  date: string
  seller_email: string
  pipeline_value: number
  required_daily: number
  submitted_at: string
  status: string
}

interface TodayStatus {
  submitted: boolean
  pipeline_value?: number
  status?: string
  submitted_at?: string
  required_daily: number
  deadline: string
  past_deadline: boolean
}

interface PipelinePageProps {
  session: UserSession
}

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  } catch { return d }
}

// Parse date from input value (YYYY-MM-DD format)
function parseDateInput(str: string): Date | null {
  if (!str) return null
  try {
    const d = new Date(str + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export default function PipelinePage({ session }: PipelinePageProps) {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null)
  const [history, setHistory] = useState<PipelineSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [view, setView] = useStickyState<'mine' | 'team'>(
    session.role === 'L1' ? 'team' : 'mine', 'PipelinePage_view'
  )
  const [dateFilter, setDateFilter] = useStickyState<'today' | '5days' | '15days' | 'all'>('all', 'PipelinePage_dateFilter')
  const [search, setSearch] = useStickyState('', 'PipelinePage_search')
  const [dateFrom, setDateFrom] = useStickyState('', 'PipelinePage_dateFrom')
  const [dateTo, setDateTo] = useStickyState('', 'PipelinePage_dateTo')
  const [filteredHistory, setFilteredHistory] = useState<PipelineSubmission[]>([])

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)
  const isL1 = session.role === 'L1'

  const load = async () => {
    setLoading(true)
    try {
      const actualView = isL1 ? 'team' : view
      const params = new URLSearchParams({ 
        email: session.email, 
        role: session.role, 
        view: actualView 
      })
      const res = await fetch(`/api/pipeline?${params}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); return }
      setTodayStatus(json.today)
      setHistory(json.history || [])
    } catch {
      setError('Failed to load pipeline data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load() 
  }, [session.email, session.role, view])

  // Filter history whenever dependencies change
  useEffect(() => {
    let filtered = [...history]
    
    // If no filters, show all
    if (dateFilter === 'all' && !dateFrom && !dateTo && !search.trim()) {
      setFilteredHistory(filtered)
      return
    }
    
    // Apply preset date filter (Today, 5 Days, 15 Days)
    if (dateFilter !== 'all' && !dateFrom && !dateTo) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      let cutoff = new Date(now)
      
      if (dateFilter === 'today') {
        cutoff = now
      } else if (dateFilter === '5days') {
        cutoff.setDate(cutoff.getDate() - 4)
      } else if (dateFilter === '15days') {
        cutoff.setDate(cutoff.getDate() - 14)
      }
      
      filtered = filtered.filter(h => {
        const hDate = new Date(h.date)
        hDate.setHours(0, 0, 0, 0)
        return hDate >= cutoff
      })
    }
    
    // Apply custom date range (FROM - TO) - INCLUSIVE
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? parseDateInput(dateFrom) : null
      const toDate = dateTo ? parseDateInput(dateTo) : null
      
      // If From is empty, use a very early date
      // If To is empty, use a very late date
      const effectiveFrom = fromDate || new Date(2000, 0, 1)
      const effectiveTo = toDate || new Date(2100, 11, 31)
      
      // Normalize to start of day for From and end of day for To
      const from = new Date(effectiveFrom)
      from.setHours(0, 0, 0, 0)
      
      const to = new Date(effectiveTo)
      to.setHours(23, 59, 59, 999)
      
      filtered = filtered.filter(h => {
        const hDate = new Date(h.date)
        hDate.setHours(0, 0, 0, 0)
        return hDate >= from && hDate <= to
      })
    }
    
    // Apply search filter (seller name)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(h => 
        h.seller_email?.toLowerCase().includes(q)
      )
    }
    
    setFilteredHistory(filtered)
  }, [history, dateFilter, search, dateFrom, dateTo])

  // Clear date range
  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setDateFilter('all')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value.replace(/,/g, ''))
    if (!num || num <= 0) { setError('Enter a valid pipeline value'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, pipeline_value: num })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Submission failed'); return }
      setSuccess(`Submitted! Status: ${json.status}`)
      setValue('')
      load()
    } catch {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader text="Loading..." />

  // Use filteredHistory for display
  const displayHistory = filteredHistory
  const greenCount = displayHistory.filter(h => h.status === 'GREEN').length
  const redCount = displayHistory.filter(h => h.status === 'RED').length
  const totalPipeline = displayHistory.reduce((sum, h) => sum + (h.pipeline_value || 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.particle} style={{
            left: `${Math.random()*100}%`,
            fontSize: `${0.5+Math.random()*0.7}rem`,
            animationDuration: `${5+Math.random()*6}s`,
            animationDelay: `${Math.random()*6}s`
          }}>
            {['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}
          </div>
        ))}
      </div>

      <div className={styles.topGrid}>
        {!isL1 && view === 'mine' && todayStatus && (
          <div className={`${styles.submitCard} ${todayStatus.submitted ? (todayStatus.status === 'GREEN' ? styles.cardGreen : styles.cardRed) : styles.cardPending}`}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>Today's Pipeline</div>
                <div className={styles.cardDate}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
              </div>
              {todayStatus.submitted ? (
                <span className={`${styles.statusPill} ${todayStatus.status === 'GREEN' ? styles.pillGreen : styles.pillRed}`}>
                  {todayStatus.status}
                </span>
              ) : (
                <div className={styles.deadlineBadge}>
                  ⏰ Submit before {todayStatus.deadline}
                </div>
              )}
            </div>

            {todayStatus.submitted ? (
              <div className={styles.submittedState}>
                <div className={styles.submittedAmount}>{fmt(todayStatus.pipeline_value || 0)}</div>
                <div className={styles.submittedMeta}>
                  <span>Submitted at {todayStatus.submitted_at ? new Date(todayStatus.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  <span className={styles.dot}>·</span>
                  <span>Required: {fmt(todayStatus.required_daily)}</span>
                </div>
              </div>
            ) : (
              <div className={styles.notSubmittedState}>
                <div className={styles.requiredRow}>
                  <span className={styles.requiredLabel}>Required Today</span>
                  <span className={styles.requiredValue}>{fmt(todayStatus.required_daily)}</span>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Pipeline Value</label>
                    <div className={styles.inputWrap}>
                      <span className={styles.rupeeSign}>₹</span>
                      <input
                        type="number"
                        className={styles.input}
                        placeholder="Enter pipeline value"
                        value={value}
                        onChange={e => { setValue(e.target.value); setError('') }}
                        disabled={submitting}
                        min="0"
                      />
                    </div>
                  </div>
                  {error && <p className={styles.errorMsg}>{error}</p>}
                  {success && <p className={styles.successMsg}>{success}</p>}
                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? <span className={styles.btnSpinner} /> : 'Submit Pipeline'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className={styles.monthlyCard}>
          <div className={styles.monthlyHeader}>
            <div className={styles.monthlyTitle}>Monthly Overview</div>
            <div className={styles.monthLabel}>{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
          </div>
          <div className={styles.monthlyRows}>
            <div className={styles.monthlyRow}>
              <span className={styles.monthlyRowLabel}>Total Submissions</span>
              <span className={styles.monthlyRowValue}>{displayHistory.length}</span>
            </div>
            <div className={styles.monthlyDivider} />
            <div className={styles.monthlyRow}>
              <span className={styles.monthlyRowLabel}>Total Pipeline</span>
              <span className={styles.monthlyRowValue} style={{color:'#C9A84C'}}>{fmt(totalPipeline)}</span>
            </div>
            <div className={styles.monthlyDivider} />
            <div className={styles.monthlyRow}>
              <span className={styles.monthlyRowLabel}>Green Days</span>
              <span className={`${styles.monthlyRowValue} ${styles.achievedVal}`}>{greenCount}</span>
            </div>
          </div>
          <div className={styles.monthlyProgress}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Green Rate</span>
              <span className={styles.progressPct}>{displayHistory.length > 0 ? ((greenCount / displayHistory.length) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${displayHistory.length > 0 ? (greenCount / displayHistory.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#F0EDE8' }} />
          <div className={styles.kpiLabel}>Total Submissions</div>
          <div className={styles.kpiValue}>{displayHistory.length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#C9A84C' }} />
          <div className={styles.kpiLabel}>Total Pipeline</div>
          <div className={styles.kpiValue} style={{color:'#C9A84C'}}>{fmt(totalPipeline)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#22C55E' }} />
          <div className={styles.kpiLabel}>Green</div>
          <div className={styles.kpiValue} style={{color:'#22C55E'}}>{greenCount}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#C9A84C' }} />
          <div className={styles.kpiLabel}>Green Rate</div>
          <div className={styles.kpiValue} style={{color:'#C9A84C'}}>{displayHistory.length>0?((greenCount/displayHistory.length)*100).toFixed(0):0}%</div>
        </div>
      </div>

      {/* History */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
            <h3 className={styles.sectionTitle}>Submission History</h3>
            <span style={{fontSize:'0.65rem',color:'#8A8278'}}>
              ({displayHistory.length} submissions)
            </span>
          </div>
          {isManager && !isL1 && (
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${view==='mine'?styles.toggleActive:''}`} onClick={()=>setView('mine')}>My Submissions</button>
              <button className={`${styles.toggleBtn} ${view==='team'?styles.toggleActive:''}`} onClick={()=>setView('team')}>Team View</button>
            </div>
          )}
          {isL1 && (
            <span style={{fontSize:'0.7rem',color:'#C9A84C',fontWeight:600}}>Team Submissions</span>
          )}
        </div>

        {/* Filters Row: Search + Date */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'12px',alignItems:'center'}}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search seller..."
            style={{
              flex:1,minWidth:'150px',padding:'8px 12px',background:'#141414',
              border:'1px solid #232323',borderRadius:'8px',color:'#F0EDE8',
              fontSize:'0.75rem',outline:'none'
            }}
          />
          
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{fontSize:'0.6rem',color:'#8A8278'}}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                padding:'6px 8px',background:'#141414',border:'1px solid #232323',
                borderRadius:'6px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none',
                width:'120px'
              }}
            />
          </div>
          
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{fontSize:'0.6rem',color:'#8A8278'}}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{
                padding:'6px 8px',background:'#141414',border:'1px solid #232323',
                borderRadius:'6px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none',
                width:'120px'
              }}
            />
          </div>
          
          {(dateFrom || dateTo) && (
            <button onClick={clearDateRange} style={{
              padding:'4px 10px',background:'rgba(239,68,68,0.1)',color:'#EF4444',
              border:'1px solid rgba(239,68,68,0.15)',borderRadius:'6px',cursor:'pointer',
              fontSize:'0.6rem',fontWeight:600
            }}>
              Clear Dates
            </button>
          )}
          
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'6px',padding:'2px'}}>
            {[{k:'today',l:'Today'},{k:'5days',l:'5 Days'},{k:'15days',l:'15 Days'},{k:'all',l:'All'}].map(f => (
              <button 
                key={f.k} 
                onClick={() => { setDateFilter(f.k as any); setDateFrom(''); setDateTo('') }} 
                style={{
                  padding:'4px 8px',border:'none',borderRadius:'4px',
                  background: dateFilter===f.k && !dateFrom && !dateTo ? 'rgba(244,99,30,0.15)' : 'transparent',
                  color: dateFilter===f.k && !dateFrom && !dateTo ? '#F4631E' : '#8A8278',
                  cursor:'pointer',fontSize:'0.6rem',fontWeight:600,transition:'all 0.15s'
                }}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {displayHistory.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p>No submissions found</p>
            <p style={{fontSize:'0.7rem',color:'#8A8278',marginTop:'4px'}}>
              Try adjusting your search or date filters
            </p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {(view === 'team' || isL1) && <th>Seller</th>}
                  <th>Pipeline</th>
                  <th>Required</th>
                  <th>vs Required</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.map(row => {
                  const diff = (row.pipeline_value || 0) - (row.required_daily || 0)
                  const above = diff >= 0
                  return (
                    <tr key={row.id} className={styles.row}>
                      <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                      {(view === 'team' || isL1) && <td className={styles.sellerCell}>{row.seller_email}</td>}
                      <td className={styles.valueCell}>{fmt(row.pipeline_value)}</td>
                      <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                      <td><span style={{ color: above ? '#22C55E' : '#EF4444', fontSize: '0.75rem', fontWeight: 500 }}>{above ? '↑' : '↓'} {fmt(Math.abs(diff))}</span></td>
                      <td><span className={`${styles.badge} ${row.status === 'GREEN' ? styles.badgeGreen : styles.badgeRed}`}>{row.status}</span></td>
                      <td className={styles.timeCell}>{row.submitted_at ? new Date(row.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}