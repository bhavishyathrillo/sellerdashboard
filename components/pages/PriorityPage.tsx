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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6" />
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

function LeadsTable({ leads }: { leads: PriorityLead[] }) {
  const [search, setSearch] = useState('')
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

interface HierarchicalTableViewProps {
  viewType: 'admin' | 'l1'
  l1Groups?: any[]
  l2Groups?: any[]
  search: string
}

function HierarchicalTableView({ viewType, l1Groups = [], l2Groups = [], search }: HierarchicalTableViewProps) {
  const isL1View = viewType === 'l1'
  const [activeTab, setActiveTab] = useState<'l1' | 'l2' | 'seller'>(isL1View ? 'l2' : 'l1')
  const [sortField, setSortField] = useState<string>('total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Flatten Category Managers (L1)
  const l1Data = !isL1View ? l1Groups.map((l1: any) => {
    const total = l1.metrics.totalLeads || 0
    const called = l1.metrics.calledLeads || 0
    return {
      name: l1.l1_name || 'Not Mapped',
      email: l1.l1_email,
      l2_count: l1.l2_count,
      seller_count: l1.seller_count,
      total,
      called,
      notCalled: l1.metrics.notCalledLeads,
      avgDuration: l1.metrics.avgDurationSeconds,
      avgDurationFormatted: l1.metrics.avgDurationFormatted,
      mishandledPct: l1.metrics.mishandledPct,
      callRate: total > 0 ? Math.round((called / total) * 100) : 0,
    }
  }) : []

  // Flatten L1 Managers (L2)
  const l2Data: any[] = []
  if (isL1View) {
    l2Groups.forEach((l2: any) => {
      const total = l2.metrics.totalLeads || 0
      const called = l2.metrics.calledLeads || 0
      l2Data.push({
        name: l2.l2_name || 'Unknown',
        email: l2.l2_email,
        seller_count: l2.seller_count,
        total,
        called,
        notCalled: l2.metrics.notCalledLeads,
        avgDuration: l2.metrics.avgDurationSeconds,
        avgDurationFormatted: l2.metrics.avgDurationFormatted,
        mishandledPct: l2.metrics.mishandledPct,
        callRate: total > 0 ? Math.round((called / total) * 100) : 0,
      })
    })
  } else {
    l1Groups.forEach((l1: any) => {
      l1.l2_groups?.forEach((l2: any) => {
        const total = l2.metrics.totalLeads || 0
        const called = l2.metrics.calledLeads || 0
        l2Data.push({
          name: l2.l2_name || 'Unknown',
          email: l2.l2_email,
          l1_name: l1.l1_name || 'Not Mapped',
          seller_count: l2.seller_count,
          total,
          called,
          notCalled: l2.metrics.notCalledLeads,
          avgDuration: l2.metrics.avgDurationSeconds,
          avgDurationFormatted: l2.metrics.avgDurationFormatted,
          mishandledPct: l2.metrics.mishandledPct,
          callRate: total > 0 ? Math.round((called / total) * 100) : 0,
        })
      })
    })
  }

  // Flatten Sellers
  const sellerData: any[] = []
  if (isL1View) {
    l2Groups.forEach((l2: any) => {
      l2.sellers?.forEach((s: any) => {
        const total = s.metrics.totalLeads || 0
        const called = s.metrics.calledLeads || 0
        sellerData.push({
          name: s.seller_name || s.seller_email?.split('@')[0],
          email: s.seller_email,
          l2_name: l2.l2_name || 'Unknown',
          total,
          called,
          notCalled: s.metrics.notCalledLeads,
          avgDuration: s.metrics.avgDurationSeconds,
          avgDurationFormatted: s.metrics.avgDurationFormatted,
          mishandledPct: s.metrics.mishandledPct,
          callRate: total > 0 ? Math.round((called / total) * 100) : 0,
        })
      })
    })
  } else {
    l1Groups.forEach((l1: any) => {
      l1.l2_groups?.forEach((l2: any) => {
        l2.sellers?.forEach((s: any) => {
          const total = s.metrics.totalLeads || 0
          const called = s.metrics.calledLeads || 0
          sellerData.push({
            name: s.seller_name || s.seller_email?.split('@')[0],
            email: s.seller_email,
            l1_name: l1.l1_name || 'Not Mapped',
            l2_name: l2.l2_name || 'Unknown',
            total,
            called,
            notCalled: s.metrics.notCalledLeads,
            avgDuration: s.metrics.avgDurationSeconds,
            avgDurationFormatted: s.metrics.avgDurationFormatted,
            mishandledPct: s.metrics.mishandledPct,
            callRate: total > 0 ? Math.round((called / total) * 100) : 0,
          })
        })
      })
    })
  }

  // Determine active dataset
  let rawData = l1Data
  if (activeTab === 'l2') rawData = l2Data
  if (activeTab === 'seller') rawData = sellerData

  // Apply search query
  const query = search.toLowerCase().trim()
  const filteredData = query
    ? rawData.filter((item: any) => {
      return (
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        (item.l1_name && item.l1_name.toLowerCase().includes(query)) ||
        (item.l2_name && item.l2_name.toLowerCase().includes(query))
      )
    })
    : rawData

  // Apply sorting
  const sortedData = [...filteredData].sort((a: any, b: any) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    // Numbers
    aVal = aVal || 0
    bVal = bVal || 0
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  const requestSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc') // default sorting high to low (desc) for metrics
    }
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <span style={{ marginLeft: '4px', opacity: 0.3 }}>↕</span>
    }
    return sortDirection === 'asc'
      ? <span style={{ marginLeft: '4px', color: '#F4631E' }}>↑</span>
      : <span style={{ marginLeft: '4px', color: '#F4631E' }}>↓</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Sub-tabs inside Table View */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #232323', paddingBottom: '8px' }}>
        {!isL1View && (
          <button
            onClick={() => { setActiveTab('l1'); setSortField('total'); setSortDirection('desc'); }}
            style={{
              background: 'none', border: 'none', color: activeTab === 'l1' ? '#C9A84C' : '#8A8278',
              fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
              borderBottom: activeTab === 'l1' ? '2px solid #C9A84C' : 'none'
            }}
          >
            Category Managers ({l1Data.length})
          </button>
        )}
        <button
          onClick={() => { setActiveTab('l2'); setSortField('total'); setSortDirection('desc'); }}
          style={{
            background: 'none', border: 'none', color: activeTab === 'l2' ? '#C9A84C' : '#8A8278',
            fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
            borderBottom: activeTab === 'l2' ? '2px solid #C9A84C' : 'none'
          }}
        >
          L1 Managers ({l2Data.length})
        </button>
        <button
          onClick={() => { setActiveTab('seller'); setSortField('total'); setSortDirection('desc'); }}
          style={{
            background: 'none', border: 'none', color: activeTab === 'seller' ? '#C9A84C' : '#8A8278',
            fontSize: '0.8rem', fontWeight: 600, padding: '4px 8px', cursor: 'pointer',
            borderBottom: activeTab === 'seller' ? '2px solid #C9A84C' : 'none'
          }}
        >
          Sellers ({sellerData.length})
        </button>
      </div>

      <div className={styles.leaderboardWrap}>
        <div className={styles.leaderboardContainer}>
          {/* Header Row */}
          <div className={styles.leaderboardHeader}>
            <div className={styles.headerCell} style={{ justifyContent: 'center' }}>#</div>

            <div
              className={`${styles.headerCell} ${styles.sortable}`}
              onClick={() => requestSort('name')}
            >
              {activeTab === 'l1' ? 'Category Manager' : activeTab === 'l2' ? 'L1 Manager' : 'Seller'}
              {renderSortIcon('name')}
            </div>

            <div
              className={`${styles.headerCell} ${styles.sortable}`}
              onClick={() => requestSort('total')}
            >
              Leads {renderSortIcon('total')}
            </div>

            <div
              className={`${styles.headerCell} ${styles.sortable}`}
              onClick={() => requestSort('callRate')}
            >
              Call Rate {renderSortIcon('callRate')}
            </div>

            <div
              className={`${styles.headerCell} ${styles.sortable}`}
              onClick={() => requestSort('avgDuration')}
            >
              Avg Dur {renderSortIcon('avgDuration')}
            </div>

            <div
              className={`${styles.headerCell} ${styles.sortable}`}
              onClick={() => requestSort('mishandledPct')}
            >
              Mishandled {renderSortIcon('mishandledPct')}
            </div>
          </div>

          {/* Data Rows */}
          {sortedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#8A8278', background: '#141414', border: '1px solid #232323', borderRadius: '12px' }}>
              No matches found for "{search}"
            </div>
          ) : (
            sortedData.map((row: any, i) => {
              // Determine pill color class based on mishandled rate
              let pillClass = styles.pillSuccess
              if (row.mishandledPct > 50) {
                pillClass = styles.pillDanger
              } else if (row.mishandledPct > 20) {
                pillClass = styles.pillWarning
              }

              // Determine secondary text
              let subText = ''
              if (activeTab === 'l1') {
                subText = `${row.seller_count} sellers`
              } else if (activeTab === 'l2') {
                const parts = []
                if (row.l1_name && row.l1_name !== 'Not Mapped') {
                  parts.push(`Cat Mgr: ${row.l1_name}`)
                }
                parts.push(`${row.seller_count} sellers`)
                subText = parts.join(' · ')
              } else {
                const parts = []
                if (row.l2_name && row.l2_name !== 'Unknown') {
                  parts.push(`L1 Mgr: ${row.l2_name}`)
                }
                if (row.l1_name && row.l1_name !== 'Not Mapped') {
                  parts.push(`Cat Mgr: ${row.l1_name}`)
                }
                subText = parts.join(' · ')
              }

              return (
                <div key={row.email || i} className={styles.leaderboardRow}>
                  {/* Rank */}
                  <div className={styles.rankCell}>{i + 1}</div>

                  {/* Name and SubText */}
                  <div className={styles.nameCell}>
                    <span className={styles.nameText}>{row.name}</span>
                    {subText && <span className={styles.subText}>{subText}</span>}
                  </div>

                  {/* Leads */}
                  <div className={styles.metricCell}>{row.total}</div>

                  {/* Call Rate */}
                  <div className={styles.callRateCell}>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${row.callRate}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>{row.callRate}%</span>
                  </div>

                  {/* Avg Duration */}
                  <div className={styles.metricCell}>{row.avgDurationFormatted || '0s'}</div>

                  {/* Mishandled % */}
                  <div>
                    <span className={`${styles.mishandledPill} ${pillClass}`}>
                      {row.mishandledPct}%
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function CardHeaderStats({ metrics }: { metrics: any }) {
  if (!metrics) return null
  const total = metrics.totalLeads || 0
  const called = metrics.calledLeads || 0
  const callRate = total > 0 ? Math.round((called / total) * 100) : 0
  const mishandledPct = metrics.mishandledPct || 0

  let pillClass = styles.pillSuccess
  if (mishandledPct > 50) {
    pillClass = styles.pillDanger
  } else if (mishandledPct > 20) {
    pillClass = styles.pillWarning
  }

  // Choose progress bar color based on call rate
  let progressFillColor = '#22C55E' // green
  if (callRate < 30) {
    progressFillColor = '#EF4444' // red
  } else if (callRate < 70) {
    progressFillColor = '#C9A84C' // warning gold
  }

  return (
    <div className={styles.cardHeaderMetrics} onClick={e => e.stopPropagation()}>
      {/* Call Rate */}
      <div className={styles.cardMiniProgressBarCell} title={`${called} of ${total} leads called`}>
        <div className={styles.cardProgressBarTrack}>
          <div
            className={styles.cardProgressBarFill}
            style={{ width: `${callRate}%`, backgroundColor: progressFillColor }}
          />
        </div>
        <span className={styles.cardProgressText} style={{ color: progressFillColor }}>{callRate}%</span>
      </div>

      {/* Avg Duration */}
      <span className={styles.cardDurationLabel} title="Average Call Duration">
        {metrics.avgDurationFormatted || '0s'}
      </span>

      {/* Mishandled % */}
      <span className={`${styles.mishandledPill} ${pillClass}`} style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
        {mishandledPct}%
      </span>
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
          <HierarchicalTableView viewType="admin" l1Groups={l1Groups} search={search} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredL1Groups.map((l1: any) => {
              const isL1Expanded = expandedL1[l1.l1_email]
              const lm = l1.metrics
              return (
                <div key={l1.l1_email} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '12px', overflow: 'hidden' }}>
                  <div onClick={() => toggleL1(l1.l1_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={styles.chevronContainer}>{isL1Expanded ? <ChevronDown /> : <ChevronRight />}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block' }}>{l1.l1_name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{l1.l2_count} L1 Managers · {l1.seller_count} sellers · {lm.totalLeads} leads</span>
                      </div>
                    </div>
                    <CardHeaderStats metrics={lm} />
                  </div>
                  {isL1Expanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {l1.l2_groups.map((l2: any) => {
                        const isL2Expanded = expandedL2[l2.l2_email]
                        const l2m = l2.metrics
                        return (
                          <div key={l2.l2_email} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                            <div onClick={(e) => { e.stopPropagation(); toggleL2(l2.l2_email) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.chevronContainer}>{isL2Expanded ? <ChevronDown /> : <ChevronRight />}</span>
                                <div>
                                  <span style={{ fontWeight: 600, fontSize: '0.82rem', display: 'block' }}>{l2.l2_name}</span>
                                  <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{l2.seller_count} sellers · {l2m.totalLeads} leads</span>
                                </div>
                              </div>
                              <CardHeaderStats metrics={l2m} />
                            </div>
                            {isL2Expanded && (
                              <div style={{ padding: '0 14px 12px' }}>
                                {l2.sellers.map((seller: any) => {
                                  const isSellerExpanded = expandedSellers[seller.seller_email]
                                  const sm = seller.metrics
                                  return (
                                    <div key={seller.seller_email} style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px', overflow: 'hidden' }}>
                                      <div onClick={(e) => { e.stopPropagation(); toggleSeller(seller.seller_email) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', cursor: 'pointer' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span className={styles.chevronContainer}>{isSellerExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                                          <div>
                                            <span style={{ fontWeight: 500, fontSize: '0.75rem', display: 'block' }}>{seller.seller_name}</span>
                                            <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{sm.totalLeads} leads</span>
                                          </div>
                                        </div>
                                        <CardHeaderStats metrics={sm} />
                                      </div>
                                      {isSellerExpanded && (
                                        <div style={{ padding: '0 12px 10px' }}>
                                          <LeadsTable leads={seller.leads || []} />
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
          <HierarchicalTableView viewType="l1" l2Groups={l2Groups} search={search} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredL2Groups.map((group: any) => {
              const isExpanded = expandedL2[group.l2_email]
              const gm = group.metrics
              return (
                <div key={group.l2_email} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '12px', overflow: 'hidden' }}>
                  <div onClick={() => toggleL2(group.l2_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={styles.chevronContainer}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{group.l2_name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{group.seller_count} sellers · {gm.totalLeads} leads</span>
                      </div>
                    </div>
                    <CardHeaderStats metrics={gm} />
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {group.sellers.map((seller: any) => {
                        const isSellerExpanded = expandedSellers[seller.seller_email]
                        const sm = seller.metrics
                        return (
                          <div key={seller.seller_email} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', overflow: 'hidden' }}>
                            <div onClick={() => toggleSeller(seller.seller_email)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.chevronContainer}>{isSellerExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                                <div>
                                  <span style={{ fontWeight: 500, fontSize: '0.78rem', display: 'block' }}>{seller.seller_name}</span>
                                  <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{sm.totalLeads} leads</span>
                                </div>
                              </div>
                              <CardHeaderStats metrics={sm} />
                            </div>
                            {isSellerExpanded && (
                              <div style={{ padding: '0 14px 12px' }}>
                                <LeadsTable leads={seller.leads || []} />
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
            <button onClick={() => setViewMode('my')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: (viewMode as any) === 'my' ? 'rgba(244,99,30,0.15)' : 'transparent', color: (viewMode as any) === 'my' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Priority</button>
            <button onClick={() => setViewMode('team')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: (viewMode as any) === 'team' ? 'rgba(244,99,30,0.15)' : 'transparent', color: (viewMode as any) === 'team' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Team ({sellers.length})</button>
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
                    <span className={styles.chevronContainer}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</span>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{seller.seller_name}</span>
                      <span style={{ fontSize: '0.62rem', color: '#8A8278' }}>{m.totalLeads} leads</span>
                    </div>
                  </div>
                  <CardHeaderStats metrics={m} />
                </div>
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <LeadsTable leads={seller.leads || []} />
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
            <button onClick={() => setViewMode('my')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: (viewMode as any) === 'my' ? 'rgba(244,99,30,0.15)' : 'transparent', color: (viewMode as any) === 'my' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Priority</button>
            <button onClick={() => setViewMode('team')} style={{ padding: '7px 16px', border: 'none', borderRadius: '6px', background: (viewMode as any) === 'team' ? 'rgba(244,99,30,0.15)' : 'transparent', color: (viewMode as any) === 'team' ? '#F4631E' : '#8A8278', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>My Team</button>
          </div>
        )}
      </div>

      <KpiCards metrics={metrics} />
      <LeadsTable leads={leads} />
    </div>
  )
}