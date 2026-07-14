'use client'

import { useEffect, useState, Fragment } from 'react'
import styles from './PipelinePage.module.css'
import Loader from '@/components/ui/Loader'
import { useStickyState } from '@/components/hooks/useStickyState'

interface PNRData {
  pnr_number: string
  topline_value: number
  bottomline_value: number
}

function fmt(n: number) { 
  if (!n && n !== 0) return '₹0'; 
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`; 
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`; 
  return `₹${n.toFixed(0)}`; 
}

function fmtDate(d: string) { 
  try { 
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
  } catch { return d } 
}

function PopupModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)'}}/>
      <div style={{position:'relative',width:'92vw',maxWidth:'1000px',maxHeight:'88vh',background:'#0D0D0D',border:'1px solid #232323',borderRadius:'16px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #1A1A1A',background:'#111111',flexShrink:0}}>
          <h2 style={{fontSize:'0.95rem',fontWeight:700,color:'#F0EDE8'}}>{title}</h2>
          <button onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #333',background:'transparent',color:'#8A8278',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'20px'}}>{children}</div>
      </div>
    </div>
  )
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
  return (pnrs || []).reduce((sum, p) => sum + (is_bottomline ? (Number(p.bottomline_value)||0) : (Number(p.topline_value)||0)), 0)
}

