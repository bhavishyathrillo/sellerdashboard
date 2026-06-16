'use client'

import { useState } from 'react'
import Image from 'next/image'
import { UserSession } from '@/lib/session'
import styles from './PipelineGate.module.css'

interface PipelineGateProps {
  session: UserSession
  onSubmitted: () => void
  onLogout: () => void
}

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n)}`
}

export default function PipelineGate({ session, onSubmitted, onLogout }: PipelineGateProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value.replace(/,/g, ''))
    if (!num || num <= 0) { setError('Enter a valid pipeline value'); return }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, pipeline_value: num })
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Submission failed'); return }
      onSubmitted()
    } catch {
      setError('Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrapper}>

      {/* Background glow */}
      <div className={styles.glow} />

      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <Image src="/thrillo-logo.svg" alt="Thrillophilia" width={40} height={40} className={styles.logo} />
          <div className={styles.headerText}>
            <h1 className={styles.greeting}>Good {getTimeOfDay()}, {session.name?.split(' ')[0]}</h1>
            <p className={styles.date}>{todayFormatted}</p>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider} />

        {/* Message */}
        <div className={styles.message}>
          <span className={styles.lockIcon}>🔒</span>
          <div>
            <p className={styles.messageTitle}>Submit today's pipeline to continue</p>
            <p className={styles.messageSub}>Your dashboard is locked until you log your pipeline for the day.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Pipeline Value (₹)</label>
            <div className={styles.inputWrap}>
              <span className={styles.rupee}>₹</span>
              <input
                type="number"
                className={styles.input}
                placeholder="Enter your pipeline for today"
                value={value}
                onChange={e => { setValue(e.target.value); setError('') }}
                disabled={submitting}
                autoFocus
                min="0"
              />
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={submitting}>
            {submitting ? (
              <span className={styles.spinner} />
            ) : (
              <>Unlock Dashboard →</>
            )}
          </button>
        </form>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={onLogout}>
          Sign out
        </button>

      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}