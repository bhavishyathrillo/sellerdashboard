'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './MHLPage.module.css'

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

function LeadIdLink({ leadId }: { leadId: string }) {
  return (
    <a
      href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${leadId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.leadId}
      style={{textDecoration:'none',cursor:'pointer'}}
      title={`Open ${leadId} in admin`}
    >
      {leadId}
    </a>
  )
}

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
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.counts}>
            <div className={styles.countBadge}>
              <span className={styles.countNum}>{filtered.length}</span><span className={styles.countLabel}>Total Leads</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {isManager && (
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${view==='mine'?styles.toggleActive:''}`} onClick={()=>setView('mine')}>My Leads</button>
              <button className={`${styles.toggleBtn} ${view==='team'?styles.toggleActive:''}`} onClick={()=>setView('team')}>Team View</button>
              {view==='team' && <button className={`${styles.toggleBtn} ${tableView?styles.toggleActive:''}`} onClick={()=>setTableView(!tableView)}>Table</button>}
            </div>
          )}
          <input className={styles.search} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className={styles.select} value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {[...new Set(leads.map(l=>l.stage).filter(Boolean))].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}><div className={styles.spinner} /><p>Loading...</p></div>
      ) : error ? (
        <div className={styles.errorWrap}><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyWrap}><p>No leads found</p></div>
      ) : view === 'team' && tableView ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Seller</th><th>Total Leads</th><th>Last Call</th></tr></thead>
            <tbody>
              {sellerSummary.map(s=>(
                <tr key={s.owner}>
                  <td style={{fontWeight:600}}>{s.name}</td>
                  <td style={{fontWeight:700}}>{s.total}</td>
                  <td className={styles.dateCell}>{s.lastCall ? formatLastCall(s.lastCall) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'team' && groupedLeads ? (
        <div className={styles.groupedView}>
          {Object.entries(groupedLeads).map(([owner, leads]: [string, any]) => {
            const sellerName = leads[0]?.seller_name || owner.split('@')[0]
            const isExpanded = expandedSellers[owner] === true
            return (
              <div key={owner} className={styles.sellerGroup}>
                <div className={styles.sellerGroupHeader} onClick={()=>toggleSeller(owner)}>
                  <span className={styles.sellerGroupName}><span className={styles.expandArrow}>{isExpanded?'▼':'▶'}</span> {sellerName}</span>
                  <span className={styles.sellerGroupCounts}><span>Total: {leads.length}</span></span>
                </div>
                {isExpanded && (
                  <table className={styles.table}>
                    <thead><tr><th>Lead ID</th><th>Stage</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{leads.map((lead:Lead)=>{
                      const days=daysSinceCall(lead.last_call)
                      const sc=stageColors[lead.stage?.toLowerCase()]||'#4A4642'
                      return <tr key={lead.id}><td><LeadIdLink leadId={lead.lead_id} /></td><td><span className={styles.stageBadge} style={{background:`${sc}18`,color:sc,borderColor:`${sc}30`}}>{lead.stage||'—'}</span></td><td className={styles.dateCell}>{formatLastCall(lead.last_call)}</td><td>{days!==null?<span className={styles.daysBadge} style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E'}}>{days}d</span>:'—'}</td></tr>
                    })}</tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.groupedView}>
          {stageGroups && Object.entries(stageGroups).map(([stage, leads]: [string, any]) => {
            const isExpanded = expandedStages[stage] === true
            const sc = stageColors[stage?.toLowerCase()]||'#4A4642'
            return (
              <div key={stage} className={styles.sellerGroup}>
                <div className={styles.sellerGroupHeader} onClick={()=>toggleStage(stage)}>
                  <span className={styles.sellerGroupName}>
                    <span className={styles.expandArrow}>{isExpanded?'▼':'▶'}</span>
                    <span className={styles.stageBadge} style={{background:`${sc}18`,color:sc,borderColor:`${sc}30`,marginRight:8}}>{stage||'Unknown'}</span>
                  </span>
                  <span className={styles.sellerGroupCounts}><span>Total: {leads.length}</span></span>
                </div>
                {isExpanded && (
                  <table className={styles.table}>
                    <thead><tr><th>Lead ID</th><th>Last Call</th><th>Days</th></tr></thead>
                    <tbody>{leads.map((lead:Lead)=>{
                      const days=daysSinceCall(lead.last_call)
                      return <tr key={lead.id}><td><LeadIdLink leadId={lead.lead_id} /></td><td className={styles.dateCell}>{formatLastCall(lead.last_call)}</td><td>{days!==null?<span className={styles.daysBadge} style={{color:days>7?'#EF4444':days>3?'#F59E0B':'#22C55E'}}>{days}d</span>:'—'}</td></tr>
                    })}</tbody>
                  </table>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}