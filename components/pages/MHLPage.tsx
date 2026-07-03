'use client'

import { useEffect, useState, useMemo } from 'react'
import { UserSession } from '@/lib/session'

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

interface HomePageProps {
  session: UserSession
}

const stageColors: Record<string, string> = {
  'yet to act':           '#EF4444',
  'yet to establish contact': '#EF4444',
  'information gathering':'#F59E0B',
  'itinerary preparation':'#3B82F6',
  'template shared':      '#3B82F6',
  'preview link shared':  '#8B5CF6',
  'payment linked shared':'#22C55E',
  'negotiation':          '#8B5CF6',
  'follow up':            '#F4631E',
  'closed':               '#22C55E',
  'under feasibility':    '#F59E0B',
}

function formatLastCall(val: string | null) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return val }
}

function daysSinceCall(val: string | null): number | null {
  if (!val) return null
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    const diff = Date.now() - d.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  } catch { return null }
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

/* Header */
.ov-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.04); position: relative; z-index: 1; flex-wrap: wrap; gap: 16px; }
.ov-hdr h1 { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
.ov-hdr-sub { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 0.7rem; color: #6A6258; font-weight: 500; }
.ov-live { width: 7px; height: 7px; border-radius: 50%; background: #EF4444; animation: ovPulse 2s ease infinite; box-shadow: 0 0 10px rgba(239,68,68,0.5); }

/* Controls */
.ov-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; z-index: 1; position: relative; }
.ov-toggle { display: flex; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 3px; }
.ov-toggle-btn { padding: 6px 14px; border: none; border-radius: 8px; background: transparent; color: #8A8278; cursor: pointer; font-size: 0.72rem; font-weight: 600; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.ov-toggle-btn-act { background: rgba(244,99,30,0.15); color: #F4631E; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

.ov-search-wrap { position: relative; }
.ov-search-ico { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #4A4438; pointer-events: none; }
.ov-search { width: 220px; padding: 8px 12px 8px 32px; background: rgba(18,18,18,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; color: #E8E4DD; font-size: 0.75rem; outline: none; transition: all 0.3s; font-family: 'Inter', sans-serif; }
.ov-search:focus { border-color: rgba(244,99,30,0.35); background: rgba(18,18,18,0.95); box-shadow: 0 0 0 4px rgba(244,99,30,0.06); }
.ov-select { padding: 8px 12px; background: rgba(18,18,18,0.8); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; color: #E8E4DD; font-size: 0.75rem; cursor: pointer; outline: none; font-family: 'Inter', sans-serif; }
.ov-select option { background: #141414; }

/* Table */
.ov-tbl-wrap { background: rgba(14,14,14,0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.25); z-index: 1; position: relative; }
.ov-tbl { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
.ov-tbl thead tr { background: linear-gradient(90deg, rgba(201,168,76,0.03), transparent); }
.ov-tbl th { padding: 14px 18px; text-align: left; font-size: 0.6rem; font-weight: 800; color: #5A5448; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.06); }
.ov-tbl td { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.025); }
.ov-sel { animation: ovSlide 0.25s both; transition: background 0.2s; }
.ov-sel:hover { background: rgba(255,255,255,0.02) !important; }

/* Accordions */
.ov-accs { display: flex; flex-direction: column; gap: 12px; z-index: 1; position: relative; }
.ov-acc { background: rgba(14,14,14,0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: all 0.3s; }
.ov-acc:hover { border-color: rgba(255,255,255,0.1); }
.ov-acc-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; user-select: none; transition: background 0.25s; }
.ov-acc-hdr:hover { background: rgba(255,255,255,0.03); }
.ov-acc-hdr-open { background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.04); }
.ov-acc-title { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #E8E4DD; font-size: 0.8rem; }
.ov-acc-chev { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.5rem; background: rgba(244,99,30,0.1); color: #F4631E; border: 1px solid rgba(244,99,30,0.15); transition: transform 0.3s; }
.ov-acc-chev-open { transform: rotate(90deg); background: rgba(244,99,30,0.2); }

.ov-badge { font-size: 0.52rem; font-weight: 600; color: #8A8278; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 6px; letter-spacing: 0.04em; }
.ov-stage { display: inline-flex; padding: 3px 10px; border-radius: 12px; font-size: 0.62rem; font-weight: 700; border: 1px solid; text-transform: uppercase; letter-spacing: 0.04em; }
.ov-lead-id { color: #F4631E; font-weight: 600; text-decoration: none; transition: color 0.2s; font-family: monospace; font-size: 0.8rem; }
.ov-lead-id:hover { color: #FFA07A; }
.ov-date { color: #8A8278; font-size: 0.72rem; }

.ov-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 16px; color: #8A8278; font-size: 0.8rem; font-weight: 600; }
.ov-spinner { width: 40px; height: 40px; border: 3px solid rgba(244,99,30,0.1); border-top-color: #F4631E; border-radius: 50%; animation: spin 0.8s linear infinite; }
`

export default function MHLPage({ session }: HomePageProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'mine' | 'team'>(
    session.role === 'L1' ? 'team' : 'mine'
  )
  const [tableView, setTableView] = useState(false)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  const particles = useMemo(() => {
    return Array.from({ length: 25 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      dur: `${6 + Math.random() * 10}s`,
      size: `${2 + Math.random() * 4}px`
    }))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ email: session.email, role: session.role, view })
        const res = await fetch(`/api/mhl?${params}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setLeads(json)
      } catch { setError('Failed to load leads') }
      finally { setLoading(false) }
    }
    load()
  }, [session.email, session.role, view])

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.lead_id.toLowerCase().includes(search.toLowerCase()) ||
      l.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      (l.stage || '').toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    return matchSearch && matchStage
  })

  const groupedLeads = view === 'team'
    ? filtered.reduce((acc: any, lead: Lead) => {
        const owner = lead.owner_email
        if (!acc[owner]) acc[owner] = []
        acc[owner].push(lead)
        return acc
      }, {})
    : null

  const stageGroups = view === 'mine'
    ? filtered.reduce((acc: any, lead: Lead) => {
        const stage = lead.stage || 'unknown'
        if (!acc[stage]) acc[stage] = []
        acc[stage].push(lead)
        return acc
      }, {})
    : null

  const sellerSummary = view === 'team'
    ? Object.entries(groupedLeads || {}).map(([owner, leads]: [string, any]) => ({
        owner,
        name: leads[0]?.seller_name || owner.split('@')[0],
        total: leads.length,
        lastCall: leads.reduce((latest: string, l:Lead) => l.last_call && (!latest || l.last_call > latest) ? l.last_call : latest, '')
      }))
    : []

  const toggleSeller = (owner: string) => setExpandedSellers(prev=>({...prev,[owner]:!prev[owner]}))
  const toggleStage = (stage: string) => setExpandedStages(prev=>({...prev,[stage]:!prev[stage]}))

  return (
    <><style>{CSS}</style>
    <div className="ov">
      <div className="ov-particles">
        {particles.map((p, i) => (
          <div key={i} className="ov-particle" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur, width: p.size, height: p.size }}/>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="ov-hdr">
        <div>
          <h1>Mishandled Enquiries</h1>
          <div className="ov-hdr-sub">
            <span className="ov-live" />
            <span>{filtered.length} Leads matching criteria</span>
          </div>
        </div>
        
        <div className="ov-controls">
          {isManager && (
            <div className="ov-toggle">
              <button className={`ov-toggle-btn ${view==='mine'?'ov-toggle-btn-act':''}`} onClick={()=>setView('mine')}>My Leads</button>
              <button className={`ov-toggle-btn ${view==='team'?'ov-toggle-btn-act':''}`} onClick={()=>setView('team')}>Team View</button>
              {view==='team' && <button className={`ov-toggle-btn ${tableView?'ov-toggle-btn-act':''}`} onClick={()=>setTableView(!tableView)}>Table</button>}
            </div>
          )}
          <div className="ov-search-wrap">
            <span className="ov-search-ico">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input className="ov-search" placeholder="Search ID or Stage..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select className="ov-select" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {[...new Set(leads.map(l=>l.stage).filter(Boolean))].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ov-loading"><div className="ov-spinner" /><p>Fetching Mishandled Leads...</p></div>
      ) : error ? (
        <div className="ov-loading" style={{color:'#EF4444'}}><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className="ov-loading"><p>No leads found matching criteria.</p></div>
      ) : view === 'team' && tableView ? (
        <div className="ov-tbl-wrap">
          <table className="ov-tbl">
            <thead><tr><th>Seller</th><th>Total Leads</th><th>Last Call</th></tr></thead>
            <tbody>
              {sellerSummary.map((s, i)=>(
                <tr key={s.owner} className="ov-sel" style={{ animationDelay: `${i*0.03}s` }}>
                  <td style={{fontWeight:600, color:'#E8E4DD'}}>{s.name}</td>
                  <td style={{fontWeight:800, color:'#D4AF37'}}>{s.total}</td>
                  <td className="ov-date">{s.lastCall ? formatLastCall(s.lastCall) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'team' && groupedLeads ? (
        <div className="ov-accs">
          {Object.entries(groupedLeads).map(([owner, leads]: [string, any]) => {
            const sellerName = leads[0]?.seller_name || owner.split('@')[0]
            const isExpanded = expandedSellers[owner] === true
            return (
              <div key={owner} className="ov-acc">
                <div className={`ov-acc-hdr ${isExpanded?'ov-acc-hdr-open':''}`} onClick={()=>toggleSeller(owner)}>
                  <div className="ov-acc-title">
                    <span className={`ov-acc-chev ${isExpanded?'ov-acc-chev-open':''}`}>▶</span>
                    {sellerName}
                  </div>
                  <span className="ov-badge">Total: {leads.length}</span>
                </div>
                {isExpanded && (
                  <table className="ov-tbl">
                    <thead><tr><th>Lead ID</th><th>Stage</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{leads.map((lead:Lead, i:number)=>{
                      const days=daysSinceCall(lead.last_call)
                      const sc=stageColors[lead.stage?.toLowerCase()]||'#4A4642'
                      return (
                        <tr key={lead.id} className="ov-sel" style={{ animationDelay: `${i*0.03}s` }}>
                          <td>
                            <a href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${lead.lead_id}`} target="_blank" rel="noreferrer" className="ov-lead-id">{lead.lead_id}</a>
                          </td>
                          <td>
                            <span className="ov-stage" style={{background:`${sc}18`,color:sc,borderColor:`${sc}30`}}>{lead.stage||'—'}</span>
                          </td>
                          <td className="ov-date">{formatLastCall(lead.last_call)}</td>
                          <td>{days!==null?<span style={{fontWeight:700,color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E'}}>{days}d</span>:'—'}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="ov-accs">
          {stageGroups && Object.entries(stageGroups).map(([stage, leads]: [string, any]) => {
            const isExpanded = expandedStages[stage] === true
            const sc = stageColors[stage?.toLowerCase()]||'#4A4642'
            return (
              <div key={stage} className="ov-acc">
                <div className={`ov-acc-hdr ${isExpanded?'ov-acc-hdr-open':''}`} onClick={()=>toggleStage(stage)}>
                  <div className="ov-acc-title">
                    <span className={`ov-acc-chev ${isExpanded?'ov-acc-chev-open':''}`}>▶</span>
                    <span className="ov-stage" style={{background:`${sc}18`,color:sc,borderColor:`${sc}30`}}>{stage||'Unknown'}</span>
                  </div>
                  <span className="ov-badge">Total: {leads.length}</span>
                </div>
                {isExpanded && (
                  <table className="ov-tbl">
                    <thead><tr><th>Lead ID</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{leads.map((lead:Lead, i:number)=>{
                      const days=daysSinceCall(lead.last_call)
                      return (
                        <tr key={lead.id} className="ov-sel" style={{ animationDelay: `${i*0.03}s` }}>
                          <td>
                            <a href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${lead.lead_id}`} target="_blank" rel="noreferrer" className="ov-lead-id">{lead.lead_id}</a>
                          </td>
                          <td className="ov-date">{formatLastCall(lead.last_call)}</td>
                          <td>{days!==null?<span style={{fontWeight:700,color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E'}}>{days}d</span>:'—'}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
    </>
  )
}