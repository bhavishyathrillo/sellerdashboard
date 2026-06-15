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

interface MonthlyOverview {
  goal: number
  shb: number
  achieved: number
  required_daily: number
  pct: number
}

interface PipelinePageProps {
  session: UserSession
}

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  } catch { return d }
}

function fmtTime(d: string) {
  try {
    return new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return '—' }
}

export default function PipelinePage({ session }: PipelinePageProps) {
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null)
  const [monthly, setMonthly] = useState<MonthlyOverview | null>(null)
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
    setError('')
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
      setMonthly(json.monthly)
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
      setSuccess(`Submitted successfully!`)
      setValue('')
      load()
    } catch {
      setError('Submission failed. Try again.')
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
  const greenRate = history.length > 0
    ? ((greenCount / history.length) * 100).toFixed(0)
    : '0'

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const monthLabel = new Date().toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  }).toUpperCase()

  return (
    <div className={styles.page}>

      {/* Top section — Submit + Monthly Overview side by side */}
      <div className={styles.topGrid}>

        {/* Pipeline submit card */}
        <div className={`${styles.submitCard} ${
          todayStatus?.submitted
            ? todayStatus.status === 'GREEN' ? styles.cardGreen : styles.cardRed
            : styles.cardPending
        }`}>

          {/* Card header */}
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Pipeline for Today</h2>
              <p className={styles.cardDate}>{todayFormatted}</p>
            </div>
            {todayStatus?.past_deadline && !todayStatus.submitted && (
              <span className={styles.deadlineBadge}>⚠ Past Deadline</span>
            )}
            {todayStatus?.submitted && (
              <span className={`${styles.statusPill} ${
                todayStatus.status === 'GREEN' ? styles.pillGreen : styles.pillRed
              }`}>
                {todayStatus.status}
              </span>
            )}
          </div>

          {/* Submitted state */}
          {todayStatus?.submitted ? (
            <div className={styles.submittedState}>
              <div className={styles.submittedAmount}>
                {fmt(todayStatus.pipeline_value || 0)}
              </div>
              <div className={styles.submittedMeta}>
                <span>Submitted at {todayStatus.submitted_at ? fmtTime(todayStatus.submitted_at) : '—'}</span>
                <span className={styles.dot}>·</span>
                <span>Required: {fmt(todayStatus.required_daily)}</span>
                <span className={styles.dot}>·</span>
                <span style={{
                  color: (todayStatus.pipeline_value || 0) >= todayStatus.required_daily
                    ? '#22C55E' : '#EF4444'
                }}>
                  {(todayStatus.pipeline_value || 0) >= todayStatus.required_daily
                    ? `↑ ${fmt((todayStatus.pipeline_value || 0) - todayStatus.required_daily)} above`
                    : `↓ ${fmt(todayStatus.required_daily - (todayStatus.pipeline_value || 0))} below`
                  } required
                </span>
              </div>
            </div>
          ) : (
            /* Not submitted state */
            <div className={styles.notSubmittedState}>
              <div className={styles.requiredRow}>
  <span className={styles.requiredLabel}>Required today</span>
  <span className={styles.requiredValue} style={{
    color: (todayStatus?.required_daily || 0) <= 0 ? '#22C55E' : '#F4631E'
  }}>
    {(todayStatus?.required_daily || 0) <= 0
      ? '✓ Target achieved!'
      : fmt(todayStatus?.required_daily || 0)
    }
  </span>
</div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Pipeline Value (₹)
                  </label>
                  <div className={styles.inputWrap}>
                    <span className={styles.rupeeSign}>₹</span>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="e.g. 150000"
                      value={value}
                      onChange={e => { setValue(e.target.value); setError('') }}
                      disabled={submitting}
                      min="0"
                    />
                  </div>
                </div>

                {error && <p className={styles.errorMsg}>{error}</p>}
                {success && <p className={styles.successMsg}>✓ {success}</p>}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting
                    ? <span className={styles.btnSpinner} />
                    : <>Submit Pipeline →</>
                  }
                </button>
              </form>

              {todayStatus?.past_deadline && (
                <p className={styles.deadlineNote}>
                  Deadline was {todayStatus.deadline} — submission still open
                </p>
              )}
            </div>
          )}
        </div>

        {/* Monthly Overview card */}
        {monthly && (
          <div className={styles.monthlyCard}>
            <div className={styles.monthlyHeader}>
              <h3 className={styles.monthlyTitle}>Monthly Overview</h3>
              <span className={styles.monthLabel}>{monthLabel}</span>
            </div>

            <div className={styles.monthlyRows}>
              <div className={styles.monthlyRow}>
                <span className={styles.monthlyRowLabel}>Goal</span>
                <span className={styles.monthlyRowValue}>{fmt(monthly.goal)}</span>
              </div>
              <div className={styles.monthlyDivider} />
              <div className={styles.monthlyRow}>
                <span className={styles.monthlyRowLabel}>SHB</span>
                <span className={styles.monthlyRowValue}>{fmt(monthly.shb)}</span>
              </div>
              <div className={styles.monthlyDivider} />
              <div className={styles.monthlyRow}>
                <span className={styles.monthlyRowLabel}>Achieved</span>
                <span className={`${styles.monthlyRowValue} ${styles.achievedVal}`}>
                  {fmt(monthly.achieved)}
                </span>
              </div>
              <div className={styles.monthlyDivider} />
              <div className={styles.monthlyRow}>
                <span className={styles.monthlyRowLabel}>Required (Daily)</span>
                <span className={styles.monthlyRowValue}>{fmt(monthly.required_daily)}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className={styles.monthlyProgress}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Goal Achievement</span>
                <span className={styles.progressPct}>{monthly.pct.toFixed(1)}% of goal</span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${Math.min(monthly.pct, 100)}%` }}
                />
                {/* SHB marker */}
                <div
                  className={styles.shbMarker}
                  style={{ left: `${Math.min((monthly.shb / monthly.goal) * 100, 100)}%` }}
                >
                  <span className={styles.shbMarkerLabel}>SHB</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className={styles.statsStrip}>
        <div className={styles.stat}>
          <span className={styles.statVal}>{history.length}</span>
          <span className={styles.statLbl}>Total Submissions</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: '#22C55E' }}>{greenCount}</span>
          <span className={styles.statLbl}>Green Days</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal} style={{ color: '#EF4444' }}>{redCount}</span>
          <span className={styles.statLbl}>Red Days</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal}>{fmt(avgPipeline)}</span>
          <span className={styles.statLbl}>Avg Pipeline</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statVal} style={{
            color: Number(greenRate) >= 70 ? '#22C55E' : Number(greenRate) >= 40 ? '#F59E0B' : '#EF4444'
          }}>{greenRate}%</span>
          <span className={styles.statLbl}>Green Rate</span>
        </div>
      </div>

      {/* History */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
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
          <div className={styles.emptyWrap}>
            <p>No submissions yet</p>
          </div>
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
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => {
                  const diff = (row.pipeline_value || 0) - (row.required_daily || 0)
                  const above = diff >= 0
                  return (
                    <tr key={row.id} className={styles.row}>
                      <td className={styles.dateCell}>{fmtDate(row.date)}</td>
                      {view === 'team' && (
                        <td className={styles.sellerCell}>{row.seller_email}</td>
                      )}
                      <td className={styles.valueCell}>{fmt(row.pipeline_value)}</td>
                      <td className={styles.reqCell}>{fmt(row.required_daily)}</td>
                      <td>
                        <span style={{
                          color: above ? '#22C55E' : '#EF4444',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {above ? '↑' : '↓'} {fmt(Math.abs(diff))}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${
                          row.status === 'GREEN' ? styles.badgeGreen : styles.badgeRed
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className={styles.timeCell}>
                        {row.submitted_at ? fmtTime(row.submitted_at) : '—'}
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