'use client'

import { useState } from 'react'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  onLogin: (email: string) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (val: string) => {
    if (!val) return 'Enter your email'
    if (!val.endsWith('@thrillophilia.com')) return 'Only @thrillophilia.com accounts allowed'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    const err = validate(trimmed)
    if (err) { setError(err); return }

    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    onLogin(trimmed)
    setLoading(false)
  }

  return (
    <div className={styles.wrapper}>

      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.card}>

        <div className={styles.logoRow}>
          <div className={styles.logoMark} aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="#F4631E" />
              <path d="M14 16h20M24 16v16M18 28l6 4 6-4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Sign in to your sales dashboard</p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@thrillophilia.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className={styles.errorMsg} role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className={styles.btn}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <>Sign in <span className={styles.arrow}>→</span></>
            )}
          </button>
        </form>

        <p className={styles.hint}>
          Access restricted to Thrillophilia employees
        </p>

      </div>
    </div>
  )
}