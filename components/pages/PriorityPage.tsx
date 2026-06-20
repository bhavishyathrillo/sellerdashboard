'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './PriorityPage.module.css'

interface PriorityLead {
  lead_id: string
  seller_email: string | null
  stage: string | null
  lead_status: string | null
  planned_region: string | null
  final_status: string | null
  dials_today: number
  answered_seconds_today: number
  updated_at: string | null
}

interface Props {
  session: UserSession
}

function fmtDuration(seconds: number) {
  if (!seconds || seconds === 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

function LeadIdLink({ leadId }: { leadId: string }) {
  return (
    <a
      href={`https://admin.thrillophilia.com/admin/1/enquiries?code=${leadId}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#F4631E', textDecoration: 'none', fontWeight: 500 }}
    >
      {leadId}
    </a>
  )
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function KpiCards({ metrics }: { metrics: any }) {
  if (!metrics) return null
  return (
    <div className={styles.kpiGrid}>
      <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}>
        <span className={styles.kpiLabel}>Total Leads</span>
        <span className={styles.kpiValue}>{metrics.totalLeads}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Called</span>
        <span className={styles.kpiValue} style={{ color: '#22C55E' }}>{metrics.calledLeads}</span>
        <span className={styles.kpiSub}>{metrics.totalLeads > 0 ? `${Math.round((metrics.calledLeads / metrics.totalLeads) * 100)}%` : '0%'}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Not Called</span>
        <span className={styles.kpiValue} style={{ color: '#EF4444' }}>{metrics.notCalledLeads}</span>
      </div>
      <div className={styles.kpiCard}>
        <span className={styles.kpiLabel}>Avg Duration</span>
        <span className={styles.kpiValue}>{metrics.avgDurationFormatted}</span>
      </div>
      <div className={`${styles.kpiCard} ${metrics.mishandledPct > 20 ? styles.kpiDanger : styles.kpiSuccess}`}>
        <span className={styles.kpiLabel}>Mishandled %</span>
        <span className={styles.kpiValue}>{metrics.mishandledPct}%</span>
        <span className={styles.kpiSub}>{metrics.mishandledLeads} of {metrics.totalLeads}</span>
      </div>
    </div>
  )
}

function LeadsTable({ leads, search, setSearch }: { leads: PriorityLead[]; search: string; setSearch: (v: string) => void }) {
  const filtered = search.trim()
    ? leads.filter(l =>
        l.lead_id?.toLowerCase().includes(search.toLowerCase()) ||
        l.lead_status?.toLowerCase().includes(search.toLowerCase()) ||
        l.stage?.toLowerCase().includes(search.toLowerCase()) ||
        l.planned_region?.toLowerCase().includes(search.toLowerCase())
      )
    : leads

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by Lead ID, status, stage, or region..."
          style={{
            flex: 1, padding: '10px 14px', background: '#141414', border: '1px solid #232323',
            borderRadius: '10px', color: '#F0EDE8', fontSize: '0.8rem', outline: 'none', maxWidth: '450px'
          }}
        />
        {search && (
          <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>{filtered.length} of {leads.length}</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8A8278' }}>
          {search ? 'No leads match your search' : 'No priority leads found'}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Region</th>
                <th>Dials</th>
                <th>Duration</th>
                <th>Final Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => {
                const isMishandled = (lead.final_status || '').toLowerCase() === 'mishandled'
                const sc = lead.lead_status === 'open' ? '#22C55E' : lead.lead_status === 'closed' ? '#8A8278' : '#F59E0B'
                return (
                  <tr key={lead.lead_id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 14px' }}><LeadIdLink leadId={lead.lead_id} /></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 600, background: `${sc}18`, color: sc, border: `1px solid ${sc}30` }}>
                        {lead.lead_status || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#C9A84C' }}>{lead.stage || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.7rem', color: '#8A8278' }}>{lead.planned_region || '—'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{lead.dials_today || 0}</td>
                    <td style={{ padding: '10px 14px' }}>{fmtDuration(lead.answered_seconds_today || 0)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: '10px', fontSize: '0.62rem', fontWeight: 700,
                        background: isMishandled ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)',
                        color: isMishandled ? '#EF4444' : '#22C55E',
                        border: isMishandled ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.15)'
                      }}>
                        {lead.final_status || '—'}
                      </span>
                    </td>
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

function SellersFlatTable({ sellers, l1Name, l2Name }: { sellers: any[]; l1Name?: string; l2Name?: string }) {
  return (
    <div className={styles.tableWrap} style={{ marginTop: '8px' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            {l1Name && <th>Category Mgr</th>}
            {l2Name && <th>L1 Manager</th>}
            <th>Seller</th>
            <th>Total</th>
            <th>Called</th>
            <th>Not Called</th>
            <th>Avg Duration</th>
            <th>Mishandled %</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((s: any) => {
            const m = s.metrics
            return (
              <tr key={s.seller_email} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {l1Name && <td style={{ padding: '10px 14px', fontSize: '0.7rem', color: '#C9A84C' }}>{s.l1_name || l1Name}</td>}
                {l2Name && <td style={{ padding: '10px 14px', fontSize: '0.7rem', color: '#C9A84C' }}>{s.l2_name || l2Name}</td>}
                <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '0.8rem' }}>{s.seller_name}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.totalLeads}</td>
                <td style={{ padding: '10px 14px', color: '#22C55E', fontWeight: 600 }}>{m.calledLeads}</td>
                <td style={{ padding: '10px 14px', color: '#EF4444', fontWeight: 600 }}>{m.notCalledLeads}</td>
                <td style={{ padding: '10px 14px' }}>{m.avgDurationFormatted}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontWeight: 700, color: m.mishandledPct > 20 ? '#EF4444' : '#22C55E' }}>
                    {m.mishandledPct}%
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function PriorityPage({ session }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'my' | 'team'>('my')
  const [tableView, setTableView] = useState(false)
  const [expandedL1, setExpandedL1] = useState<Record<string, boolean>>({})
  const [expandedL2, setExpandedL2] = useState<Record<string, boolean>>({})
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(session.role)
  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'

  useEffect(() => {
    if (isL1 || isAdmin) setViewMode('team')
    loadData()
  }, [session.email, viewMode])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        email: session.email,
        role: session.role,
        view: viewMode
      })
      const res = await fetch(`/api/priority-leads?${params}`)
      const json = await res.json()
      if (!json.error) setData(json)
    } catch (err) {
      console.error('Failed to load priority leads:', err)
    }
    setLoading(false)
  }

  const toggleL1 = (email: string) => setExpandedL1((prev: any) => ({ ...prev, [email]: !prev[email] }))
  const toggleL2 = (email: string) => setExpandedL2((prev: any) => ({ ...prev, [email]: !prev[email] }))
  const toggleSeller = (email: string) => setExpandedSellers((prev: any) => ({ ...prev, [email]: !prev[email] }))

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', gap: '12px', color: '#8A8278' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(244,99,30,0.15)', borderTopColor: '#F4631E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p>Loading priority leads...</p>
      </div>
    )
  }

  // ========== ADMIN VIEW ==========
  if (isAdmin && data?.admin) {
    const teamMetrics = data.teamMetrics
    const l1Groups = data.l1Groups || []

    const allSellersFlat: any[] = []
    l1Groups.forEach((l1: any) => {
      l1.l2_groups?.forEach((l2: any) => {
        l2.sellers.forEach((s: any) => {
          allSellersFlat.push({ ...s, l1_name: l1.l1_name, l2_name: l2.l2_name })
        })
      })
    })

    const filteredL1Groups = search.trim()
      ? l1Groups.filter((l1: any) => {
          const l1Match = l1.l1_name?.toLowerCase().includes(search.toLowerCase())
          if (l1Match) return true
          return l1.l2_groups?.some((l2: any) => {
            const l2Match = l2.l2_name?.toLowerCase().includes(search.toLowerCase())
            if (l2Match) return true
            return l2.sellers.some((s: any) =>
              s.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
              s.seller_email?.toLowerCase().includes(search.toLowerCase())
            )
          })
        })
      : l1Groups

    const filteredFlatSellers = search.trim()
      ? allSellersFlat.filter((s: any) =>
          s.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.seller_email?.toLowerCase().includes(search.toLowerCase()) ||
          s.l1_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.l2_name?.toLowerCase().includes(search.toLowerCase())
        )
      : allSellersFlat

    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>Priority Leads</h1>
            <p style={{ fontSize: '0.72rem', color: '#8A8278', marginTop: '2px' }}>
              {l1Groups.length} Category Managers · {data.totalSellers} sellers
            </p>
            <p style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: '2px' }}>Updates every 40 min</p>
          </div>
          <div style={{ display: 'flex', gap: '3px', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '3px' }}>
            <button onClick={() => setTableView(false)} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: !tableView ? 'rgba(244,99,30,0.15)' : 'transparent', color: !tableView ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Cards</button>
            <button onClick={() => setTableView(true)} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: tableView ? 'rgba(244,99,30,0.15)' : 'transparent', color: tableView ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Table</button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Category Manager, L1 Manager, or Seller..." style={{ width: '100%', padding: '10px 14px', background: '#141414', border: '1px solid #232323', borderRadius: '10px', color: '#F0EDE8', fontSize: '0.8rem', outline: 'none', maxWidth: '500px' }} />
        </div>

        <KpiCards metrics={teamMetrics} />

        {tableView ? (
          <SellersFlatTable sellers={filteredFlatSellers} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredL1Groups.map((l1: any) => {
              const isL1Expanded = expandedL1[l1.l1_email]
              const lm = l1.metrics
              return (
                <div key={l1.l1_email} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '12px', overflow: 'hidden' }}>
                  <div onClick={() => toggleL1(l1.l1_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#8A8278', fontSize: '0.7rem' }}>{isL1Expanded ? <ChevronDown /> : <ChevronRight />}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block' }}>{l1.l1_name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{l1.l2_count} L1 Managers · {l1.seller_count} sellers</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>{lm.calledLeads} called</span>
                      <span style={{ fontSize: '0.72rem', color: lm.mishandledPct > 20 ? '#EF4444' : '#22C55E', fontWeight: 600 }}>{lm.mishandledPct}%</span>
                      <span style={{ fontSize: '0.72rem', color: '#C9A84C' }}>{lm.avgDurationFormatted}</span>
                    </div>
                  </div>
                  {isL1Expanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <KpiCards metrics={lm} />
                      {l1.l2_groups.map((l2: any) => {
                        const isL2Expanded = expandedL2[l2.l2_email]
                        const l2m = l2.metrics
                        return (
                          <div key={l2.l2_email} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                            <div onClick={(e) => { e.stopPropagation(); toggleL2(l2.l2_email) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#8A8278', fontSize: '0.6rem' }}>{isL2Expanded ? <ChevronDown /> : <ChevronRight />}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{l2.l2_name}</span>
                                <span style={{ fontSize: '0.6rem', color: '#8A8278' }}>{l2.seller_count} sellers</span>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.68rem' }}>
                                <span style={{ color: '#22C55E' }}>{l2m.calledLeads} called</span>
                                <span style={{ color: '#C9A84C' }}>{l2m.avgDurationFormatted}</span>
                                <span style={{ color: l2m.mishandledPct > 20 ? '#EF4444' : '#22C55E' }}>{l2m.mishandledPct}%</span>
                              </div>
                            </div>
                            {isL2Expanded && (
                              <div style={{ padding: '0 14px 12px' }}>
                                <KpiCards metrics={l2m} />
                                {l2.sellers.map((seller: any) => {
                                  const isSellerExpanded = expandedSellers[seller.seller_email]
                                  const sm = seller.metrics
                                  return (
                                    <div key={seller.seller_email} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px', overflow: 'hidden' }}>
                                      <div onClick={(e) => { e.stopPropagation(); toggleSeller(seller.seller_email) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ color: '#8A8278', fontSize: '0.55rem' }}>{isSellerExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                                          <span style={{ fontWeight: 500, fontSize: '0.75rem' }}>{seller.seller_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.65rem' }}>
                                          <span style={{ color: '#22C55E' }}>{sm.calledLeads}</span>
                                          <span style={{ color: '#EF4444' }}>{sm.notCalledLeads}</span>
                                          <span style={{ color: sm.mishandledPct > 20 ? '#EF4444' : '#22C55E' }}>{sm.mishandledPct}%</span>
                                        </div>
                                      </div>
                                      {isSellerExpanded && (
                                        <div style={{ padding: '0 12px 10px' }}>
                                          <KpiCards metrics={sm} />
                                          <LeadsTable leads={seller.leads || []} search={search} setSearch={setSearch} />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========== L1 VIEW ==========
  if (isL1 && data?.isL1) {
    const teamMetrics = data.teamMetrics
    const l2Groups = data.l2Groups || []

    const allSellersFlat: any[] = []
    l2Groups.forEach((group: any) => {
      group.sellers.forEach((s: any) => {
        allSellersFlat.push({ ...s, l2_name: group.l2_name })
      })
    })

    const filteredL2Groups = search.trim()
      ? l2Groups.filter((g: any) =>
          g.l2_name?.toLowerCase().includes(search.toLowerCase()) ||
          g.sellers.some((s: any) => s.seller_name?.toLowerCase().includes(search.toLowerCase()) || s.seller_email?.toLowerCase().includes(search.toLowerCase()))
        )
      : l2Groups

    const filteredFlatSellers = search.trim()
      ? allSellersFlat.filter((s: any) =>
          s.seller_name?.toLowerCase().includes(search.toLowerCase()) ||
          s.seller_email?.toLowerCase().includes(search.toLowerCase()) ||
          s.l2_name?.toLowerCase().includes(search.toLowerCase())
        )
      : allSellersFlat

    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>Priority Leads</h1>
            <p style={{ fontSize: '0.72rem', color: '#8A8278', marginTop: '2px' }}>
              {l2Groups.length} L1 Managers · {data.totalSellers} sellers
            </p>
            <p style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: '2px' }}>Updates every 40 min</p>
          </div>
          <div style={{ display: 'flex', gap: '3px', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '3px' }}>
            <button onClick={() => setTableView(false)} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: !tableView ? 'rgba(244,99,30,0.15)' : 'transparent', color: !tableView ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Cards</button>
            <button onClick={() => setTableView(true)} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: tableView ? 'rgba(244,99,30,0.15)' : 'transparent', color: tableView ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Table</button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by L1 Manager or Seller..." style={{ width: '100%', padding: '10px 14px', background: '#141414', border: '1px solid #232323', borderRadius: '10px', color: '#F0EDE8', fontSize: '0.8rem', outline: 'none', maxWidth: '500px' }} />
        </div>

        <KpiCards metrics={teamMetrics} />

        {tableView ? (
          <SellersFlatTable sellers={filteredFlatSellers} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredL2Groups.map((group: any) => {
              const isExpanded = expandedL2[group.l2_email]
              const gm = group.metrics
              return (
                <div key={group.l2_email} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '12px', overflow: 'hidden' }}>
                  <div onClick={() => toggleL2(group.l2_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#8A8278', fontSize: '0.7rem' }}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{group.l2_name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{group.seller_count} sellers · {gm.totalLeads} leads</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>{gm.calledLeads} called</span>
                      <span style={{ fontSize: '0.72rem', color: gm.mishandledPct > 20 ? '#EF4444' : '#22C55E', fontWeight: 600 }}>{gm.mishandledPct}%</span>
                      <span style={{ fontSize: '0.72rem', color: '#C9A84C' }}>{gm.avgDurationFormatted}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <KpiCards metrics={gm} />
                      {group.sellers.map((seller: any) => {
                        const isSellerExpanded = expandedSellers[seller.seller_email]
                        const sm = seller.metrics
                        return (
                          <div key={seller.seller_email} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                            <div onClick={() => toggleSeller(seller.seller_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#8A8278', fontSize: '0.6rem' }}>{isSellerExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                                <span style={{ fontWeight: 500, fontSize: '0.78rem' }}>{seller.seller_name}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem' }}>
                                <span style={{ color: '#22C55E' }}>{sm.calledLeads}</span>
                                <span style={{ color: '#EF4444' }}>{sm.notCalledLeads}</span>
                                <span style={{ color: sm.mishandledPct > 20 ? '#EF4444' : '#22C55E' }}>{sm.mishandledPct}%</span>
                              </div>
                            </div>
                            {isSellerExpanded && (
                              <div style={{ padding: '0 14px 12px' }}>
                                <KpiCards metrics={sm} />
                                <LeadsTable leads={seller.leads || []} search={search} setSearch={setSearch} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========== L2 TEAM VIEW ==========
  if (isL2 && viewMode === 'team' && data?.team) {
    const teamMetrics = data.teamMetrics
    const sellers = data.sellers || []

    const filteredSellers = search.trim()
      ? sellers.filter((s: any) => s.seller_name?.toLowerCase().includes(search.toLowerCase()) || s.seller_email?.toLowerCase().includes(search.toLowerCase()))
      : sellers

    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>Priority Leads</h1>
            <p style={{ fontSize: '0.72rem', color: '#8A8278', marginTop: '2px' }}>
              {sellers.length} seller{sellers.length !== 1 ? 's' : ''} · Team View
            </p>
            <p style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: '2px' }}>Updates every 40 min</p>
          </div>
          <div style={{ display: 'flex', gap: '3px', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '3px' }}>
            <button onClick={() => setViewMode('my')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: viewMode === 'my' ? 'rgba(244,99,30,0.15)' : 'transparent', color: viewMode === 'my' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Priority</button>
            <button onClick={() => setViewMode('team')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: viewMode === 'team' ? 'rgba(244,99,30,0.15)' : 'transparent', color: viewMode === 'team' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Team ({sellers.length})</button>
          </div>
        </div>

        <KpiCards metrics={teamMetrics} />

        <div style={{ marginBottom: '16px' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller name..." style={{ width: '100%', padding: '10px 14px', background: '#141414', border: '1px solid #232323', borderRadius: '10px', color: '#F0EDE8', fontSize: '0.8rem', outline: 'none', maxWidth: '400px' }} />
          {search && <span style={{ fontSize: '0.65rem', color: '#8A8278', marginLeft: '8px' }}>{filteredSellers.length} of {sellers.length} sellers</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredSellers.map((seller: any) => {
            const isExpanded = expandedSellers[seller.seller_email]
            const m = seller.metrics
            return (
              <div key={seller.seller_email} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '12px', overflow: 'hidden' }}>
                <div onClick={() => toggleSeller(seller.seller_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#8A8278', fontSize: '0.7rem' }}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{seller.seller_name}</span>
                      <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{m.totalLeads} leads · {m.calledLeads} called · {m.notCalledLeads} not called</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>{m.calledLeads}</span>
                    <span style={{ fontSize: '0.72rem', color: m.mishandledPct > 20 ? '#EF4444' : '#22C55E', fontWeight: 600 }}>{m.mishandledPct}%</span>
                    <span style={{ fontSize: '0.72rem', color: '#C9A84C' }}>{m.avgDurationFormatted}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <KpiCards metrics={m} />
                    <LeadsTable leads={seller.leads || []} search={search} setSearch={setSearch} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ========== PERSONAL VIEW ==========
  const metrics = data?.metrics
  const leads = data?.leads || []

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C9A84C' }}>Priority Leads</h1>
          <p style={{ fontSize: '0.72rem', color: '#8A8278', marginTop: '2px' }}>Your high-priority inquiry pipeline</p>
          <p style={{ fontSize: '0.6rem', color: '#5A5650', marginTop: '2px' }}>Updates every 40 min</p>
        </div>
        {isL2 && (
          <div style={{ display: 'flex', gap: '3px', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '3px' }}>
            <button onClick={() => setViewMode('my')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: viewMode === 'my' ? 'rgba(244,99,30,0.15)' : 'transparent', color: viewMode === 'my' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Priority</button>
            <button onClick={() => setViewMode('team')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: viewMode === 'team' ? 'rgba(244,99,30,0.15)' : 'transparent', color: viewMode === 'team' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Team</button>
          </div>
        )}
      </div>

      <KpiCards metrics={metrics} />
      <LeadsTable leads={leads} search={search} setSearch={setSearch} />
    </div>
  )
}