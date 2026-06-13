'use client'

import { useState } from 'react'
import Image from 'next/image'
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


 <div className={styles.videoBg} aria-hidden="false">
  <video
    className={styles.videoBgPlayer}
    src="https://ltiglt8xyyg9iroo.public.blob.vercel-storage.com/login-bg.mp4"
    autoPlay
    loop
    playsInline
  />
</div>
{/* Fade overlay */}
<div className={styles.videoOverlay} aria-hidden="true" />
      {/* Ambient glow */}
      <div className={styles.ambientGlow} aria-hidden="true"/>

      {/* Login card */}
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logoRow}>
          <Image
            src="/thrillo-logo.svg"
            alt="Thrillophilia"
            width={52}
            height={52}
            className={styles.logoImg}
            priority
          />
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Sign in to your sales dashboard</p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Work email</label>
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
            {error && <p className={styles.errorMsg} role="alert">{error}</p>}
          </div>

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} aria-hidden="true"/>
            ) : (
              <>Sign in <span className={styles.arrow}>→</span></>
            )}
          </button>
        </form>

        <p className={styles.hint}>Access restricted to Thrillophilia employees</p>

      </div>
    </div>
  )
}