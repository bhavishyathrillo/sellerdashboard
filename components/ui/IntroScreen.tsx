'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './IntroScreen.module.css'

interface IntroScreenProps {
  onComplete: () => void
}

type Phase = 'black' | 'glow' | 'logo' | 'title' | 'tagline' | 'hold' | 'fade'

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>('black')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return

    const timings: [Phase, number][] = [
      ['glow',    300],
      ['logo',    800],
      ['title',   1800],
      ['tagline', 2700],
      ['hold',    3500],
      ['fade',    5000],
    ]

    const timers = timings.map(([p, delay]) =>
      setTimeout(() => setPhase(p), delay)
    )
    const done = setTimeout(() => onComplete(), 5800)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [skipped, onComplete])

  const handleSkip = () => { setSkipped(true); onComplete() }
  const is = (...phases: Phase[]) => phases.includes(phase)

  return (
    <div className={`${styles.intro} ${phase === 'fade' ? styles.fadeOut : ''}`}>

      {/* Warm radial glow */}
      <div className={`${styles.glow} ${is('glow','logo','title','tagline','hold','fade') ? styles.glowVisible : ''}`} aria-hidden="true" />

      {/* Subtle noise */}
      <div className={styles.noise} aria-hidden="true" />

      {/* Center stage */}
      <div className={styles.center}>

        {/* Orbit ring SVG — draws around the logo */}
        <div className={styles.orbitContainer}>
          <svg
            className={`${styles.orbitSvg} ${is('logo','title','tagline','hold','fade') ? styles.orbitVisible : ''}`}
            viewBox="0 0 300 300"
            fill="none"
            aria-hidden="true"
          >
            <ellipse
              cx="150" cy="150" rx="138" ry="58"
              stroke="rgba(244,99,30,0.25)"
              strokeWidth="1"
              className={styles.orbitOuter}
            />
            <ellipse
              cx="150" cy="150" rx="138" ry="58"
              stroke="rgba(244,99,30,0.8)"
              strokeWidth="1.5"
              className={`${styles.orbitInner} ${is('title','tagline','hold','fade') ? styles.orbitBright : ''}`}
            />
          </svg>

          {/* Logo */}
          <div className={`${styles.logoWrap} ${is('logo','title','tagline','hold','fade') ? styles.logoVisible : ''}`}>
            <Image
              src="/thrillo-logo.svg"
              alt="Thrillophilia logo"
              width={110}
              height={110}
              priority
              className={styles.logoImg}
            />
            {/* Light sweep */}
            <div className={`${styles.sweep} ${is('logo','title','tagline','hold','fade') ? styles.sweepActive : ''}`} aria-hidden="true" />
          </div>
        </div>

        {/* Brand name */}
        <div className={`${styles.titleWrap} ${is('title','tagline','hold','fade') ? styles.titleVisible : ''}`}>
          {'THRILLOPHILIA'.split('').map((char, i) => (
            <span
              key={i}
              className={styles.titleChar}
              style={{ animationDelay: `${i * 42}ms` }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className={`${styles.tagline} ${is('tagline','hold','fade') ? styles.taglineVisible : ''}`}>
          Every journey begins here
        </p>

        {/* Rule */}
        <div className={`${styles.rule} ${is('tagline','hold','fade') ? styles.ruleVisible : ''}`} aria-hidden="true" />

      </div>

      {/* Skip */}
      <button className={styles.skip} onClick={handleSkip} aria-label="Skip intro">
        Skip
      </button>

    </div>
  )
}