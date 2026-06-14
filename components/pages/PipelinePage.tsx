'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
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

interface TodayStatus {
  submitted: boolean
  pipeline_value?: number
  status?: string
  submitted_at?: string
  required_daily: number
  deadline: string
  past_deadline: boolean
}

interface PipelinePageProps {
  session: UserSession
}

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  } catch { return d }
}

export default function PipelinePage({ session }: PipelinePageProps) {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null)
  const [history, setHistory] = useState<PipelineSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [view, setView] = useState<'mine' | 'team'>('mine')

  const isManager = ['L1', 'L2', 'ADMIN', 'MODERATOR'].includes(session.role)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        email: session.email,
        role: session.role,
        view
      })
      const res = await fetch(`/api/pipeline?${params}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Failed to load'); return }
      setTodayStatus(json.today)
      setHistory(json.history || [])
    } catch {
      setError('Failed to load pipeline data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session.email, session.role, view])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value.replace(/,/g, ''))
    if (!num || num <= 0) { setError('Enter a valid pipeline value'); return }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, pipeline_value: num })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Submission failed'); return }
      setSuccess(`Submitted! Status: ${json.status}`)
      setValue('')
      load()
    } catch {
      setError('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p>Loading pipeline...</p>
    </div>
  )

  const greenCount = history.filter(h => h.status === 'GREEN').length
  const redCount = history.filter(h => h.status === 'RED').length
  const avgPipeline = history.length > 0
    ? history.reduce((a, b) => a + (b.pipeline_value || 0), 0) / history.length
    : 0

  return (
    <div className={styles.page}>

      {/* Today's submission box — only for seller's own view */}
      {view === 'mine' && todayStatus && (
        <div className={`${styles.todayCard} ${todayStatus.submitted
          ? todayStatus.status === 'GREEN' ? styles.todayGreen : styles.todayRed
          : styles.todayPending}`}
        >
          <div className={styles.todayLeft}>
            <div className={styles.todayHeader}>
              <h2 className={styles.todayTitle}>Today's Pipeline</h2>
              <span className={styles.todayDate}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </span>
            </div>

            {todayStatus.submitted ? (
              <div className={styles.submittedInfo}>
                <div className={styles.submittedValue}>
                  {fmt(todayStatus.pipeline_value || 0)}
                  <span className={`${styles.statusBadge} ${todayStatus.status === 'GREEN'
                    ? styles.badgeGreen : styles.badgeRed}`}>
                    {todayStatus.status}
                  </span>
                </div>
                <p className={styles.submittedMeta}>
                  Submitted at {todayStatus.submitted_at
                    ? new Date(todayStatus.submitted_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit'
                      })
                    : '—'}
                  {' · '}Required: {fmt(todayStatus.required_daily)}
                </p>
              </div>
            ) : (
              <div className={styles.submitArea}>
                <p className={styles.requiredText}>
                  Required today: <strong>{fmt(todayStatus.required_daily)}</strong>
                  {todayStatus.past_deadline && (
                    <span className={styles.deadlineMissed}> · Deadline passed ({todayStatus.deadline})</span>
                  )}
                </p>
                <form onSubmit={handleSubmit} className={styles.submitForm}>
                  <div className={styles.inputWrap}>
                    <span className={styles.rupee}>₹</span>
                    <input
                      type="number"
                      className={styles.pipelineInput}
                      placeholder="Enter pipeline value"
                      value={value}
                      onChange={e => { setValue(e.target.value); setError('') }}
                      disabled={submitting}
                      min="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={submitting}
                  >
                    {submitting ? <span className={styles.spinner} /> : 'Submit Pipeline'}
                  </button>
                </form>
                {error && <p className={styles.errorMsg}>{error}</p>}
                {success && <p className={styles.successMsg}>{success}</p>}
              </div>
            )}
          </div>

          <div className={styles.todayRight}>
            <div className={styles.requiredBig}>
              <p className={styles.requiredLabel}>Daily Required</p>
              <p className={styles.requiredValue}>{fmt(todayStatus.required_daily)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Total Submissions</p>
          <p className={styles.statNum}>{history.length}</p>
        </div>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Green Days</p>
          <p className={styles.statNum} style={{ color: '#22C55E' }}>{greenCount}</p>
        </div>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Red Days</p>
          <p className={styles.statNum} style={{ color: '#EF4444' }}>{redCount}</p>
        </div>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Avg Pipeline</p>
          <p className={styles.statNum}>{fmt(avgPipeline)}</p>
        </div>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Green Rate</p>
          <p className={styles.statNum} style={{ color: '#22C55E' }}>
            {history.length > 0 ? ((greenCount / history.length) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      {/* History table */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Submission History</h3>
          {isManager && (
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${view === 'mine' ? styles.toggleActive : ''}`}
                onClick={() => setView('mine')}
              >My Submissions</button>
              <button
                className={`${styles.toggleBtn} ${view === 'team' ? styles.toggleActive : ''}`}
                onClick={() => setView('team')}
              >Team View</button>
            </div>
          )}
        </div>

        {history.length === 0 ? (
          <div className={styles.emptyWrap}><p>No submissions yet</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  {view === 'team' && <th>Seller</th>}
                  <th>Pipeline Value</th>
                  <th>Required</th>
                  <th>vs Required</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => {
                  const diff = (row.pipeline_value || 0) - (row.required_daily || 0)
                  const above = diff >= 0
                  return (
                    <tr key={row.id} className={styles.row}>
                      <td>{fmtDate(row.date)}</td>
                      {view === 'team' && (
                        <td className={styles.sellerCell}>{row.seller_email}</td>
                      )}
                      <td className={styles.valueCell}>{fmt(row.pipeline_value)}</td>
                      <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                      <td>
                        <span style={{ color: above ? '#22C55E' : '#EF4444', fontSize: '0.75rem', fontWeight: 500 }}>
                          {above ? '↑' : '↓'} {fmt(Math.abs(diff))}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${row.status === 'GREEN'
                          ? styles.badgeGreen : styles.badgeRed}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className={styles.timeCell}>
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit', minute: '2-digit'
                            })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}