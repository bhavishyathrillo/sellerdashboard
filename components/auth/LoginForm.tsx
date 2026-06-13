'use client'

import { useState } from 'react'
import Image from 'next/image'
import styles from './LoginForm.module.css'

interface LoginFormProps {
  onLogin: (email: string, name: string, role: string) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    if (!trimmedEmail) { setError('Enter your email'); return }
    if (!trimmedPassword) { setError('Enter your password'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      onLogin(data.email, data.name, data.role)
    } catch {
      setError('Something went wrong. Try again.')
    }

    setLoading(false)
  }

  return (
    <div className={styles.wrapper}>

      {/* Video background */}
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
      <div className={styles.ambientGlow} aria-hidden="true" />

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

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
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
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <p className={styles.errorMsg} role="alert">{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" />
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