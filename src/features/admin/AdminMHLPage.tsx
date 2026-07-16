'use client'

import { useEffect, useState, useMemo } from 'react'
import { useStickyState } from '@/hooks/useStickyState'
import { useAdminMHL } from '@/lib/services/apiHooks'
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
  l1_name?: string
  l2_name?: string
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.ov {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 24px;
  color: #E8E4DD;
  animation: ovIn 0.7s cubic-bezier(0.16,1,0.3,1);
  position: relative;
}
.ov::before {
  content: '';
  position: fixed;
  top: -200px; right: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
/* Particles */
.ov-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; border-radius: inherit; }
.ov-particle { position: absolute; bottom: -20px; background: rgba(201,168,76,0.3); border-radius: 50%; box-shadow: 0 0 12px rgba(201,168,76,0.8); animation: floatUp linear infinite; }
@keyframes floatUp { 0% { transform: translateY(0) scale(0); opacity: 0; } 10% { opacity: 1; transform: translateY(-20px) scale(1); } 90% { opacity: 1; } 100% { transform: translateY(-800px) scale(0.5); opacity: 0; } }
@keyframes ovIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes ovPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ovSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes modalIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

/* Header */
.ov-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; z-index: 1; flex-wrap: wrap; gap: 16px; }
.ov-hdr h1 { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
.ov-hdr-sub { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 0.7rem; color: #6A6258; font-weight: 500; }
.ov-live { width: 7px; height: 7px; border-radius: 50%; background: #EF4444; animation: ovPulse 2s ease infinite; box-shadow: 0 0 10px rgba(239,68,68,0.5); }

/* Controls */
.ov-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; z-index: 1; position: relative; }
.ov-toggle { display: inline-flex; gap: 3px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.10); border-radius: 100px; padding: 4px; }
.ov-toggle-btn { padding: 7px 18px; border: none; border-radius: 100px; background: transparent; color: #6A6258; cursor: pointer; font-size: 0.72rem; font-weight: 600; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); font-family: 'Inter', sans-serif; letter-spacing: 0.02em; white-space: nowrap; }
.ov-toggle-btn:hover { color: #B0ABA4; background: rgba(255,255,255,0.04); }
.ov-toggle-btn-act { background: linear-gradient(135deg, #F4631E, #e84d0a); color: #fff; box-shadow: 0 4px 14px rgba(244,99,30,0.35); }


.ov-search-wrap { position: relative; }
.ov-search-ico { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #4A4438; pointer-events: none; }
.ov-search { width: 220px; padding: 8px 12px 8px 32px; background: rgba(18,18,18,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; color: #E8E4DD; font-size: 0.75rem; outline: none; transition: all 0.3s; font-family: 'Inter', sans-serif; }
.ov-search:focus { border-color: rgba(244,99,30,0.35); background: rgba(18,18,18,0.95); box-shadow: 0 0 0 4px rgba(244,99,30,0.06); }

/* Table */
.ov-tbl-wrap { background: rgba(14,14,14,0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.25); z-index: 1; position: relative; }
.ov-tbl { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
.ov-tbl thead tr { background: linear-gradient(90deg, rgba(201,168,76,0.03), transparent); }
.ov-tbl th { padding: 14px 18px; text-align: left; font-size: 0.6rem; font-weight: 800; color: #5A5448; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ov-tbl td { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.025); }
.ov-sel { animation: ovSlide 0.25s both; transition: background 0.2s; }
.ov-sel:hover { background: rgba(255,255,255,0.02) !important; }

/* Cards Grid */
.ov-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; z-index: 1; position: relative; }
.ov-card { background: #0F0F0F; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 18px; text-align: center; cursor: pointer; transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s; position: relative; overflow: hidden; }
.ov-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.4); border-color: rgba(244,99,30,0.3); }
.ov-kpi-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 14px 14px 0 0; }
.ov-card::before { content:''; position:absolute; inset:0; background: linear-gradient(135deg, rgba(255,255,255,0.02), transparent); opacity:0; transition:opacity 0.3s; }
.ov-card:hover::before { opacity:1; }

.ov-badge { font-size: 0.52rem; font-weight: 600; color: #8A8278; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 6px; letter-spacing: 0.04em; display: inline-flex; }
.ov-stage { display: inline-flex; padding: 3px 10px; border-radius: 12px; font-size: 0.62rem; font-weight: 700; border: 1px solid; text-transform: uppercase; letter-spacing: 0.04em; }
.ov-lead-id { color: #F4631E; font-weight: 600; text-decoration: none; transition: color 0.2s; font-family: monospace; font-size: 0.8rem; }
.ov-lead-id:hover { color: #FFA07A; }
.ov-date { color: #8A8278; font-size: 0.72rem; }

.ov-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 16px; color: #8A8278; font-size: 0.8rem; font-weight: 600; }
.ov-spinner { width: 40px; height: 40px; border: 3px solid rgba(244,99,30,0.1); border-top-color: #F4631E; border-radius: 50%; animation: spin 0.8s linear infinite; }

/* Modal */
.ov-modal-ov { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ov-modal-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); }
.ov-modal { position: relative; width: 100%; max-width: 500px; max-height: 85vh; background: rgba(18,18,18,0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05); animation: modalIn 0.4s cubic-bezier(0.16,1,0.3,1); }
@keyframes genieOut {
  0% { transform: scale(1) translateY(0); opacity: 1; }
  30% { transform: scaleX(0.95) scaleY(0.98) translateY(20px); opacity: 1; }
  100% { transform: scaleX(0.1) scaleY(0.01) translateY(60vh); opacity: 0; border-radius: 100px; }
}
.ov-modal-closing { animation: genieOut 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards !important; transform-origin: 50% 100%; }
.ov-modal-closing-wrap .ov-modal-bg { opacity: 0; transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1); }
.ov-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); background: transparent; }
.ov-modal-title { font-size: 1rem; font-weight: 600; color: #E8E4DD; margin: 0; display:flex; gap: 6px; align-items: center; letter-spacing: -0.01em; }
.ov-modal-close { width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(255,255,255,0.04); color: #8A8278; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.ov-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.ov-modal-body { flex: 1; overflow-y: auto; padding: 16px 24px 24px; }
.ov-modal-body::-webkit-scrollbar { width: 4px; }
.ov-modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

/* Accordions for Modal */
.ov-acc { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; margin-bottom: 10px; overflow: hidden; transition: border-color 0.2s; }
.ov-acc:hover { border-color: rgba(255,255,255,0.08); }
.ov-acc-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; user-select: none; }
.ov-acc-title { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; }
.ov-acc-chev { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.5rem; background: rgba(255,255,255,0.05); color: #8A8278; transition: transform 0.3s; }
.ov-acc-chev-open { transform: rotate(90deg); color: #E8E4DD; background: rgba(255,255,255,0.1); }
`

function LeadIdLink({ leadId }: { leadId: string }) {
  return <a href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${leadId}`} target="_blank" rel="noopener noreferrer" className="ov-lead-id">{leadId}</a>
}

function PopupModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: React.ReactNode }) {
  const [isClosing, setIsClosing] = useState(false)
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 420)
  }

  return (
    <div className={`ov-modal-ov ${isClosing ? 'ov-modal-closing-wrap' : ''}`}>
      <div className="ov-modal-bg" onClick={handleClose} />
      <div className={`ov-modal ${isClosing ? 'ov-modal-closing' : ''}`}>
        <div className="ov-modal-hdr">
          <h2 className="ov-modal-title">{title}</h2>
          <button className="ov-modal-close" onClick={handleClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="ov-modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function AdminMHLPage() {
  const [rawL1Data, setRawL1Data] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [selectedSeller, setSelectedSeller] = useState<any>(null)
  const [expandedStage, setExpandedStage] = useState<Record<string, boolean>>({})
  const [viewMode, setViewMode] = useStickyState<'cards' | 'table'>('cards', 'AdminMHL_viewMode')
  const [search, setSearch] = useStickyState('', 'AdminMHL_search')
  const [stageFilter, setStageFilter] = useStickyState('all', 'AdminMHL_stageFilter')
  const [filteredResults, setFilteredResults] = useState<any[]>([])

  const l1Data = useMemo(() => {
    if (stageFilter === 'all') return rawL1Data
    
    return rawL1Data.map(l1 => {
      let l1Total = 0
      const newL2 = (l1.l2_groups || []).map((l2: any) => {
        let l2Total = 0
        const newSellers = (l2.sellers || []).map((s: any) => {
          const newLeads = (s.leads || []).filter((l: any) => (l.stage || '').toLowerCase() === stageFilter)
          l2Total += newLeads.length
          return { ...s, leads: newLeads, total_leads: newLeads.length }
        }).filter((s: any) => s.leads && s.leads.length > 0)
        l1Total += l2Total
        return { ...l2, sellers: newSellers, total_leads: l2Total, seller_count: newSellers.length }
      }).filter((l2: any) => l2.total_leads > 0)
      return { ...l1, l2_groups: newL2, total_leads: l1Total, l2_count: newL2.length }
    }).filter(l1 => l1.total_leads > 0)
  }, [rawL1Data, stageFilter])

  // particles removed

  const { data: fetchedData, loading: isFetching } = useAdminMHL()

  useEffect(() => {
    if (isFetching) {
      setLoading(true)
    } else if (fetchedData) {
      setRawL1Data(fetchedData.l1_data || [])
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [fetchedData, isFetching])

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


  const totalLeads = l1Data.reduce((s: number, l: any) => s + l.total_leads, 0)
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
    <><style>{CSS}</style>
    <div className="ov">

      <div className="ov-hdr">
        <div>
          <h1>Mishandled Enquiries</h1>
          <div className="ov-hdr-sub">
            <span className="ov-live" />
            <span>{totalLeads} Total Leads &nbsp;&middot;&nbsp; {l1Data.length} Category Managers</span>
          </div>
        </div>
        
        <div className="ov-controls">
          <div className="ov-toggle">
            <button className={`ov-toggle-btn ${viewMode==='cards'?'ov-toggle-btn-act':''}`} onClick={() => setViewMode('cards')}>Cards</button>
            <button className={`ov-toggle-btn ${viewMode==='table'?'ov-toggle-btn-act':''}`} onClick={() => setViewMode('table')}>Table</button>
          </div>
          <select className="ov-search" style={{ width: 'auto', paddingLeft: '12px', textTransform: 'capitalize' }} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {Object.keys(stageColors).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="ov-search-wrap">
            <span className="ov-search-ico">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input className="ov-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller, CM..." />
          </div>
        </div>
      </div>

      {loading ? (
        <Loader text="Fetching Hierarchy..." />
      ) : (viewMode === 'table' || search.trim()) ? (
        <div className="ov-tbl-wrap">
          <table className="ov-tbl">
            <thead><tr><th>Lead ID</th><th>Stage</th><th>Seller</th><th>Category Mgr</th><th>L1 Manager</th><th>Last Call</th><th>Days</th></tr></thead>
            <tbody>
              {(search.trim() ? filteredResults : allLeadsFlat).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#8A8278', fontSize: '0.85rem' }}>
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (search.trim() ? filteredResults : allLeadsFlat).slice(0, 300).map((lead: any, i: number) => {
                const days = daysSinceCall(lead.last_call)
                const sc = stageColors[lead.stage?.toLowerCase()] || '#4A4642'
                return (
                  <tr key={lead.id || i} className="ov-sel" style={{ animationDelay: `${i*0.02}s` }}>
                    <td><LeadIdLink leadId={lead.lead_id} /></td>
                    <td><span className="ov-stage" style={{background:`${sc}18`,color:sc,border:`1px solid ${sc}30`}}>{lead.stage||'—'}</span></td>
                    <td style={{fontWeight:600}}>{lead.seller_name}</td>
                    <td style={{color:'#D4AF37'}}>{lead.l1_name}</td>
                    <td style={{color:'#8A8278'}}>{lead.l2_name}</td>
                    <td className="ov-date">{formatLastCall(lead.last_call)}</td>
                    <td>{days !== null ? <span style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E',fontWeight:700}}>{days}d</span> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ov-grid">
          {l1Data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#8A8278', fontSize: '0.9rem', gridColumn: '1 / -1' }}>
              No leads found in this stage.
            </div>
          ) : l1Data.map((l1: any, i: number) => (
            <div key={l1.l1_email} className="ov-card" style={{ animation: `ovSlide 0.4s ${i*0.05}s both` }} onClick={() => setSelectedL1(l1)}>
              <div className="ov-kpi-bar" style={{ background: '#F4631E' }} />
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{textAlign:'left'}}>
                  <div style={{fontWeight:800,fontSize:'1rem',color:'#E8E4DD',marginBottom:'4px'}}>{l1.l1_name}</div>
                  <span className="ov-badge">{l1.l2_count} L1 Managers</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:900,fontSize:'1.4rem',color:'#EF4444',lineHeight:'1'}}>{l1.total_leads}</div>
                  <div style={{fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase',letterSpacing:'0.05em',marginTop:'4px'}}>Leads</div>
                  {l1.mhe_pct !== undefined && (
                    <div style={{ marginTop: '6px', fontSize: '0.65rem', fontWeight: 700,
                      color: l1.mhe_pct >= 30 ? '#EF4444' : l1.mhe_pct >= 15 ? '#F59E0B' : '#22C55E',
                      background: l1.mhe_pct >= 30 ? 'rgba(239,68,68,0.1)' : l1.mhe_pct >= 15 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${l1.mhe_pct >= 30 ? 'rgba(239,68,68,0.2)' : l1.mhe_pct >= 15 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      padding: '2px 8px', borderRadius: '20px', display: 'inline-block' }}>
                      {l1.mhe_pct}% MHE
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedL1 && (
        <PopupModal title={<><span style={{color:'#8A8278', fontWeight:500}}>Category Mgr /</span> {selectedL1.l1_name}</>} onClose={() => setSelectedL1(null)}>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {selectedL1.l2_groups.map((l2: any) => (
              <div key={l2.l2_email} className="ov-acc" onClick={(e) => { e.stopPropagation(); setSelectedL2(l2) }} style={{padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'}}>
                <div>
                  <div style={{fontWeight:600, fontSize:'0.85rem', color:'#E8E4DD'}}>{l2.l2_name}</div>
                  <div style={{fontSize:'0.65rem', color:'#8A8278', marginTop:'4px'}}>{l2.seller_count} Sellers</div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {l2.mhe_pct !== undefined && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700,
                      color: l2.mhe_pct >= 30 ? '#EF4444' : l2.mhe_pct >= 15 ? '#F59E0B' : '#22C55E',
                      background: l2.mhe_pct >= 30 ? 'rgba(239,68,68,0.1)' : l2.mhe_pct >= 15 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${l2.mhe_pct >= 30 ? 'rgba(239,68,68,0.2)' : l2.mhe_pct >= 15 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      padding: '2px 8px', borderRadius: '20px' }}>
                      {l2.mhe_pct}% MHE
                    </span>
                  )}
                  <span className="ov-badge" style={{color:'#D4AF37', background:'rgba(212,175,76,0.1)', borderColor:'rgba(212,175,76,0.2)'}}>{l2.total_leads} Leads</span>
                  <span className="ov-acc-chev" style={{transform:'rotate(0deg)'}}>▶</span>
                </div>
              </div>
            ))}
          </div>
        </PopupModal>
      )}

      {selectedL2 && (
        <PopupModal title={<><span style={{color:'#8A8278', fontWeight:500}}>L1 Mgr /</span> {selectedL2.l2_name}</>} onClose={() => setSelectedL2(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {selectedL2.sellers.map((s: any) => (
              <div key={s.seller_email} onClick={() => setSelectedSeller(s)} className="ov-acc" style={{padding:'14px 18px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:700,fontSize:'0.85rem',color:'#E8E4DD',display:'block'}}>{s.seller_name}</span>
                  {s.total_open_leads > 0 && <span style={{fontSize:'0.65rem',color:'#8A8278'}}>{s.total_open_leads} open leads</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  {s.mhe_pct !== undefined && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 700,
                      color: s.mhe_pct >= 30 ? '#EF4444' : s.mhe_pct >= 15 ? '#F59E0B' : '#22C55E',
                      background: s.mhe_pct >= 30 ? 'rgba(239,68,68,0.1)' : s.mhe_pct >= 15 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                      border: `1px solid ${s.mhe_pct >= 30 ? 'rgba(239,68,68,0.2)' : s.mhe_pct >= 15 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      padding: '2px 8px', borderRadius: '20px' }}>
                      {s.mhe_pct}% MHE
                    </span>
                  )}
                  <span className="ov-badge" style={{color:'#EF4444',background:'rgba(239,68,68,0.1)',borderColor:'rgba(239,68,68,0.2)'}}>{s.total_leads} Leads</span>
                  <span className="ov-acc-chev" style={{transform:'rotate(0deg)'}}>▶</span>
                </div>
              </div>
            ))}
          </div>
        </PopupModal>
      )}

      {selectedSeller && (
        <PopupModal title={<><span style={{color:'#8A8278', fontWeight:500}}>Seller /</span> {selectedSeller.seller_name}</>} onClose={() => setSelectedSeller(null)}>
          {selectedSeller.stageGroups && Object.entries(selectedSeller.stageGroups).map(([stage, leads]: [string, any]) => {
            const isExpanded = expandedStage[stage] === true
            const sc = stageColors[stage?.toLowerCase()] || '#4A4642'
            return (
              <div key={stage} className="ov-acc">
                <div className={`ov-acc-hdr ${isExpanded?'ov-acc-hdr-open':''}`} onClick={() => toggleStage(stage)}>
                  <div className="ov-acc-title">
                    <span className={`ov-acc-chev ${isExpanded?'ov-acc-chev-open':''}`}>▶</span>
                    <span className="ov-stage" style={{background:`${sc}18`,color:sc,border:`1px solid ${sc}30`}}>{stage || 'Unknown'}</span>
                  </div>
                  <span className="ov-badge">{leads.length} Leads</span>
                </div>
                {isExpanded && (
                  <table className="ov-tbl" style={{width:'100%'}}>
                    <thead><tr><th>Lead ID</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>
                      {leads.map((lead: any, i:number) => {
                        const days = daysSinceCall(lead.last_call)
                        return (
                          <tr key={lead.id} className="ov-sel" style={{animationDelay:`${i*0.02}s`}}>
                            <td><LeadIdLink leadId={lead.lead_id} /></td>
                            <td className="ov-date">{formatLastCall(lead.last_call)}</td>
                            <td>{days !== null ? <span style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E',fontWeight:700}}>{days}d</span> : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
        </PopupModal>
      )}
    </div>
    </>
  )
}