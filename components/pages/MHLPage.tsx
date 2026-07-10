'use client'

import { useEffect, useState, useMemo } from 'react'
import { UserSession } from '@/lib/session'
import { useStickyState } from '@/components/hooks/useStickyState'

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
  owner_open_leads?: number
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

function MhePill({ pct }: { pct: number }) {
  const color = pct >= 30 ? '#EF4444' : pct >= 15 ? '#F59E0B' : '#22C55E'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '20px', fontSize: '0.6rem', fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      letterSpacing: '0.02em'
    }}>
      {pct}% MHE
    </span>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.ov {
  font-family: 'Inter', -apple-system, sans-serif;
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 24px 48px;
  color: #F0EDE8;
  animation: ovIn 0.4s ease both;
}
@keyframes ovIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
@keyframes ovPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes ovSlide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin { to{transform:rotate(360deg)} }

/* Header */
.ov-hdr { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 16px; }
.ov-hdr h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.025em; background: linear-gradient(135deg, #D4AF37, #F5E6A3, #D4AF37); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
.ov-hdr-sub { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 0.75rem; color: #8A8278; font-weight: 500; }
.ov-live { width: 7px; height: 7px; border-radius: 50%; background: #EF4444; animation: ovPulse 2s ease infinite; box-shadow: 0 0 8px rgba(239,68,68,0.5); flex-shrink: 0; }

/* Summary Bar */
.ov-summary { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.ov-stat { background: #0F0F0F; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 18px; display: flex; flex-direction: column; gap: 2px; min-width: 120px; position: relative; overflow: hidden; transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s, border-color 0.22s; cursor: default; }
.ov-stat:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.4); border-color: rgba(244,99,30,0.3); }
.ov-stat-val { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1; font-family: 'Inter', sans-serif; }
.ov-stat-lbl { font-size: 0.58rem; color: #6A6258; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; font-family: 'Inter', sans-serif; }
.ov-stat-strip { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 14px 14px 0 0; }

/* Controls */
.ov-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.ov-toggle { display: inline-flex; gap: 3px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.10); border-radius: 100px; padding: 4px; }
.ov-toggle-btn { padding: 7px 18px; border: none; border-radius: 100px; background: transparent; color: #6A6258; cursor: pointer; font-size: 0.72rem; font-weight: 600; transition: all 0.22s cubic-bezier(0.4,0,0.2,1); font-family: 'Inter', sans-serif; letter-spacing: 0.02em; white-space: nowrap; }
.ov-toggle-btn:hover { color: #B0ABA4; background: rgba(255,255,255,0.04); }
.ov-toggle-btn-act { background: linear-gradient(135deg, #F4631E, #e84d0a); color: #fff; box-shadow: 0 4px 14px rgba(244,99,30,0.35); }


.ov-search-wrap { position: relative; }
.ov-search-ico { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #5A5448; pointer-events: none; }
.ov-search { width: 220px; padding: 8px 12px 8px 32px; background: #111111; border: 1px solid #1E1E1E; border-radius: 10px; color: #F0EDE8; font-size: 0.75rem; outline: none; transition: border-color 0.2s; font-family: 'Inter', sans-serif; }
.ov-search:focus { border-color: rgba(244,99,30,0.4); }
.ov-select { padding: 8px 12px; background: #111111; border: 1px solid #1E1E1E; border-radius: 10px; color: #F0EDE8; font-size: 0.75rem; cursor: pointer; outline: none; font-family: 'Inter', sans-serif; }
.ov-select option { background: #141414; }

/* Table */
.ov-tbl-wrap { background: #111111; border: 1px solid #1E1E1E; border-radius: 14px; overflow: hidden; }
.ov-tbl { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
.ov-tbl thead tr { background: rgba(255,255,255,0.02); }
.ov-tbl th { padding: 12px 16px; text-align: left; font-size: 0.62rem; font-weight: 700; color: #6A6258; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #1E1E1E; }
.ov-tbl td { padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }
.ov-tbl tr:last-child td { border-bottom: none; }
.ov-sel { animation: ovSlide 0.2s both; transition: background 0.15s; }
.ov-sel:hover { background: rgba(255,255,255,0.02) !important; }

/* Accordions */
.ov-accs { display: flex; flex-direction: column; gap: 10px; }
.ov-acc { background: #111111; border: 1px solid #1E1E1E; border-radius: 12px; overflow: hidden; transition: border-color 0.2s; }
.ov-acc:hover { border-color: #2a2a2a; }
.ov-acc-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; cursor: pointer; user-select: none; transition: background 0.2s; }
.ov-acc-hdr:hover { background: rgba(255,255,255,0.02); }
.ov-acc-hdr-open { background: rgba(255,255,255,0.015); border-bottom: 1px solid #1E1E1E; }
.ov-acc-title { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #F0EDE8; font-size: 0.82rem; }
.ov-acc-chev { width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.46rem; background: rgba(244,99,30,0.1); color: #F4631E; border: 1px solid rgba(244,99,30,0.15); transition: transform 0.25s; }
.ov-acc-chev-open { transform: rotate(90deg); background: rgba(244,99,30,0.18); }
.ov-acc-meta { display: flex; align-items: center; gap: 8px; }

.ov-badge { font-size: 0.58rem; font-weight: 600; color: #8A8278; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 6px; letter-spacing: 0.03em; }
.ov-stage { display: inline-flex; padding: 3px 10px; border-radius: 12px; font-size: 0.6rem; font-weight: 700; border: 1px solid; text-transform: uppercase; letter-spacing: 0.04em; }
.ov-lead-id { color: #F4631E; font-weight: 600; text-decoration: none; transition: color 0.2s; font-family: monospace; font-size: 0.8rem; }
.ov-lead-id:hover { color: #FFA07A; }
.ov-date { color: #8A8278; font-size: 0.72rem; }

.ov-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; gap: 14px; color: #8A8278; font-size: 0.8rem; font-weight: 600; }
.ov-spinner { width: 38px; height: 38px; border: 3px solid rgba(244,99,30,0.1); border-top-color: #F4631E; border-radius: 50%; animation: spin 0.75s linear infinite; }
`

export default function MHLPage({ session }: HomePageProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [totalOpenLeads, setTotalOpenLeads] = useState(0)
  const [openCountMap, setOpenCountMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useStickyState<'mine' | 'team'>(
    session.role === 'L1' ? 'team' : 'mine', 'MHLPage_view'
  )
  const [tableView, setTableView] = useStickyState(false, 'MHLPage_tableView')
  const [search, setSearch] = useStickyState('', 'MHLPage_search')
  const [stageFilter, setStageFilter] = useStickyState('all', 'MHLPage_stageFilter')
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ email: session.email, role: session.role, view })
        const res = await fetch(`/api/mhl?${params}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setLeads(json.leads || [])
        setTotalOpenLeads(json.totalOpenLeads || 0)
        setOpenCountMap(json.openCountMap || {})
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
    ? Object.entries(groupedLeads || {}).map(([owner, ownerLeads]: [string, any]) => ({
        owner,
        name: ownerLeads[0]?.seller_name || owner.split('@')[0],
        total: ownerLeads.length,
        openLeads: openCountMap[owner] || 0,
        mhePct: openCountMap[owner] ? Math.round((ownerLeads.length / openCountMap[owner]) * 100) : 0,
        lastCall: ownerLeads.reduce((latest: string, l: Lead) => l.last_call && (!latest || l.last_call > latest) ? l.last_call : latest, '')
      })).sort((a, b) => b.mhePct - a.mhePct)
    : []

  const toggleSeller = (owner: string) => setExpandedSellers(prev=>({...prev,[owner]:!prev[owner]}))
  const toggleStage = (stage: string) => setExpandedStages(prev=>({...prev,[stage]:!prev[stage]}))

  // Overall MHE%
  const overallMhePct = totalOpenLeads > 0 ? Math.round((filtered.length / totalOpenLeads) * 100) : 0

  return (
    <><style>{CSS}</style>
    <div className="ov">

      {/* ── Header ── */}
      <div className="ov-hdr">
        <div>
          <h1>Mishandled Enquiries</h1>
          <div className="ov-hdr-sub">
            <span className="ov-live" />
            <span>{filtered.length} mishandled · {totalOpenLeads} total open</span>
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

      {/* ── Summary Bar ── */}
      {!loading && !error && (
        <div className="ov-summary">
          <div className="ov-stat" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
            <div className="ov-stat-strip" style={{ background: '#EF4444' }} />
            <span className="ov-stat-val" style={{ color: '#EF4444' }}>{filtered.length}</span>
            <span className="ov-stat-lbl">Mishandled Leads</span>
          </div>
          <div className="ov-stat">
            <div className="ov-stat-strip" style={{ background: 'linear-gradient(90deg, #F4631E, #C9A84C)' }} />
            <span className="ov-stat-val" style={{ color: '#F0EDE8' }}>{totalOpenLeads}</span>
            <span className="ov-stat-lbl">Total Open Leads</span>
          </div>
          <div className="ov-stat" style={{ borderColor: overallMhePct >= 30 ? 'rgba(239,68,68,0.25)' : overallMhePct >= 15 ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)' }}>
            <div className="ov-stat-strip" style={{ background: overallMhePct >= 30 ? '#EF4444' : overallMhePct >= 15 ? '#F59E0B' : '#22C55E' }} />
            <span className="ov-stat-val" style={{ color: overallMhePct >= 30 ? '#EF4444' : overallMhePct >= 15 ? '#F59E0B' : '#22C55E' }}>{overallMhePct}%</span>
            <span className="ov-stat-lbl">MHE Rate</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="ov-loading"><div className="ov-spinner" /><p>Fetching Mishandled Leads...</p></div>
      ) : error ? (
        <div className="ov-loading" style={{color:'#EF4444'}}><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className="ov-loading"><p>No leads found matching criteria.</p></div>
      ) : view === 'team' && tableView ? (
        <div className="ov-tbl-wrap">
          <table className="ov-tbl">
            <thead><tr>
              <th>Seller</th>
              <th>Mishandled</th>
              <th>Open Leads</th>
              <th>MHE %</th>
              <th>Last Call</th>
            </tr></thead>
            <tbody>
              {sellerSummary.map((s, i)=>(
                <tr key={s.owner} className="ov-sel" style={{ animationDelay: `${i*0.03}s` }}>
                  <td style={{fontWeight:600, color:'#F0EDE8'}}>{s.name}</td>
                  <td style={{fontWeight:700, color:'#EF4444'}}>{s.total}</td>
                  <td style={{color:'#8A8278'}}>{s.openLeads || '—'}</td>
                  <td><MhePill pct={s.mhePct} /></td>
                  <td className="ov-date">{s.lastCall ? formatLastCall(s.lastCall) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'team' && groupedLeads ? (
        <div className="ov-accs">
          {Object.entries(groupedLeads).map(([owner, ownerLeads]: [string, any]) => {
            const sellerName = ownerLeads[0]?.seller_name || owner.split('@')[0]
            const isExpanded = expandedSellers[owner] === true
            const openCount = openCountMap[owner] || 0
            const mhePct = openCount > 0 ? Math.round((ownerLeads.length / openCount) * 100) : 0
            return (
              <div key={owner} className="ov-acc">
                <div className={`ov-acc-hdr ${isExpanded?'ov-acc-hdr-open':''}`} onClick={()=>toggleSeller(owner)}>
                  <div className="ov-acc-title">
                    <span className={`ov-acc-chev ${isExpanded?'ov-acc-chev-open':''}`}>▶</span>
                    {sellerName}
                  </div>
                  <div className="ov-acc-meta">
                    <MhePill pct={mhePct} />
                    <span className="ov-badge">{ownerLeads.length} mishandled</span>
                    {openCount > 0 && <span className="ov-badge" style={{color:'#8A8278'}}>/ {openCount} open</span>}
                  </div>
                </div>
                {isExpanded && (
                  <table className="ov-tbl">
                    <thead><tr><th>Lead ID</th><th>Stage</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{ownerLeads.map((lead:Lead, i:number)=>{
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
          {stageGroups && Object.entries(stageGroups).map(([stage, stageLeads]: [string, any]) => {
            const isExpanded = expandedStages[stage] === true
            const sc = stageColors[stage?.toLowerCase()]||'#4A4642'
            return (
              <div key={stage} className="ov-acc">
                <div className={`ov-acc-hdr ${isExpanded?'ov-acc-hdr-open':''}`} onClick={()=>toggleStage(stage)}>
                  <div className="ov-acc-title">
                    <span className={`ov-acc-chev ${isExpanded?'ov-acc-chev-open':''}`}>▶</span>
                    <span className="ov-stage" style={{background:`${sc}18`,color:sc,borderColor:`${sc}30`}}>{stage||'Unknown'}</span>
                  </div>
                  <span className="ov-badge">{stageLeads.length} leads</span>
                </div>
                {isExpanded && (
                  <table className="ov-tbl">
                    <thead><tr><th>Lead ID</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{stageLeads.map((lead:Lead, i:number)=>{
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