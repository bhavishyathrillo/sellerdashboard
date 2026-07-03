'use client'

import { useEffect, useState } from 'react'
import styles from './MHLPage.module.css'
import Loader from '@/components/ui/Loader'

interface Lead {
  id: number
  lead_id: string
  stage: string
  owner_email: string
  last_call: string | null
  mhl_mho: string
  l1: string | null
  l2: string | null
  seller_name?: string
}

const stageColors: Record<string, string> = {
  'yet to act': '#EF4444', 'yet to establish contact': '#EF4444',
  'information gathering': '#F59E0B', 'itinerary preparation': '#3B82F6',
  'template shared': '#3B82F6', 'preview link shared': '#8B5CF6',
  'payment linked shared': '#22C55E', 'negotiation': '#8B5CF6',
  'follow up': '#F4631E', 'closed': '#22C55E', 'under feasibility': '#F59E0B',
}

function formatLastCall(val: string | null) {
  if (!val) return '—'
  try { const d = new Date(val); if (isNaN(d.getTime())) return val; return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return val }
}

function daysSinceCall(val: string | null): number | null {
  if (!val) return null
  try { const d = new Date(val); if (isNaN(d.getTime())) return null; return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)) } catch { return null }
}

function LeadIdLink({ leadId }: { leadId: string }) {
  return <a href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${leadId}`} target="_blank" rel="noopener noreferrer" className={styles.leadId} style={{textDecoration:'none',cursor:'pointer'}}>{leadId}</a>
}

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

export default function AdminMHLPage() {
  const [l1Data, setL1Data] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [selectedSeller, setSelectedSeller] = useState<any>(null)
  const [expandedStage, setExpandedStage] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filteredResults, setFilteredResults] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/mhl')
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
        l2.sellers?.forEach((seller: any) => {
          const sellerMatch = seller.seller_name?.toLowerCase().includes(q) || seller.seller_email?.toLowerCase().includes(q)
          if (l1Match || l2Match || sellerMatch) {
            seller.leads?.forEach((lead: any) => {
              results.push({ ...lead, l1_name: l1.l1_name, l2_name: l2.l2_name, seller_name: seller.seller_name })
            })
          }
        })
      })
    })
    const seen = new Set()
    setFilteredResults(results.filter(r => { const k = r.id || r.lead_id; if (seen.has(k)) return false; seen.add(k); return true }))
  }, [search, l1Data])

  const toggleStage = (stage: string) => setExpandedStage((p: any) => ({ ...p, [stage]: !p[stage] }))

  if (loading) return <Loader text="Loading..." />

  const totalLeads = l1Data.reduce((s: number, l: any) => s + l.total_leads, 0)

  // Flatten all leads for table view
  const allLeadsFlat: any[] = []
  l1Data.forEach((l1: any) => {
    l1.l2_groups?.forEach((l2: any) => {
      l2.sellers?.forEach((seller: any) => {
        seller.leads?.forEach((lead: any) => {
          allLeadsFlat.push({ ...lead, l1_name: l1.l1_name, l2_name: l2.l2_name, seller_name: seller.seller_name })
        })
      })
    })
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.counts}>
            <div className={styles.countBadge}>
              <span className={styles.countNum}>{totalLeads}</span><span className={styles.countLabel}>Total Leads</span>
            </div>
            <div className={styles.countBadge}>
              <span className={styles.countNum}>{l1Data.length}</span><span className={styles.countLabel}>Category Managers</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* View Toggle */}
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
            <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
          </div>
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search seller, Category Mgr, L1 Mgr..."
            style={{
              padding:'7px 12px',background:'#141414',border:'1px solid #232323',
              borderRadius:'8px',color:'#F0EDE8',fontSize:'0.72rem',outline:'none',width:'220px'
            }}
          />
        </div>
      </div>

      {/* TABLE VIEW */}
      {(viewMode === 'table' || search.trim()) && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Lead ID</th><th>Stage</th><th>Seller</th><th>Category Mgr</th><th>L1 Manager</th><th>Last Call</th><th>Days</th></tr></thead>
            <tbody>
              {(search.trim() ? filteredResults : allLeadsFlat).slice(0, 300).map((lead: any, i: number) => {
                const days = daysSinceCall(lead.last_call)
                const sc = stageColors[lead.stage?.toLowerCase()] || '#4A4642'
                return (
                  <tr key={lead.id || i}>
                    <td><LeadIdLink leadId={lead.lead_id} /></td>
                    <td><span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'0.65rem',fontWeight:600,background:`${sc}18`,color:sc,border:`1px solid ${sc}30`}}>{lead.stage||'—'}</span></td>
                    <td style={{fontSize:'0.72rem',fontWeight:500}}>{lead.seller_name}</td>
                    <td style={{fontSize:'0.68rem',color:'#C9A84C'}}>{lead.l1_name}</td>
                    <td style={{fontSize:'0.68rem',color:'#8A8278'}}>{lead.l2_name}</td>
                    <td className={styles.dateCell}>{formatLastCall(lead.last_call)}</td>
                    <td>{days !== null ? <span style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E',fontWeight:600}}>{days}d</span> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && !search.trim() && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px'}}>
          {l1Data.map((l1: any) => (
            <div key={l1.l1_email} onClick={() => setSelectedL1(l1)} style={{
              background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'all 0.3s'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{l1.l1_name}</div><div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1.l2_count} L1 Managers</div></div>
                <div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:'1.1rem',color:'#EF4444'}}>{l1.total_leads}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>leads</div></div>
              </div>
              <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'8px'}}><div style={{height:'100%',background:'#EF4444',borderRadius:'2px',width:`${Math.min((l1.total_leads/Math.max(totalLeads,1))*100,100)}%`}}/></div>
            </div>
          ))}
        </div>
      )}

      {/* L1 Popup → L2 Cards */}
      {selectedL1 && (
        <PopupModal title={`${selectedL1.l1_name} — L1 Managers`} onClose={() => setSelectedL1(null)}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => (
              <div key={l2.l2_email} onClick={(e) => { e.stopPropagation(); setSelectedL2(l2) }} style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{l2.l2_name}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2.seller_count} sellers</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:'1rem',color:'#EF4444'}}>{l2.total_leads}</div><div style={{fontSize:'0.55rem',color:'#8A8278'}}>leads</div></div></div>
              </div>
            ))}
          </div>
        </PopupModal>
      )}

      {/* L2 Popup → Sellers */}
      {selectedL2 && (
        <PopupModal title={`${selectedL2.l2_name} — Sellers`} onClose={() => setSelectedL2(null)}>
          {selectedL2.sellers.map((s: any) => (
            <div key={s.seller_email} onClick={() => setSelectedSeller(s)} style={{background:'#141414',border:'1px solid #232323',borderRadius:'10px',padding:'12px',marginBottom:'6px',cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span style={{fontWeight:600,fontSize:'0.8rem',display:'block'}}>{s.seller_name}</span><span style={{fontSize:'0.6rem',color:'#8A8278'}}>{s.total_leads} leads</span></div><ChevronRight /></div>
            </div>
          ))}
        </PopupModal>
      )}

      {/* Seller Popup → Stage-grouped leads */}
      {selectedSeller && (
        <PopupModal title={`${selectedSeller.seller_name} — Leads`} onClose={() => setSelectedSeller(null)}>
          {selectedSeller.stageGroups && Object.entries(selectedSeller.stageGroups).map(([stage, leads]: [string, any]) => {
            const isExpanded = expandedStage[stage] === true
            const sc = stageColors[stage?.toLowerCase()] || '#4A4642'
            return (
              <div key={stage} style={{marginBottom:'8px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'10px',overflow:'hidden'}}>
                <div onClick={() => toggleStage(stage)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',cursor:'pointer',background:'rgba(255,255,255,0.02)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'0.7rem',color:'#8A8278'}}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</span><span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'0.65rem',fontWeight:600,background:`${sc}18`,color:sc,border:`1px solid ${sc}30`}}>{stage || 'Unknown'}</span></div>
                  <span style={{fontSize:'0.65rem',color:'#8A8278'}}>{leads.length} leads</span>
                </div>
                {isExpanded && (
                  <table className={styles.table} style={{width:'100%'}}><thead><tr><th>Lead ID</th><th>Last Call</th><th>Days</th></tr></thead><tbody>{leads.map((lead: any) => { const days = daysSinceCall(lead.last_call); return (<tr key={lead.id}><td><LeadIdLink leadId={lead.lead_id} /></td><td className={styles.dateCell}>{formatLastCall(lead.last_call)}</td><td>{days !== null ? <span style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E',fontWeight:600}}>{days}d</span> : '—'}</td></tr>) })}</tbody></table>
                )}
              </div>
            )
          })}
        </PopupModal>
      )}
    </div>
  )
}