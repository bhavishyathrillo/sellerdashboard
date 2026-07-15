'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PipelinePage.module.css'
import Loader from '@/components/ui/Loader'
import { useStickyState } from '@/hooks/useStickyState'
import { useCachedFetch } from '@/hooks/useCachedFetch'

interface PNRData {
  pnr_number: string
  topline_value: number
  bottomline_value: number
}

interface PipelineSubmission {
  id: number
  date: string
  seller_email: string
  is_bottomline_focus: boolean
  pnrs: PNRData[]
  required_daily: number
  created_at: string
  status: string
}

interface TodayStatus {
  submitted: boolean
  pnrs: PNRData[]
  is_bottomline_focus: boolean
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

function parseDateInput(str: string): Date | null {
  if (!str) return null
  try {
    const d = new Date(str + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

const calcTotal = (pnrs: PNRData[], is_bottomline: boolean) => {
  return pnrs.reduce((sum, p) => sum + (is_bottomline ? (Number(p.bottomline_value)||0) : (Number(p.topline_value)||0)), 0)
}

export default function PipelinePage({ session }: PipelinePageProps) {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null)
  const [history, setHistory] = useState<PipelineSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // New form state
  const [pnrInputs, setPnrInputs] = useState([{ pnr_number: '', topline_value: '', bottomline_value: '' }])

  const [view, setView] = useStickyState<'mine' | 'team'>(
    session.role === 'L1' ? 'team' : 'mine', 'PipelinePage_view'
  )
  const [dateFilter, setDateFilter] = useStickyState<'today' | '5days' | '15days' | 'this_month'>('today', 'Pipeline_dateFilter')
  const [search, setSearch] = useStickyState('', 'PipelinePage_search')
  const [dateFrom, setDateFrom] = useStickyState('', 'PipelinePage_dateFrom')
  const [dateTo, setDateTo] = useStickyState('', 'PipelinePage_dateTo')
  const [filteredHistory, setFilteredHistory] = useState<PipelineSubmission[]>([])
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)
  const isL1 = session.role === 'L1'

  const actualView = isL1 ? 'team' : view
  const params = new URLSearchParams({ email: session.email, role: session.role, view: actualView }).toString()
  const { data: fetchedData, loading: isFetching } = useCachedFetch(`/api/pipeline?${params}`)

  useEffect(() => {
    if (fetchedData) {
      if (fetchedData.error) {
        setError(fetchedData.error)
      } else {
        setTodayStatus(fetchedData.today)
        setHistory(fetchedData.history || [])
      }
      setLoading(false)
    } else if (!isFetching) {
      setLoading(false)
    }
  }, [fetchedData, isFetching])

  const load = async () => {
    // Left for manual refresh on submit
    try {
      const res = await fetch(`/api/pipeline?${params}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); return }
      setTodayStatus(json.today)
      setHistory(json.history || [])
    } catch {}
  }

  useEffect(() => {
    let filtered = [...history]
    if (dateFilter === 'this_month' && !dateFrom && !dateTo && !search.trim()) {
      const now = new Date()
      filtered = filtered.filter(h => {
        const hDate = new Date(h.date)
        return hDate.getMonth() === now.getMonth() && hDate.getFullYear() === now.getFullYear()
      })
      setFilteredHistory(filtered)
      return
    }
    
    if (dateFilter !== 'this_month' && !dateFrom && !dateTo) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      let cutoff = new Date(now)
      if (dateFilter === 'today') cutoff = now
      else if (dateFilter === '5days') cutoff.setDate(cutoff.getDate() - 4)
      else if (dateFilter === '15days') cutoff.setDate(cutoff.getDate() - 14)
      
      filtered = filtered.filter(h => {
        const hDate = new Date(h.date)
        hDate.setHours(0, 0, 0, 0)
        return hDate >= cutoff
      })
    }
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? parseDateInput(dateFrom) : null
      const toDate = dateTo ? parseDateInput(dateTo) : null
      const effectiveFrom = fromDate || new Date(2000, 0, 1)
      const effectiveTo = toDate || new Date(2100, 11, 31)
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
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter(h => h.seller_email?.toLowerCase().includes(q))
    }
    setFilteredHistory(filtered)
  }, [history, dateFilter, search, dateFrom, dateTo])

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setDateFilter('this_month')
  }

  const addPnrRow = () => {
    setPnrInputs([...pnrInputs, { pnr_number: '', topline_value: '', bottomline_value: '' }])
  }

  const removePnrRow = (idx: number) => {
    setPnrInputs(pnrInputs.filter((_, i) => i !== idx))
  }

  const updatePnr = (idx: number, field: string, val: string) => {
    const newInputs = [...pnrInputs]
    newInputs[idx] = { ...newInputs[idx], [field]: val }
    setPnrInputs(newInputs)
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate
    const parsedPnrs = pnrInputs.map(p => ({
      pnr_number: p.pnr_number.trim(),
      topline_value: parseFloat(p.topline_value.replace(/,/g, '')) || 0,
      bottomline_value: parseFloat(p.bottomline_value.replace(/,/g, '')) || 0,
    })).filter(p => p.pnr_number && (p.topline_value > 0 || p.bottomline_value > 0))

    if (parsedPnrs.length === 0) {
      setError('Please enter at least one valid PNR with an amount.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.email, 
          pnrs: parsedPnrs
        })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Submission failed'); return }
      setSuccess(`Submitted! Status: ${json.status}`)
      setPnrInputs([{ pnr_number: '', topline_value: '', bottomline_value: '' }])
      load()
    } catch {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loader text="Loading..." />

  const displayHistory = filteredHistory
  const greenCount = displayHistory.filter(h => h.status === 'GREEN').length
  const totalPipeline = displayHistory.reduce((sum, h) => sum + calcTotal(h.pnrs || [], h.is_bottomline_focus), 0)
  
  const totalTopline = displayHistory.reduce((sum, h) => sum + (h.pnrs || []).reduce((s, p) => s + (Number(p.topline_value) || 0), 0), 0)
  const totalBottomline = displayHistory.reduce((sum, h) => sum + (h.pnrs || []).reduce((s, p) => s + (Number(p.bottomline_value) || 0), 0), 0)

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className={styles.particle} style={{ left: `${Math.random()*100}%`, fontSize: `${0.5+Math.random()*0.7}rem`, animationDuration: `${5+Math.random()*6}s`, animationDelay: `${Math.random()*6}s`}}>
            {['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}
          </div>
        ))}
      </div>

      <div className={styles.topGrid}>
        {!isL1 && view === 'mine' && todayStatus && (
          <div className={`${styles.submitCard} ${todayStatus.submitted ? (todayStatus.status === 'GREEN' ? styles.cardGreen : styles.cardRed) : styles.cardPending}`}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>Today's PNR Pipeline</div>
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
                <div className={styles.submittedAmount}>{fmt(calcTotal(todayStatus.pnrs, todayStatus.is_bottomline_focus))}</div>
                <div className={styles.submittedMeta}>
                  <span>Submitted at {todayStatus.submitted_at ? new Date(todayStatus.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  <span className={styles.dot}>·</span>
                  <span>Required: {fmt(todayStatus.required_daily)}</span>
                  <span className={styles.dot}>·</span>
                  <span>Focus: {todayStatus.is_bottomline_focus ? 'Bottomline' : 'Topline'}</span>
                </div>
              </div>
            ) : (
              <div className={styles.notSubmittedState}>
                <div className={styles.requiredRow}>
                  <span className={styles.requiredLabel}>Required Today</span>
                  <span className={styles.requiredValue}>{fmt(todayStatus.required_daily)}</span>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                  
                  {/* Enquiry Rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {pnrInputs.map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
                        <div style={{ flex: 1.2 }}>
                          <input type="text" placeholder="Enquiry ID" value={p.pnr_number} onChange={e => updatePnr(idx, 'pnr_number', e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid transparent', background: 'rgba(0,0,0,0.3)', color: '#FFF', outline: 'none', transition: 'all 0.2s', fontSize: '0.85rem' }} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.4)'} onBlur={e=>e.target.style.borderColor='transparent'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="number" placeholder="Topline ₹" value={p.topline_value} onChange={e => updatePnr(idx, 'topline_value', e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid transparent', background: 'rgba(0,0,0,0.3)', color: '#FFF', outline: 'none', transition: 'all 0.2s', fontSize: '0.85rem' }} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.4)'} onBlur={e=>e.target.style.borderColor='transparent'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="number" placeholder="Btmline ₹" value={p.bottomline_value} onChange={e => updatePnr(idx, 'bottomline_value', e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid transparent', background: 'rgba(0,0,0,0.3)', color: '#FFF', outline: 'none', transition: 'all 0.2s', fontSize: '0.85rem' }} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.4)'} onBlur={e=>e.target.style.borderColor='transparent'} />
                        </div>
                        {pnrInputs.length > 1 && (
                          <button type="button" onClick={() => removePnrRow(idx)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', padding: '10px 12px', fontSize: '1rem', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={addPnrRow} style={{ marginTop: '16px', background: 'rgba(201,168,76,0.05)', border: '1px dashed rgba(201,168,76,0.3)', color: '#C9A84C', padding: '12px', borderRadius: '12px', cursor: 'pointer', width: '100%', fontWeight: 600, transition: 'all 0.2s', fontSize: '0.85rem' }} onMouseOver={e=>{e.currentTarget.style.background='rgba(201,168,76,0.1)';e.currentTarget.style.borderColor='rgba(201,168,76,0.6)'}} onMouseOut={e=>{e.currentTarget.style.background='rgba(201,168,76,0.05)';e.currentTarget.style.borderColor='rgba(201,168,76,0.3)'}}>
                    + Add Enquiry
                  </button>

                  {error && <p className={styles.errorMsg} style={{ marginTop: '16px' }}>{error}</p>}
                  {success && <p className={styles.successMsg} style={{ marginTop: '16px' }}>{success}</p>}
                  <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ marginTop: '16px' }}>
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

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#F0EDE8' }} />
          <div className={styles.kpiLabel}>Total Submissions</div>
          <div className={styles.kpiValue}>{displayHistory.length}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#3B82F6' }} />
          <div className={styles.kpiLabel}>Total Topline</div>
          <div className={styles.kpiValue} style={{color:'#3B82F6'}}>{fmt(totalTopline)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#8B5CF6' }} />
          <div className={styles.kpiLabel}>Total Bottomline</div>
          <div className={styles.kpiValue} style={{color:'#8B5CF6'}}>{fmt(totalBottomline)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#22C55E' }} />
          <div className={styles.kpiLabel}>Green Rate</div>
          <div className={styles.kpiValue} style={{color:'#22C55E'}}>{displayHistory.length>0?((greenCount/displayHistory.length)*100).toFixed(0):0}%</div>
        </div>
      </div>

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

        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'12px',alignItems:'center'}}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller..." style={{ flex:1,minWidth:'150px',padding:'8px 12px',background:'#141414', border:'1px solid #232323',borderRadius:'8px',color:'#F0EDE8', fontSize:'0.75rem',outline:'none' }} />
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{fontSize:'0.6rem',color:'#8A8278'}}>From:</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:'6px 8px',background:'#141414',border:'1px solid #232323', borderRadius:'6px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none', width:'120px' }} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
            <span style={{fontSize:'0.6rem',color:'#8A8278'}}>To:</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding:'6px 8px',background:'#141414',border:'1px solid #232323', borderRadius:'6px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none', width:'120px' }} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={clearDateRange} style={{ padding:'4px 10px',background:'rgba(239,68,68,0.1)',color:'#EF4444', border:'1px solid rgba(239,68,68,0.15)',borderRadius:'6px',cursor:'pointer', fontSize:'0.6rem',fontWeight:600 }}>Clear Dates</button>
          )}
          <div style={{display:'flex',gap:'4px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'3px'}}>
            {[{k:'today',l:'Today'},{k:'5days',l:'5 Days'},{k:'15days',l:'15 Days'},{k:'this_month',l:'This Month'}].map(f => (
              <button key={f.k} onClick={() => { setDateFilter(f.k as any); setDateFrom(''); setDateTo('') }} style={{ padding:'6px 12px',border:'none',borderRadius:'6px', background: dateFilter===f.k && !dateFrom && !dateTo ? 'rgba(244,99,30,0.15)' : 'transparent', color: dateFilter===f.k && !dateFrom && !dateTo ? '#F4631E' : '#8A8278', cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.15s' }}>{f.l}</button>
            ))}
          </div>
        </div>

        {displayHistory.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p>No submissions found</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {(view === 'team' || isL1) && <th>Seller</th>}
                  <th>Total Pipeline</th>
                  <th>Required</th>
                  <th>Focus</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.map(row => {
                  const total = calcTotal(row.pnrs || [], row.is_bottomline_focus)
                  const diff = total - (row.required_daily || 0)
                  const above = diff >= 0
                  const isExpanded = !!expandedRows[row.id]
                  return (
                    <>
                      <tr key={row.id} className={styles.row}>
                        <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                        {(view === 'team' || isL1) && <td className={styles.sellerCell}>{row.seller_email}</td>}
                        <td className={styles.valueCell}>{fmt(total)}</td>
                        <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                        <td>
                          <span style={{ background: '#222', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#AAA' }}>
                            {row.is_bottomline_focus ? 'Bottomline' : 'Topline'}
                          </span>
                        </td>
                        <td><span className={`${styles.badge} ${row.status === 'GREEN' ? styles.badgeGreen : styles.badgeRed}`}>{row.status}</span></td>
                        <td>
                          <button onClick={() => toggleRow(row.id)} style={{ background: '#333', border: 'none', color: '#FFF', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            {isExpanded ? 'Hide PNRs' : `View ${row.pnrs?.length || 0} PNRs`}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && row.pnrs && row.pnrs.length > 0 && (
                        <tr key={`${row.id}-details`} style={{ background: '#111' }}>
                          <td colSpan={view === 'team' || isL1 ? 7 : 6} style={{ padding: '16px' }}>
                            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                              {row.pnrs.map((p, idx) => (
                                <div key={idx} style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333' }}>
                                  <div style={{ color: '#C9A84C', fontWeight: 'bold', marginBottom: '8px' }}>Enquiry #{p.pnr_number}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#AAA', marginBottom: '4px' }}>
                                    <span>Topline:</span> <span style={{ color: '#FFF' }}>{fmt(p.topline_value)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#AAA' }}>
                                    <span>Bottomline:</span> <span style={{ color: '#FFF' }}>{fmt(p.bottomline_value)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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