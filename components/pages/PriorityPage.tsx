'use client'

import { useEffect, useRef, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PriorityPage.module.css'
import QBStatsPage from './QBStatsPage'

interface PriorityLead { lead_id: string; seller_email: string | null; stage: string | null; lead_status: string | null; planned_region: string | null; final_status: string | null; dials_today: number; answered_seconds_today: number; updated_at: string | null }
interface Props { session: UserSession }

// ── Helpers ──────────────────────────────────────────────────────────────
function fmtDuration(seconds: number) { if (!seconds || seconds === 0) return '0s'; const mins = Math.floor(seconds / 60); const secs = seconds % 60; return mins > 0 ? `${mins}m ${secs}s` : `${secs}s` }
function initials(name: string) { return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() }
function avatarColor(name: string) { const colors = ['#F4631E','#C9A84C','#22C55E','#3B82F6','#A78BFA','#EC4899','#14B8A6','#F97316']; let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return colors[h % colors.length] }

function ChevronDown() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg> }
function ChevronRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg> }
function SearchIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }

// ── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const color = avatarColor(name)
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: color + '22', color, border: `1.5px solid ${color}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: 700, flexShrink: 0 }}>
      {initials(name)}
    </span>
  )
}

// ── Lead ID link ──────────────────────────────────────────────────────────
function LeadIdLink({ leadId }: { leadId: string }) {
  return <a href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${leadId}`} target="_blank" rel="noopener noreferrer" style={{ color: '#F4631E', textDecoration: 'none', fontFamily: "'SF Mono','Fira Code',monospace", fontSize: '0.72rem', fontWeight: 600 }}>{leadId}</a>
}

// ── Status pill ───────────────────────────────────────────────────────────
function StatusPill({ label, variant }: { label: string; variant: 'green' | 'red' | 'gold' | 'grey' | 'blue' }) {
  const map = { green: ['rgba(34,197,94,0.12)','#22C55E','rgba(34,197,94,0.2)'], red: ['rgba(239,68,68,0.12)','#EF4444','rgba(239,68,68,0.2)'], gold: ['rgba(201,168,76,0.12)','#C9A84C','rgba(201,168,76,0.2)'], grey: ['rgba(107,114,128,0.12)','#9CA3AF','rgba(107,114,128,0.2)'], blue: ['rgba(59,130,246,0.12)','#60A5FA','rgba(59,130,246,0.2)'] }
  const [bg, color, border] = map[variant]
  return <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{label}</span>
}

// ── Mishandled pill ───────────────────────────────────────────────────────
function MishandledPill({ pct }: { pct: number }) {
  const variant = pct > 50 ? 'red' : pct > 20 ? 'gold' : 'green'
  return <StatusPill label={`${pct}%`} variant={variant} />
}

