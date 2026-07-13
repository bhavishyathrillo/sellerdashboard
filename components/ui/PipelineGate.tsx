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

export default function PipelineGate({ session, onSubmitted, onLogout }: PipelineGateProps) {
  const [pnrInputs, setPnrInputs] = useState([{ pnr_number: '', topline_value: '', bottomline_value: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const addPnrRow = () => {
    setPnrInputs([...pnrInputs, { pnr_number: '', topline_value: '', bottomline_value: '' }])
  }

  const removePnrRow = (idx: number) => {
    setPnrInputs(pnrInputs.filter((_, i) => i !== idx))
  }

  const updatePnr = (idx: number, field: string, val: string) => {
    const newInputs = [...pnrInputs]
    newInputs[idx] = { ...newInputs[idx], [field]: val }
    setPnrInputs(newInputs)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const parsedPnrs = pnrInputs.map(p => ({
      pnr_number: p.pnr_number.trim(),
      topline_value: parseFloat(p.topline_value.replace(/,/g, '')) || 0,
      bottomline_value: parseFloat(p.bottomline_value.replace(/,/g, '')) || 0,
    })).filter(p => p.pnr_number && (p.topline_value > 0 || p.bottomline_value > 0))

    if (parsedPnrs.length === 0) {
      setError('Please enter at least one valid PNR with an amount.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: session.email, 
          pnrs: parsedPnrs
        })
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

      <div className={styles.card} style={{ maxWidth: '600px' }}> {/* Made slightly wider for PNR fields */}

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
          {/* PNR Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8A8278', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PNR Details</label>
            {pnrInputs.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ flex: 1.2 }}>
                  <input type="text" placeholder="PNR #" value={p.pnr_number} onChange={e => updatePnr(idx, 'pnr_number', e.target.value)} style={{ width: '100%', padding: '12px 10px', borderRadius: '10px', border: '1px solid #333', background: '#111', color: '#FFF', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="number" placeholder="Topline ₹" value={p.topline_value} onChange={e => updatePnr(idx, 'topline_value', e.target.value)} style={{ width: '100%', padding: '12px 10px', borderRadius: '10px', border: '1px solid #333', background: '#111', color: '#FFF', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="number" placeholder="Btmline ₹" value={p.bottomline_value} onChange={e => updatePnr(idx, 'bottomline_value', e.target.value)} style={{ width: '100%', padding: '12px 10px', borderRadius: '10px', border: '1px solid #333', background: '#111', color: '#FFF', outline: 'none' }} />
                </div>
                {pnrInputs.length > 1 && (
                  <button type="button" onClick={() => removePnrRow(idx)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', fontSize: '1rem' }}>✕</button>
                )}
              </div>
            ))}
          </div>

          <button type="button" onClick={addPnrRow} style={{ marginTop: '12px', background: 'transparent', border: '1px dashed #444', color: '#C9A84C', padding: '10px', borderRadius: '10px', cursor: 'pointer', width: '100%', fontWeight: 600, transition: 'all 0.2s' }}>
            + Add More PNR
          </button>

          {error && <p className={styles.errorMsg} style={{ marginTop: '16px' }}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={submitting} style={{ marginTop: '20px' }}>
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