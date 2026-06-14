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
}

interface HomePageProps {
  session: UserSession
}

const stageColors: Record<string, string> = {
  'yet to act':           '#EF4444',
  'information gathering':'#F59E0B',
  'template shared':      '#3B82F6',
  'negotiation':          '#8B5CF6',
  'follow up':            '#F4631E',
  'closed':               '#22C55E',
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

export default function MHLPage({ session }: HomePageProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'mine' | 'team'>('mine')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          email: session.email,
          role: session.role,
          view
        })
        const res = await fetch(`/api/mhl?${params}`)
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Failed to load'); return }
        setLeads(json)
      } catch {
        setError('Failed to load leads')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session.email, session.role, view])

  const stages = ['all', ...Array.from(new Set(leads.map(l => l.stage).filter(Boolean)))]

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.lead_id.toLowerCase().includes(search.toLowerCase()) ||
      l.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      (l.stage || '').toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    return matchSearch && matchStage
  })

  const mhlCount = filtered.filter(l => l.mhl_mho === 'MHL').length
  const mhoCount = filtered.filter(l => l.mhl_mho === 'MHO').length

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.counts}>
            <div className={styles.countBadge} style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}>
              <span className={styles.countNum}>{mhlCount}</span>
              <span className={styles.countLabel}>MHL</span>
            </div>
            <div className={styles.countBadge} style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}>
              <span className={styles.countNum}>{mhoCount}</span>
              <span className={styles.countLabel}>MHO</span>
            </div>
            <div className={styles.countBadge}>
              <span className={styles.countNum}>{filtered.length}</span>
              <span className={styles.countLabel}>Total</span>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* View toggle for managers */}
          {isManager && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${view === 'mine' ? styles.toggleActive : ''}`}
                onClick={() => setView('mine')}
              >
                My Leads
              </button>
              <button
                className={`${styles.toggleBtn} ${view === 'team' ? styles.toggleActive : ''}`}
                onClick={() => setView('team')}
              >
                Team View
              </button>
            </div>
          )}

          {/* Search */}
          <input
            className={styles.search}
            placeholder="Search lead, seller..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Stage filter */}
          <select
            className={styles.select}
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            {stages.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All Stages' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p>Loading leads...</p>
        </div>
      ) : error ? (
        <div className={styles.errorWrap}><p>{error}</p></div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyWrap}>
          <p>No leads found</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Stage</th>
                {(view === 'team' || isManager) && <th>Owner</th>}
                <th>Type</th>
                <th>Last Call</th>
                <th>Days Since Call</th>
                {view === 'team' && <th>L2</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const days = daysSinceCall(lead.last_call)
                const stageColor = stageColors[lead.stage?.toLowerCase()] || '#4A4642'
                const typeColor = lead.mhl_mho === 'MHL' ? '#EF4444' : '#F59E0B'

                return (
                  <tr key={lead.id} className={styles.row}>
                    <td>
                      <span className={styles.leadId}>{lead.lead_id}</span>
                    </td>
                    <td>
                      <span
                        className={styles.stageBadge}
                        style={{
                          background: `${stageColor}18`,
                          color: stageColor,
                          borderColor: `${stageColor}30`
                        }}
                      >
                        {lead.stage || '—'}
                      </span>
                    </td>
                    {(view === 'team' || isManager) && (
                      <td>
                        <span className={styles.ownerEmail}>{lead.owner_email}</span>
                      </td>
                    )}
                    <td>
                      <span
                        className={styles.typeBadge}
                        style={{
                          background: `${typeColor}15`,
                          color: typeColor,
                          borderColor: `${typeColor}25`
                        }}
                      >
                        {lead.mhl_mho}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {formatLastCall(lead.last_call)}
                    </td>
                    <td>
                      {days !== null ? (
                        <span className={styles.daysBadge} style={{
                          color: days > 7 ? '#EF4444' : days > 3 ? '#F59E0B' : '#22C55E'
                        }}>
                          {days}d ago
                        </span>
                      ) : '—'}
                    </td>
                    {view === 'team' && (
                      <td className={styles.managerCell}>{lead.l2 || '—'}</td>
                    )}
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