export default function AdminPipelinePage() {
  const [l1Data, setL1Data] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [dateFilter, setDateFilter] = useStickyState<'today' | '5days' | '15days' | 'this_month'>('today', 'AdminPipeline_dateFilter')
  const [viewMode, setViewMode] = useStickyState<'cards' | 'table'>('cards', 'AdminPipeline_viewMode')
  const [search, setSearch] = useStickyState('', 'AdminPipeline_search')
  const [dateFrom, setDateFrom] = useStickyState('', 'AdminPipeline_dateFrom')
  const [dateTo, setDateTo] = useStickyState('', 'AdminPipeline_dateTo')
  const [filteredResults, setFilteredResults] = useState<any[]>([])
  
  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [expandedModalRows, setExpandedModalRows] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/pipeline')
      .then(r => r.json())
      .then(d => { 
        setL1Data(d.l1_data || []); 
        setLoading(false) 
      })
      .catch(err => { console.error('Error loading pipeline:', err); setLoading(false) })
  }, [])

  const filterByDate = (submissions: any[]) => {
    if (!submissions || submissions.length === 0) return []
    if (dateFrom || dateTo) {
      let effectiveFrom = dateFrom
      let effectiveTo = dateTo
      if (dateFrom && dateTo && dateFrom > dateTo) {
        effectiveFrom = dateTo
        effectiveTo = dateFrom
      }
      const fromDate = effectiveFrom ? parseDateInput(effectiveFrom) : null
      const toDate = effectiveTo ? parseDateInput(effectiveTo) : null
      const from = fromDate ? new Date(fromDate) : new Date(2000, 0, 1)
      const to = toDate ? new Date(toDate) : new Date(2100, 11, 31)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      return submissions.filter((s: any) => {
        const d = new Date(s.date)
        d.setHours(0, 0, 0, 0)
        return d >= from && d <= to
      })
    }
    if (dateFilter === 'this_month') {
      const now = new Date()
      return submissions.filter((s: any) => {
        const d = new Date(s.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    }
    const now = new Date(); now.setHours(0,0,0,0)
    let cutoff = new Date(now)
    if (dateFilter === 'today') cutoff = now
    else if (dateFilter === '5days') cutoff.setDate(cutoff.getDate() - 4)
    else if (dateFilter === '15days') cutoff.setDate(cutoff.getDate() - 14)
    return submissions.filter((s: any) => new Date(s.date) >= cutoff)
  }

  useEffect(() => {
    if (!search.trim() && !dateFrom && !dateTo && dateFilter === ('all' as any)) { 
      setFilteredResults([]); 
      return 
    }
    const q = search.toLowerCase().trim()
    const results: any[] = []
    
    l1Data.forEach((l1: any) => {
      l1.l2_groups?.forEach((l2: any) => {
        let filteredSubs = filterByDate(l2.submissions || [])
        if (q) {
          filteredSubs = filteredSubs.filter((s: any) => 
            s.seller_email?.toLowerCase().includes(q) || 
            l2.l2_name?.toLowerCase().includes(q) ||
            l1.l1_name?.toLowerCase().includes(q)
          )
        }
        filteredSubs.forEach((sub: any) => {
          results.push({ 
            ...sub, 
            l1_name: l1.l1_name, 
            l2_name: l2.l2_name,
            l1_email: l1.l1_email,
            l2_email: l2.l2_email
          })
        })
      })
    })
    const seen = new Set()
    setFilteredResults(results.filter(r => { const k = r.id; if (seen.has(k)) return false; seen.add(k); return true }))
  }, [search, l1Data, dateFilter, dateFrom, dateTo])

  const clearDateRange = () => {
    setDateFrom('')
    setDateTo('')
    setDateFilter('this_month')
  }

  if (loading) return <Loader text="Loading..." />

  const getFilteredL1Data = () => {
    return l1Data.map((l1: any) => {
      const filteredL2 = (l1.l2_groups || []).map((l2: any) => {
        let filteredSubs = filterByDate(l2.submissions || [])
        if (search.trim()) {
          const q = search.toLowerCase().trim()
          filteredSubs = filteredSubs.filter((s: any) => 
            s.seller_email?.toLowerCase().includes(q) || 
            l2.l2_name?.toLowerCase().includes(q) ||
            l1.l1_name?.toLowerCase().includes(q)
          )
        }
        return { ...l2, submissions: filteredSubs, filtered_count: filteredSubs.length }
      }).filter((l2: any) => l2.filtered_count > 0)
      
      const totalSubs = filteredL2.reduce((s: number, l2: any) => s + l2.filtered_count, 0)
      const totalPipeline = filteredL2.reduce((s: number, l2: any) => {
        return s + l2.submissions.reduce((sum: number, sub: any) => sum + calcTotal(sub.pnrs, sub.is_bottomline_focus), 0)
      }, 0)
      
      const totalTopline = filteredL2.reduce((s: number, l2: any) => {
        return s + l2.submissions.reduce((sum: number, sub: any) => sum + (sub.pnrs||[]).reduce((ts:number,p:any)=>ts+(Number(p.topline_value)||0),0), 0)
      }, 0)
      const totalBottomline = filteredL2.reduce((s: number, l2: any) => {
        return s + l2.submissions.reduce((sum: number, sub: any) => sum + (sub.pnrs||[]).reduce((ts:number,p:any)=>ts+(Number(p.bottomline_value)||0),0), 0)
      }, 0)
      
      const greenCount = filteredL2.reduce((s: number, l2: any) => {
        return s + l2.submissions.filter((sub: any) => sub.status === 'GREEN').length
      }, 0)
      
      return { ...l1, l2_groups: filteredL2, total_submissions: totalSubs, total_pipeline: totalPipeline, total_topline: totalTopline, total_bottomline: totalBottomline, green_count: greenCount }
    }).filter((l1: any) => l1.total_submissions > 0)
  }

  const filteredL1Data = getFilteredL1Data()
  const totalPipeline = filteredL1Data.reduce((s: number, l1: any) => s + l1.total_pipeline, 0)
  const totalTopline = filteredL1Data.reduce((s: number, l1: any) => s + l1.total_topline, 0)
  const totalBottomline = filteredL1Data.reduce((s: number, l1: any) => s + l1.total_bottomline, 0)
  const totalSubmissions = filteredL1Data.reduce((s: number, l1: any) => s + l1.total_submissions, 0)
  const totalGreen = filteredL1Data.reduce((s: number, l1: any) => s + l1.green_count, 0)

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (<div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,fontSize:`${0.5+Math.random()*0.7}rem`,animationDuration:`${5+Math.random()*6}s`,animationDelay:`${Math.random()*6}s`}}>{['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}</div>))}
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'1.4rem',fontWeight:700,color:'#C9A84C'}}>Enquiry Pipeline</h1>
          <p style={{fontSize:'0.7rem',color:'#8A8278'}}>{filteredL1Data.length} Category Managers</p>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
            <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
          </div>
        </div>
      </div>

      <div style={{display:'flex',flexWrap:'wrap',gap:'10px',marginBottom:'16px',alignItems:'center'}}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by seller, Category Manager, or L1 Manager..." style={{ flex:1,minWidth:'200px',padding:'10px 14px',background:'#141414', border:'1px solid #232323',borderRadius:'10px',color:'#F0EDE8', fontSize:'0.8rem',outline:'none' }} />
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'0.65rem',color:'#8A8278'}}>From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding:'8px 10px',background:'#141414',border:'1px solid #232323', borderRadius:'8px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none', width:'130px' }} />
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <span style={{fontSize:'0.65rem',color:'#8A8278'}}>To:</span>
          <input type="date" value={dateTo} onChange={e => { if (dateFrom && e.target.value && dateFrom > e.target.value) { setDateFrom(e.target.value); setDateTo(dateFrom) } else { setDateTo(e.target.value) } }} style={{ padding:'8px 10px',background:'#141414',border:'1px solid #232323', borderRadius:'8px',color:'#F0EDE8',fontSize:'0.7rem',outline:'none', width:'130px' }} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={clearDateRange} style={{ padding:'6px 12px',background:'rgba(239,68,68,0.12)',color:'#EF4444', border:'1px solid rgba(239,68,68,0.2)',borderRadius:'8px',cursor:'pointer', fontSize:'0.65rem',fontWeight:600 }}>Clear Dates</button>
        )}
          <div style={{display:'flex',gap:'4px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',padding:'3px'}}>
            {[{k:'today',l:'Today'},{k:'5days',l:'5 Days'},{k:'15days',l:'15 Days'},{k:'this_month',l:'This Month'}].map(f => (
              <button key={f.k} onClick={() => { setDateFilter(f.k as any); setDateFrom(''); setDateTo('') }} style={{ padding:'6px 12px',border:'none',borderRadius:'6px', background: dateFilter===f.k && !dateFrom && !dateTo ? 'rgba(244,99,30,0.15)' : 'transparent', color: dateFilter===f.k && !dateFrom && !dateTo ? '#F4631E' : '#8A8278', cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.15s' }}>{f.l}</button>
            ))}
          </div>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiBar} style={{ background: '#F0EDE8' }} />
          <div className={styles.kpiLabel}>Total Submissions</div>
          <div className={styles.kpiValue} style={{color:'#F4631E'}}>{totalSubmissions}</div>
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
          <div className={styles.kpiValue} style={{color:'#22C55E'}}>{totalSubmissions > 0 ? ((totalGreen / totalSubmissions) * 100).toFixed(0) : 0}%</div>
        </div>
      </div>

      {(viewMode === 'table' || search.trim() || dateFrom || dateTo) && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Seller</th><th>Category Mgr</th><th>L1 Manager</th><th>Pipeline</th><th>Required</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>
              {(() => {
                let allRows: any[] = []
                if (search.trim() || dateFrom || dateTo) {
                  allRows = filteredResults
                } else {
                  filteredL1Data.forEach((l1: any) => {
                    l1.l2_groups?.forEach((l2: any) => {
                      l2.submissions?.forEach((sub: any) => {
                        allRows.push({ ...sub, l1_name: l1.l1_name, l2_name: l2.l2_name })
                      })
                    })
                  })
                }
                return allRows.slice(0, 300).map((row: any) => {
                  const total = calcTotal(row.pnrs, row.is_bottomline_focus)
                  const isExpanded = !!expandedRows[row.id]
                  return (
                    <Fragment key={row.id}>
                      <tr className={styles.row}>
                        <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                        <td className={styles.sellerCell}>{row.seller_email}</td>
                        <td style={{fontSize:'0.7rem',color:'#C9A84C'}}>{row.l1_name}</td>
                        <td style={{fontSize:'0.7rem',color:'#8A8278'}}>{row.l2_name}</td>
                        <td className={styles.valueCell}>{fmt(total)}</td>
                        <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                        <td><span className={`${styles.badge} ${row.status==='GREEN'?styles.badgeGreen:styles.badgeRed}`}>{row.status}</span></td>
                        <td>
                          <button onClick={() => setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))} style={{ background: '#333', border: 'none', color: '#FFF', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                            {isExpanded ? 'Hide' : `View ${row.pnrs?.length || 0}`}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && row.pnrs && row.pnrs.length > 0 && (
                        <tr style={{ background: '#111' }}>
                          <td colSpan={8} style={{ padding: '16px' }}>
                            <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                              {row.pnrs.map((p: any, idx: number) => (
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
                    </Fragment>
                  )
                })
              })()}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'cards' && !search.trim() && !dateFrom && !dateTo && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'12px'}}>
          {filteredL1Data.map((l1: any) => {
            const green = l1.green_count || 0
            const total = l1.total_submissions || 0
            return (
              <div key={l1.l1_email} onClick={() => setSelectedL1(l1)} style={{ background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'all 0.3s' }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{l1.l1_name}</div><div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1.l2_groups.length} L1 Managers</div></div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:'1.1rem',color:'#F4631E'}}>{total}</div>
                    <div style={{fontSize:'0.6rem',color:'#8A8278'}}>submissions</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'12px',fontSize:'0.65rem'}}>
                  <span style={{color:'#22C55E'}}>Green: {green}</span>
                  <span style={{color:'#EF4444'}}>Red: {total - green}</span>
                  <span style={{color:'#8A8278'}}>Pipeline: {fmt(l1.total_pipeline)}</span>
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'8px'}}>
                  <div style={{height:'100%',background:'#22C55E',borderRadius:'2px',width:`${total>0?(green/total)*100:0}%`,transition:'width 0.5s'}}/>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedL1 && (
        <PopupModal title={`${selectedL1.l1_name} — L1 Managers`} onClose={() => setSelectedL1(null)}>
          <div style={{marginBottom:'12px',display:'flex',gap:'12px',fontSize:'0.7rem',color:'#8A8278'}}>
            <span>Total: <strong style={{color:'#F4631E'}}>{selectedL1.total_submissions}</strong></span>
            <span>Pipeline: <strong style={{color:'#C9A84C'}}>{fmt(selectedL1.total_pipeline)}</strong></span>
            <span>Green: <strong style={{color:'#22C55E'}}>{selectedL1.green_count}</strong></span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => {
              const l2Green = l2.submissions.filter((s:any) => s.status === 'GREEN').length
              const l2Total = l2.submissions.length
              const l2Pipeline = l2.submissions.reduce((s: number, sub: any) => s + calcTotal(sub.pnrs, sub.is_bottomline_focus), 0)
              return (
                <div key={l2.l2_email} onClick={(e) => { e.stopPropagation(); setSelectedL2(l2) }} style={{ background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',cursor:'pointer' }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{l2.l2_name}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2Total} submissions</div></div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontWeight:700,fontSize:'0.85rem',color:'#F4631E'}}>{l2Total}</div>
                      <div style={{fontSize:'0.55rem',color:'#8A8278'}}>Green: {l2Green}</div>
                    </div>
                  </div>
                  <div style={{fontSize:'0.6rem',color:'#C9A84C',marginTop:'2px'}}>Pipeline: {fmt(l2Pipeline)}</div>
                  <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}>
                    <div style={{height:'100%',background:'#22C55E',borderRadius:'2px',width:`${l2Total>0?(l2Green/l2Total)*100:0}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </PopupModal>
      )}

      {selectedL2 && (
        <PopupModal title={`${selectedL2.l2_name} — Submissions`} onClose={() => setSelectedL2(null)}>
          {selectedL2.submissions.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px',color:'#8A8278'}}>No submissions</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Seller</th><th>Pipeline</th><th>Required</th><th>Status</th><th>Details</th></tr></thead>
                <tbody>
                  {selectedL2.submissions.map((row: any) => {
                    const total = calcTotal(row.pnrs, row.is_bottomline_focus)
                    const isExpanded = !!expandedModalRows[row.id]
                    return (
                      <Fragment key={row.id}>
                        <tr className={styles.row}>
                          <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                          <td className={styles.sellerCell}>{row.seller_email}</td>
                          <td className={styles.valueCell}>{fmt(total)}</td>
                          <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                          <td><span className={`${styles.badge} ${row.status==='GREEN'?styles.badgeGreen:styles.badgeRed}`}>{row.status}</span></td>
                          <td>
                            <button onClick={() => setExpandedModalRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))} style={{ background: '#333', border: 'none', color: '#FFF', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}>
                              {isExpanded ? 'Hide' : `View ${row.pnrs?.length || 0}`}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && row.pnrs && row.pnrs.length > 0 && (
                          <tr style={{ background: '#111' }}>
                            <td colSpan={6} style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                                {row.pnrs.map((p: any, idx: number) => (
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
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PopupModal>
      )}
    </div>
  )
}