// ── KPI cards ─────────────────────────────────────────────────────────────
function KpiCards({ metrics }: { metrics: any }) {
  if (!metrics) return null
  const total = metrics.totalLeads || 0
  const convoPct = total > 0 ? Math.round((metrics.conversationHappenedLeads / total) * 100) : 0
  const attemptsPct = total > 0 ? Math.round((metrics.twoAttemptsDoneLeads / total) * 100) : 0
  const isGoodMishandled = metrics.mishandledPct <= 20

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
      {/* Total Leads */}
      <div style={{ background: '#1A1A1A', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(244,99,30,0.2)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#F4631E,#C9A84C)' }} />
        <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Total Priority Leads</div>
        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: 6 }}>Assigned to you today</div>
      </div>

      {/* Mishandled */}
      <div style={{ background: '#1A1A1A', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden', border: `1px solid ${isGoodMishandled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isGoodMishandled ? '#22C55E' : '#EF4444' }} />
        <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Mishandled Leads</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.55rem', color: '#5A5650', marginBottom: 2 }}>Rate</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: isGoodMishandled ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{metrics.mishandledPct}%</div>
          </div>
          <div style={{ width: 1, height: 36, background: '#232323', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.55rem', color: '#5A5650', marginBottom: 2 }}>Count</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: isGoodMishandled ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{metrics.mishandledLeads}</div>
          </div>
        </div>
      </div>

      {/* Conversation / Attempts */}
      <div style={{ background: '#1A1A1A', borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#C9A84C' }} />
        <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Conversion Progress</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.55rem', color: '#5A5650', marginBottom: 4 }}>Conv. Happened</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22C55E', lineHeight: 1 }}>{metrics.conversationHappenedLeads ?? 0}</div>
            <div style={{ marginTop: 5, height: 4, background: '#232323', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${convoPct}%`, background: '#22C55E', borderRadius: 10 }} />
            </div>
            <div style={{ fontSize: '0.55rem', color: '#22C55E', marginTop: 3 }}>{convoPct}%</div>
          </div>
          <div style={{ width: 1, background: '#232323', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.55rem', color: '#5A5650', marginBottom: 4 }}>2 Attempts Done</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>{metrics.twoAttemptsDoneLeads ?? 0}</div>
            <div style={{ marginTop: 5, height: 4, background: '#232323', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${attemptsPct}%`, background: '#C9A84C', borderRadius: 10 }} />
            </div>
            <div style={{ fontSize: '0.55rem', color: '#C9A84C', marginTop: 3 }}>{attemptsPct}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card header stats (compact: total + mishandled%) ──────────────────────
function CardHeaderStats({ metrics, name }: { metrics: any; name?: string }) {
  if (!metrics) return null
  const pct = metrics.mishandledPct || 0
  const pillColor = pct > 50 ? '#EF4444' : pct > 20 ? '#C9A84C' : '#22C55E'
  const pillBg = pct > 50 ? 'rgba(239,68,68,0.12)' : pct > 20 ? 'rgba(201,168,76,0.12)' : 'rgba(34,197,94,0.08)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F4631E' }}>{metrics.totalLeads || 0}</span>
      <span style={{ fontSize: '0.6rem', color: '#5A5650' }}>leads</span>
      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, background: pillBg, color: pillColor, border: `1px solid ${pillColor}30` }}>{pct}% mishandled</span>
    </div>
  )
}

// ── Leads table ───────────────────────────────────────────────────────────
function LeadsTable({ leads }: { leads: PriorityLead[] }) {
  const [search, setSearch] = useState('')
  const filtered = search.trim() ? leads.filter(l => l.lead_id?.toLowerCase().includes(search.toLowerCase()) || l.lead_status?.toLowerCase().includes(search.toLowerCase()) || l.stage?.toLowerCase().includes(search.toLowerCase()) || l.planned_region?.toLowerCase().includes(search.toLowerCase())) : leads

  return (
    <div style={{ marginTop: 8 }}>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', border: '1px solid #242424', borderRadius: 20, padding: '6px 12px', marginBottom: 10, maxWidth: 380 }}>
        <span style={{ color: '#555' }}><SearchIcon /></span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Lead ID, status, stage…" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: '0.72rem', flex: 1 }} />
        {search && <span style={{ fontSize: '0.6rem', color: '#8A8278' }}>{filtered.length}/{leads.length}</span>}
      </div>

      {filtered.length === 0
        ? <div style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: '0.75rem' }}>{search ? 'No leads match your search' : 'No priority leads found'}</div>
        : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #1E1E1E' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
              <thead>
                <tr style={{ background: '#141414' }}>
                  {['Lead ID', 'Status', 'Stage', 'Region', 'Dials', 'Duration', 'Final Status'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: '#5A5650', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const isMishandled = (lead.final_status || '').toLowerCase() === 'mishandled'
                  const statusColor = lead.lead_status === 'open' ? 'green' : lead.lead_status === 'closed' ? 'grey' : 'gold'
                  return (
                    <tr key={lead.lead_id || i} style={{ borderBottom: '1px solid #1A1A1A', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C1C1C'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td style={{ padding: '9px 14px' }}><LeadIdLink leadId={lead.lead_id} /></td>
                      <td style={{ padding: '9px 14px' }}><StatusPill label={lead.lead_status || '—'} variant={statusColor as any} /></td>
                      <td style={{ padding: '9px 14px', color: '#C9A84C', fontSize: '0.68rem' }}>{lead.stage || '—'}</td>
                      <td style={{ padding: '9px 14px', color: '#8A8278', fontSize: '0.66rem' }}>{lead.planned_region || '—'}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: '#F0EDE8' }}>{lead.dials_today || 0}</td>
                      <td style={{ padding: '9px 14px', color: '#8A8278', fontSize: '0.68rem' }}>{fmtDuration(lead.answered_seconds_today || 0)}</td>
                      <td style={{ padding: '9px 14px' }}><StatusPill label={lead.final_status || '—'} variant={isMishandled ? 'red' : 'green'} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

// ── Hierarchy accordion card ──────────────────────────────────────────────
function AccordionCard({ title, subtitle, metrics, accentColor = '#F4631E', depth = 0, children }: { title: string; subtitle?: string; metrics: any; accentColor?: string; depth?: number; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const bg = depth === 0 ? '#161616' : depth === 1 ? '#1A1A1A' : '#1D1D1D'
  const border = open ? `1px solid ${accentColor}30` : '1px solid #232323'

  return (
    <div style={{ background: bg, border, borderRadius: depth === 0 ? 14 : 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: depth === 0 ? '14px 16px' : depth === 1 ? '11px 14px' : '9px 12px', cursor: 'pointer', userSelect: 'none', borderLeft: `3px solid ${open ? accentColor : 'transparent'}`, transition: 'border-color 0.2s' }}
      >
        {/* Chevron */}
        <span style={{ color: open ? accentColor : '#555', transition: 'color 0.2s, transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-flex' }}>
          <ChevronDown />
        </span>

        {/* Avatar + name */}
        <Avatar name={title} size={depth === 0 ? 32 : 26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: depth === 0 ? 700 : 600, fontSize: depth === 0 ? '0.9rem' : '0.8rem', color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: 2 }}>{subtitle}</div>}
        </div>

        {/* Stats */}
        <CardHeaderStats metrics={metrics} />
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${accentColor}18`, padding: depth === 0 ? '12px 16px' : '8px 12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Hierarchical leaderboard table ────────────────────────────────────────
function HierarchicalTableView({ viewType, l1Groups = [], search: extSearch }: { viewType: 'admin' | 'l1' | 'l2'; l1Groups?: any[]; search: string }) {
  const [activeTab, setActiveTab] = useState<'l1' | 'l2' | 'seller'>(viewType === 'l2' ? 'seller' : viewType === 'l1' ? 'l2' : 'l1')
  const [sortField, setSortField] = useState('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const query = (search || extSearch || '').toLowerCase().trim()

  const l1Data = l1Groups.map((l1: any) => ({ name: l1.l1_name || 'Not Mapped', email: l1.l1_email, l2_count: l1.l2_count, seller_count: l1.seller_count, total: l1.metrics?.totalLeads || 0, called: l1.metrics?.calledLeads || 0, callRate: (l1.metrics?.totalLeads || 0) > 0 ? Math.round(((l1.metrics?.calledLeads || 0) / l1.metrics?.totalLeads) * 100) : 0, avgDuration: l1.metrics?.avgDurationFormatted || '0s', mishandledPct: l1.metrics?.mishandledPct || 0 }))
  const l2Data: any[] = []; l1Groups.forEach((l1: any) => { (l1.l2_groups || []).forEach((l2: any) => { l2Data.push({ name: l2.l2_name || 'Unknown', email: l2.l2_email, l1_name: l1.l1_name, seller_count: l2.seller_count, total: l2.metrics?.totalLeads || 0, called: l2.metrics?.calledLeads || 0, callRate: (l2.metrics?.totalLeads || 0) > 0 ? Math.round(((l2.metrics?.calledLeads || 0) / l2.metrics?.totalLeads) * 100) : 0, avgDuration: l2.metrics?.avgDurationFormatted || '0s', mishandledPct: l2.metrics?.mishandledPct || 0 }) }) })
  const sellerData: any[] = []; l1Groups.forEach((l1: any) => { (l1.l2_groups || []).forEach((l2: any) => { (l2.sellers || []).forEach((s: any) => { sellerData.push({ name: s.seller_name || s.seller_email?.split('@')[0], email: s.seller_email, l1_name: l1.l1_name, l2_name: l2.l2_name, total: s.metrics?.totalLeads || 0, called: s.metrics?.calledLeads || 0, callRate: (s.metrics?.totalLeads || 0) > 0 ? Math.round(((s.metrics?.calledLeads || 0) / s.metrics?.totalLeads) * 100) : 0, avgDuration: s.metrics?.avgDurationFormatted || '0s', mishandledPct: s.metrics?.mishandledPct || 0 }) }) }) })

  let rawData = l1Data; if (activeTab === 'l2') rawData = l2Data; if (activeTab === 'seller') rawData = sellerData
  const filteredData = query ? rawData.filter((item: any) => item.name?.toLowerCase().includes(query) || item.email?.toLowerCase().includes(query) || (item.l1_name || '').toLowerCase().includes(query) || (item.l2_name || '').toLowerCase().includes(query)) : rawData
  const sortedData = [...filteredData].sort((a: any, b: any) => { let aVal = a[sortField], bVal = b[sortField]; if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); aVal = aVal || 0; bVal = bVal || 0; return sortDir === 'asc' ? aVal - bVal : bVal - aVal })
  const requestSort = (field: string) => { if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('desc') } }
  const SortIcon = ({ field }: { field: string }) => sortField !== field ? <span style={{ marginLeft: 3, opacity: 0.3, fontSize: '0.7rem' }}>↕</span> : sortDir === 'asc' ? <span style={{ marginLeft: 3, color: '#F4631E', fontSize: '0.7rem' }}>↑</span> : <span style={{ marginLeft: 3, color: '#F4631E', fontSize: '0.7rem' }}>↓</span>

  const tabLabel = activeTab === 'l1' ? 'Category Manager' : activeTab === 'l2' ? 'L1 Manager' : 'Seller'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', border: '1px solid #242424', borderRadius: 20, padding: '6px 12px', flex: '0 0 auto' }}>
          <span style={{ color: '#555' }}><SearchIcon /></span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: '0.72rem', width: 160 }} />
        </div>

        {/* Level tabs */}
        <div style={{ display: 'flex', gap: 3, background: '#141414', border: '1px solid #232323', borderRadius: 8, padding: 3 }}>
          {viewType === 'admin' && <button onClick={() => { setActiveTab('l1'); setSortField('total'); setSortDir('desc') }} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: activeTab === 'l1' ? 'rgba(201,168,76,0.15)' : 'transparent', color: activeTab === 'l1' ? '#C9A84C' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Cat Managers ({l1Data.length})</button>}
          {(viewType === 'admin' || viewType === 'l1') && <button onClick={() => { setActiveTab('l2'); setSortField('total'); setSortDir('desc') }} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: activeTab === 'l2' ? 'rgba(201,168,76,0.15)' : 'transparent', color: activeTab === 'l2' ? '#C9A84C' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>L1 Managers ({l2Data.length})</button>}
          <button onClick={() => { setActiveTab('seller'); setSortField('total'); setSortDir('desc') }} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: activeTab === 'seller' ? 'rgba(244,99,30,0.15)' : 'transparent', color: activeTab === 'seller' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Sellers ({sellerData.length})</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #1E1E1E' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#141414' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', width: 40 }}>#</th>
              <th onClick={() => requestSort('name')} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}>{tabLabel}<SortIcon field="name" /></th>
              <th onClick={() => requestSort('total')} style={{ padding: '10px 16px', textAlign: 'right', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}>Leads<SortIcon field="total" /></th>
              <th onClick={() => requestSort('callRate')} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', cursor: 'pointer', minWidth: 160 }}>Call Rate<SortIcon field="callRate" /></th>
              <th onClick={() => requestSort('avgDuration')} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}>Avg Duration<SortIcon field="avgDuration" /></th>
              <th onClick={() => requestSort('mishandledPct')} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, borderBottom: '1px solid #1E1E1E', cursor: 'pointer' }}>Mishandled<SortIcon field="mishandledPct" /></th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0
              ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#555', fontSize: '0.75rem' }}>No matches found</td></tr>
              : sortedData.map((row: any, i) => {
                let subText = ''
                if (activeTab === 'l1') subText = `${row.seller_count} sellers`
                else if (activeTab === 'l2') { const parts = []; if (row.l1_name && row.l1_name !== 'Not Mapped') parts.push(`CM: ${row.l1_name}`); parts.push(`${row.seller_count} sellers`); subText = parts.join(' · ') }
                else { const parts = []; if (row.l2_name && row.l2_name !== 'Unknown') parts.push(`L1: ${row.l2_name}`); if (row.l1_name && row.l1_name !== 'Not Mapped') parts.push(`CM: ${row.l1_name}`); subText = parts.join(' · ') }

                return (
                  <tr key={row.email || i} style={{ borderBottom: '1px solid #1A1A1A', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1C1C1C'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '10px 16px', color: '#5A5650', fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={row.name} size={28} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#F0EDE8' }}>{row.name}</div>
                          {subText && <div style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: 1 }}>{subText}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: '#F4631E' }}>{row.total}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 100, height: 5, background: '#242424', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${row.callRate}%`, background: '#22C55E', borderRadius: 10 }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#22C55E' }}>{row.callRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '0.75rem', color: '#C9A84C', fontWeight: 600 }}>{row.avgDuration}</td>
                    <td style={{ padding: '10px 16px' }}><MishandledPill pct={row.mishandledPct} /></td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab toggle ────────────────────────────────────────────────────────────
function TabToggle({ active, onChange }: { active: 'priority' | 'qb'; onChange: (t: 'priority' | 'qb') => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 3, background: '#141414', border: '1px solid #232323', borderRadius: 10, padding: 3 }}>
        <button onClick={() => onChange('priority')} style={{ padding: '9px 22px', border: 'none', borderRadius: 7, background: active === 'priority' ? 'linear-gradient(135deg,#F4631E,#C9A84C)' : 'transparent', color: active === 'priority' ? '#fff' : '#8A8278', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s', boxShadow: active === 'priority' ? '0 2px 8px rgba(244,99,30,0.3)' : 'none' }}>⭐ Priority</button>
        <button onClick={() => onChange('qb')} style={{ padding: '9px 22px', border: 'none', borderRadius: 7, background: active === 'qb' ? 'linear-gradient(135deg,#F4631E,#C9A84C)' : 'transparent', color: active === 'qb' ? '#fff' : '#8A8278', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s', boxShadow: active === 'qb' ? '0 2px 8px rgba(244,99,30,0.3)' : 'none' }}>📋 QB Stats</button>
      </div>
    </div>
  )
}

// ── View mode / table toggle ──────────────────────────────────────────────
function ToggleBtn({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: '#141414', border: '1px solid #232323', borderRadius: 8, padding: 3 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{ padding: '7px 14px', border: 'none', borderRadius: 6, background: value === o.value ? 'rgba(244,99,30,0.15)' : 'transparent', color: value === o.value ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.15s' }}>{o.label}</button>
      ))}
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, note, right }: { title: string; subtitle: string; note?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F0EDE8', margin: 0, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: '0.7rem', color: '#8A8278', margin: '4px 0 0' }}>{subtitle}</p>
        {note && <p style={{ fontSize: '0.58rem', color: '#4A4A4A', margin: '2px 0 0' }}>{note}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

// ── Search bar ────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, placeholder, maxWidth = 480 }: { value: string; onChange: (v: string) => void; placeholder: string; maxWidth?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', border: '1px solid #242424', borderRadius: 10, padding: '8px 14px', marginBottom: 16, maxWidth }}>
      <span style={{ color: '#555' }}><SearchIcon /></span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#F0EDE8', fontSize: '0.78rem', flex: 1 }} />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────
export default function PriorityPage({ session }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my')
  const [tableView, setTableView] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'priority' | 'qb'>('priority')

  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(session.role)
  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'

  useEffect(() => { if (isL1 || isAdmin) setViewMode('team'); loadData() }, [session.email, viewMode])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ email: session.email, role: session.role, view: viewMode })
      const res = await fetch(`/api/priority-leads?${params}`)
      const json = await res.json()
      if (!json.error) setData(json)
    } catch (err) { console.error('Failed to load priority leads:', err) }
    setLoading(false)
  }

  // ── QB tab ──
  if (activeTab === 'qb') {
    return (
      <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', color: '#F0EDE8' }}>
        <TabToggle active="qb" onChange={setActiveTab} />
        <QBStatsPage session={session} />
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: 12, color: '#8A8278' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(244,99,30,0.15)', borderTopColor: '#F4631E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.8rem' }}>Loading priority leads…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const viewTableOptions = [{ label: 'Cards', value: 'cards' }, { label: 'Table', value: 'table' }]

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', color: '#F0EDE8' }}>
      <TabToggle active="priority" onChange={setActiveTab} />

      {/* ── ADMIN VIEW ── */}
      {isAdmin && data?.admin && (
        <div>
          <PageHeader
            title="Priority Leads"
            subtitle={`${data.l1Groups?.length || 0} Category Managers · ${data.totalSellers} sellers`}
            note="Updates every 40 min"
            right={<ToggleBtn options={viewTableOptions} value={tableView ? 'table' : 'cards'} onChange={v => setTableView(v === 'table')} />}
          />
          <SearchBar value={search} onChange={setSearch} placeholder="Search by Category Manager, L1 Manager, or Seller…" />
          {!tableView && <KpiCards metrics={data.teamMetrics} />}
          {tableView
            ? <HierarchicalTableView viewType="admin" l1Groups={data.l1Groups || []} search={search} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.l1Groups || []).filter((l1: any) => !search || l1.l1_name?.toLowerCase().includes(search.toLowerCase())).map((l1: any) => (
                  <AccordionCard key={l1.l1_email} title={l1.l1_name} subtitle={`${l1.l2_count} L1 Managers · ${l1.seller_count} sellers`} metrics={l1.metrics} accentColor="#C9A84C" depth={0}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {l1.l2_groups.map((l2: any) => (
                        <AccordionCard key={l2.l2_email} title={l2.l2_name} subtitle={`${l2.seller_count} sellers`} metrics={l2.metrics} accentColor="#F4631E" depth={1}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {l2.sellers.map((seller: any) => (
                              <AccordionCard key={seller.seller_email} title={seller.seller_name} metrics={seller.metrics} accentColor="#22C55E" depth={2}>
                                <LeadsTable leads={seller.leads || []} />
                              </AccordionCard>
                            ))}
                          </div>
                        </AccordionCard>
                      ))}
                    </div>
                  </AccordionCard>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── L1 (CM) VIEW ── */}
      {isL1 && data?.isL1 && (
        <div>
          <PageHeader
            title="Priority Leads"
            subtitle={`${data.l2Groups?.length || 0} L1 Managers · ${data.totalSellers} sellers`}
            note="Updates every 40 min"
            right={<ToggleBtn options={viewTableOptions} value={tableView ? 'table' : 'cards'} onChange={v => setTableView(v === 'table')} />}
          />
          <SearchBar value={search} onChange={setSearch} placeholder="Search by L1 Manager or Seller…" />
          {!tableView && <KpiCards metrics={data.teamMetrics} />}
          {tableView
            ? <HierarchicalTableView viewType="l1" l1Groups={[{ l1_name: 'Team', l2_groups: data.l2Groups || [] }]} search={search} />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data.l2Groups || []).filter((g: any) => !search || g.l2_name?.toLowerCase().includes(search.toLowerCase())).map((group: any) => (
                  <AccordionCard key={group.l2_email} title={group.l2_name} subtitle={`${group.seller_count} sellers`} metrics={group.metrics} accentColor="#F4631E" depth={0}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {group.sellers.map((seller: any) => (
                        <AccordionCard key={seller.seller_email} title={seller.seller_name} metrics={seller.metrics} accentColor="#22C55E" depth={1}>
                          <LeadsTable leads={seller.leads || []} />
                        </AccordionCard>
                      ))}
                    </div>
                  </AccordionCard>
                ))}
              </div>
            )}
        </div>
      )}

      {/* ── L2 TEAM VIEW ── */}
      {isL2 && viewMode === 'team' && data?.team && (
        <div>
          <PageHeader
            title="Priority Leads"
            subtitle={`${data.sellers?.length || 0} seller${(data.sellers?.length || 0) !== 1 ? 's' : ''} · Team View`}
            note="Updates every 40 min"
            right={
              <>
                <ToggleBtn options={[{ label: 'My Priority', value: 'my' }, { label: `My Team (${(data.sellers || []).length})`, value: 'team' }]} value={viewMode} onChange={v => setViewMode(v as 'my' | 'team')} />
                <ToggleBtn options={viewTableOptions} value={tableView ? 'table' : 'cards'} onChange={v => setTableView(v === 'table')} />
              </>
            }
          />
          {!tableView && <KpiCards metrics={data.teamMetrics} />}
          {tableView
            ? <HierarchicalTableView viewType="l2" l1Groups={[{ l1_name: 'Team', l2_groups: [{ l2_name: 'Sellers', sellers: data.sellers || [] }] }]} search={search} />
            : (
              <>
                <SearchBar value={search} onChange={setSearch} placeholder="Search seller name…" maxWidth={400} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(data.sellers || []).filter((s: any) => !search || s.seller_name?.toLowerCase().includes(search.toLowerCase())).map((seller: any) => (
                    <AccordionCard key={seller.seller_email} title={seller.seller_name} metrics={seller.metrics} accentColor="#F4631E" depth={0}>
                      <LeadsTable leads={seller.leads || []} />
                    </AccordionCard>
                  ))}
                </div>
              </>
            )}
        </div>
      )}

      {/* ── PERSONAL VIEW ── */}
      {!isAdmin && !isL1 && !(isL2 && viewMode === 'team' && data?.team) && data?.metrics && (
        <div>
          <PageHeader
            title="My Priority Leads"
            subtitle="Your high-priority enquiry pipeline"
            note="Updates every 40 min"
            right={isL2 ? <ToggleBtn options={[{ label: 'My Priority', value: 'my' }, { label: 'My Team', value: 'team' }]} value={viewMode} onChange={v => setViewMode(v as 'my' | 'team')} /> : undefined}
          />
          <KpiCards metrics={data.metrics} />
          <LeadsTable leads={data.leads || []} />
        </div>
      )}
    </div>
  )
}