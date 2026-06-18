'use client'

import { useEffect, useState } from 'react'
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

function fmt(n: number) { if (!n && n !== 0) return '₹0'; if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`; return `₹${n.toFixed(0)}` }
function fmtDate(d: string) { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } }

function ChevronDown() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>) }
function ChevronRight() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>) }

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

export default function AdminPipelinePage() {
  const [l1Data, setL1Data] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [dateFilter, setDateFilter] = useState<'today' | '5days' | '15days' | 'all'>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filteredResults, setFilteredResults] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/pipeline')
      .then(r => r.json())
      .then(d => { setL1Data(d.l1_data || []); setLoading(false) })
  }, [])

  // Search function
  useEffect(() => {
    if (!search.trim()) { setFilteredResults([]); return }
    const q = search.toLowerCase().trim()
    const results: any[] = []
    
    l1Data.forEach((l1: any) => {
      const l1Match = l1.l1_name?.toLowerCase().includes(q)
      l1.l2_groups?.forEach((l2: any) => {
        const l2Match = l2.l2_name?.toLowerCase().includes(q)
        l2.submissions?.forEach((sub: any) => {
          const sellerMatch = sub.seller_email?.toLowerCase().includes(q)
          if (l1Match || l2Match || sellerMatch) {
            results.push({ ...sub, l1_name: l1.l1_name, l2_name: l2.l2_name })
          }
        })
      })
    })
    // Remove duplicates
    const seen = new Set()
    setFilteredResults(results.filter(r => { const k = r.id; if (seen.has(k)) return false; seen.add(k); return true }))
  }, [search, l1Data])

  const filterByDate = (submissions: any[]) => {
    if (dateFilter === 'all') return submissions
    const now = new Date(); now.setHours(0,0,0,0)
    let cutoff = new Date(now)
    if (dateFilter === 'today') cutoff = now
    else if (dateFilter === '5days') cutoff.setDate(cutoff.getDate() - 4)
    else if (dateFilter === '15days') cutoff.setDate(cutoff.getDate() - 14)
    return submissions.filter((s: any) => new Date(s.date) >= cutoff)
  }

  if (loading) return <div className={styles.loadingWrap}><div className={styles.spinner}/><p>Loading...</p></div>

  return (
    <div className={styles.page}>
      <div className={styles.particles}>
        {[...Array(10)].map((_, i) => (<div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,fontSize:`${0.5+Math.random()*0.7}rem`,animationDuration:`${5+Math.random()*6}s`,animationDelay:`${Math.random()*6}s`}}>{['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}</div>))}
      </div>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'1.4rem',fontWeight:700,color:'#C9A84C'}}>Pipeline</h1>
          <p style={{fontSize:'0.7rem',color:'#8A8278'}}>{l1Data.length} Category Managers</p>
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          {/* View Toggle */}
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
            <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
          </div>
          {/* Date Filter */}
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            {[{k:'today',l:'Today'},{k:'5days',l:'5 Days'},{k:'15days',l:'15 Days'},{k:'all',l:'All'}].map(f => (
              <button key={f.k} onClick={() => setDateFilter(f.k as any)} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:dateFilter===f.k?'rgba(244,99,30,0.15)':'transparent',color:dateFilter===f.k?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>{f.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{marginBottom:'16px'}}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by seller name, Category Manager or L1 Manager..."
          style={{
            width:'100%',padding:'10px 14px',background:'#141414',border:'1px solid #232323',
            borderRadius:'10px',color:'#F0EDE8',fontSize:'0.8rem',outline:'none',
            maxWidth:'500px'
          }}
        />
      </div>

      {/* TABLE VIEW */}
      {(viewMode === 'table' || search.trim()) && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Seller</th><th>Category Mgr</th><th>L1 Manager</th><th>Pipeline</th><th>Required</th><th>Status</th></tr></thead>
            <tbody>
              {(search.trim() ? filterByDate(filteredResults) : filterByDate(l1Data.flatMap((l1: any) => (l1.l2_groups || []).flatMap((l2: any) => (l2.submissions || []).map((s: any) => ({...s, l1_name: l1.l1_name, l2_name: l2.l2_name})))))).slice(0, 200).map((row: any) => (
                <tr key={row.id} className={styles.row}>
                  <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                  <td className={styles.sellerCell}>{row.seller_email}</td>
                  <td style={{fontSize:'0.7rem',color:'#C9A84C'}}>{row.l1_name}</td>
                  <td style={{fontSize:'0.7rem',color:'#8A8278'}}>{row.l2_name}</td>
                  <td className={styles.valueCell}>{fmt(row.pipeline_value)}</td>
                  <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                  <td><span className={`${styles.badge} ${row.status==='GREEN'?styles.badgeGreen:styles.badgeRed}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && !search.trim() && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'12px'}}>
          {l1Data.map((l1: any) => {
            const filtered = filterByDate(l1.submissions || [])
            const green = filtered.filter((s: any) => s.status === 'GREEN').length
            const red = filtered.filter((s: any) => s.status === 'RED').length
            return (
              <div key={l1.l1_email} onClick={() => setSelectedL1({...l1, filtered_submissions: filtered})} style={{
                background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'all 0.3s'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{l1.l1_name}</div><div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1.l2_count} L1 Managers</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:'1.1rem',color:'#F4631E'}}>{filtered.length}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>submissions</div></div>
                </div>
                <div style={{display:'flex',gap:'12px',fontSize:'0.65rem'}}><span style={{color:'#22C55E'}}>Green: {green}</span><span style={{color:'#EF4444'}}>Red: {red}</span><span style={{color:'#8A8278'}}>Rate: {filtered.length>0?((green/filtered.length)*100).toFixed(0):0}%</span></div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'8px'}}><div style={{height:'100%',background:'#22C55E',borderRadius:'2px',width:`${filtered.length>0?(green/filtered.length)*100:0}%`,transition:'width 0.5s'}}/></div>
              </div>
            )
          })}
        </div>
      )}

      {/* L1 Popup → L2 Cards */}
      {selectedL1 && (
        <PopupModal title={`${selectedL1.l1_name} — L1 Managers`} onClose={() => setSelectedL1(null)}>
          <div style={{marginBottom:'12px',display:'flex',gap:'8px'}}><span style={{fontSize:'0.7rem',color:'#22C55E'}}>Green: {selectedL1.filtered_submissions.filter((s:any)=>s.status==='GREEN').length}</span><span style={{fontSize:'0.7rem',color:'#EF4444'}}>Red: {selectedL1.filtered_submissions.filter((s:any)=>s.status==='RED').length}</span><span style={{fontSize:'0.7rem',color:'#8A8278'}}>Total: {selectedL1.filtered_submissions.length}</span></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => {
              const l2Filtered = filterByDate(l2.submissions || [])
              const l2Green = l2Filtered.filter((s:any)=>s.status==='GREEN').length
              return (
                <div key={l2.l2_email} onClick={(e) => { e.stopPropagation(); setSelectedL2({...l2, filtered_submissions: l2Filtered}) }} style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{l2.l2_name}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2.seller_count} sellers</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:'0.9rem',color:'#F4631E'}}>{l2Filtered.length}</div></div></div>
                  <div style={{fontSize:'0.6rem',color:'#22C55E',marginTop:'4px'}}>Green: {l2Green}</div>
                  <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}><div style={{height:'100%',background:'#22C55E',borderRadius:'2px',width:`${l2Filtered.length>0?(l2Green/l2Filtered.length)*100:0}%`}}/></div>
                </div>
              )
            })}
          </div>
        </PopupModal>
      )}

      {/* L2 Popup → Table */}
      {selectedL2 && (
        <PopupModal title={`${selectedL2.l2_name} — Submissions`} onClose={() => setSelectedL2(null)}>
          {selectedL2.filtered_submissions.length === 0 ? <div style={{textAlign:'center',padding:'30px',color:'#8A8278'}}>No submissions</div> : (
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Seller</th><th>Pipeline</th><th>Required</th><th>Status</th></tr></thead><tbody>{selectedL2.filtered_submissions.map((row: any) => (<tr key={row.id} className={styles.row}><td className={styles.dateCell}>{fmtDate(row.date)}</td><td className={styles.sellerCell}>{row.seller_email}</td><td className={styles.valueCell}>{fmt(row.pipeline_value)}</td><td className={styles.reqCell}>{fmt(row.required_daily)}</td><td><span className={`${styles.badge} ${row.status==='GREEN'?styles.badgeGreen:styles.badgeRed}`}>{row.status}</span></td></tr>))}</tbody></table></div>
          )}
        </PopupModal>
      )}
    </div>
  )
}