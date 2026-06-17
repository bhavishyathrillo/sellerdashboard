'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PipelinePage.module.css'

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

export default function PipelinePage({ session }: PipelinePageProps) {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null)
  const [history, setHistory] = useState<PipelineSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [view, setView] = useState<'mine' | 'team'>(
    session.role === 'L1' ? 'team' : 'mine'
  )
  const [dateFilter, setDateFilter] = useState<'today' | '5days' | '15days' | 'all'>('all')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)
  const isL1 = session.role === 'L1'

  const load = async () => {
    setLoading(true)
    try {
      const actualView = isL1 ? 'team' : view
      const params = new URLSearchParams({ email: session.email, role: session.role, view: actualView })
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

  useEffect(() => { load() }, [session.email, session.role, view])

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

  // Filter history based on date filter
  const getFilteredHistory = () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    
    let cutoffDate: Date | null = null
    
    if (dateFilter === 'today') {
      cutoffDate = new Date(now)
    } else if (dateFilter === '5days') {
      cutoffDate = new Date(now)
      cutoffDate.setDate(cutoffDate.getDate() - 4)
    } else if (dateFilter === '15days') {
      cutoffDate = new Date(now)
      cutoffDate.setDate(cutoffDate.getDate() - 14)
    }
    
    if (!cutoffDate) return history
    
    return history.filter(h => {
      const hDate = new Date(h.date)
      hDate.setHours(0, 0, 0, 0)
      return hDate >= cutoffDate!
    })
  }

  const filteredHistory = getFilteredHistory()

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Loading pipeline...</p>
    </div>
  )

  const greenCount = filteredHistory.filter(h => h.status === 'GREEN').length
  const redCount = filteredHistory.filter(h => h.status === 'RED').length
  const avgPipeline = filteredHistory.length > 0
    ? filteredHistory.reduce((a, b) => a + (b.pipeline_value || 0), 0) / filteredHistory.length
    : 0

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
              <span className={styles.monthlyRowValue}>{filteredHistory.length}</span>
            </div>
            <div className={styles.monthlyDivider} />
            <div className={styles.monthlyRow}>
              <span className={styles.monthlyRowLabel}>Green Days</span>
              <span className={`${styles.monthlyRowValue} ${styles.achievedVal}`}>{greenCount}</span>
            </div>
            <div className={styles.monthlyDivider} />
            <div className={styles.monthlyRow}>
              <span className={styles.monthlyRowLabel}>Avg Pipeline</span>
              <span className={styles.monthlyRowValue}>{fmt(avgPipeline)}</span>
            </div>
          </div>
          <div className={styles.monthlyProgress}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Green Rate</span>
              <span className={styles.progressPct}>{filteredHistory.length > 0 ? ((greenCount / filteredHistory.length) * 100).toFixed(0) : 0}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${filteredHistory.length > 0 ? (greenCount / filteredHistory.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.stat}><div className={styles.statVal}>{filteredHistory.length}</div><div className={styles.statLbl}>Total</div></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#22C55E'}}>{greenCount}</div><div className={styles.statLbl}>Green</div></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#EF4444'}}>{redCount}</div><div className={styles.statLbl}>Red</div></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><div className={styles.statVal}>{fmt(avgPipeline)}</div><div className={styles.statLbl}>Avg Pipeline</div></div>
        <div className={styles.statDivider} />
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#22C55E'}}>{filteredHistory.length>0?((greenCount/filteredHistory.length)*100).toFixed(0):0}%</div><div className={styles.statLbl}>Green Rate</div></div>
      </div>

      {/* History */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <h3 className={styles.sectionTitle}>Submission History</h3>
            {/* Date Filter Toggle */}
            <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
              {[
                { key: 'today', label: 'Today' },
                { key: '5days', label: '5 Days' },
                { key: '15days', label: '15 Days' },
                { key: 'all', label: 'All' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key as any)}
                  style={{
                    padding:'5px 10px',border:'none',borderRadius:'5px',
                    background: dateFilter === f.key ? 'rgba(244,99,30,0.15)' : 'transparent',
                    color: dateFilter === f.key ? '#F4631E' : '#8A8278',
                    cursor:'pointer',fontSize:'0.65rem',fontWeight:600,transition:'all 0.15s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {/* View toggle for non-L1 managers */}
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

        {filteredHistory.length === 0 ? (
          <div className={styles.emptyWrap}><p>No submissions found</p></div>
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
                {filteredHistory.map(row => {
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