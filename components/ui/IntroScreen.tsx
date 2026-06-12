'use client'

import { useEffect, useState } from 'react'
import styles from './IntroScreen.module.css'

interface IntroScreenProps {
  onComplete: () => void
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'tagline' | 'fade'>('logo')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return

    const t1 = setTimeout(() => setPhase('tagline'), 1200)
    const t2 = setTimeout(() => setPhase('fade'), 3000)
    const t3 = setTimeout(() => onComplete(), 3600)

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [skipped, onComplete])

  const handleSkip = () => {
    setSkipped(true)
    onComplete()
  }

  return (
    <div className={`${styles.intro} ${phase === 'fade' ? styles.fadeOut : ''}`}>

      <div className={styles.grid} aria-hidden="true" />

      <div className={styles.center}>

        <div className={`${styles.logoMark} ${styles.appear}`}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect width="48" height="48" rx="14" fill="#F4631E" />
            <path
              d="M14 16h20M24 16v16M18 28l6 4 6-4"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className={`${styles.brand} ${styles.appear}`}>
          Thrillophilia
        </h1>

        <p className={`${styles.tagline} ${phase === 'tagline' || phase === 'fade' ? styles.taglineVisible : ''}`}>
          Sales Intelligence Platform
        </p>

        <div className={`${styles.line} ${phase === 'tagline' || phase === 'fade' ? styles.lineVisible : ''}`} aria-hidden="true" />

      </div>

      <button
        className={styles.skip}
        onClick={handleSkip}
        aria-label="Skip intro"
      >
        Skip
      </button>

    </div>
  )
}