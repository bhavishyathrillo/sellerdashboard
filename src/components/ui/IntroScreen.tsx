'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './IntroScreen.module.css'

interface IntroScreenProps {
  onComplete: () => void
}

type Phase = 'black' | 'glow' | 'logo' | 'orbit' | 'title' | 'tagline' | 'hold' | 'fade'

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>('black')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return
    const timings: [Phase, number][] = [
      ['glow',    300],
      ['logo',    800],
      ['orbit',   1600],
      ['title',   2400],
      ['tagline', 3200],
      ['hold',    4200],
      ['fade',    5500],
    ]
    const timers = timings.map(([p, d]) => setTimeout(() => setPhase(p), d))
    const done = setTimeout(() => onComplete(), 6200)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [skipped, onComplete])

  const handleSkip = () => { setSkipped(true); onComplete() }
  const is = (...phases: Phase[]) => phases.includes(phase)

  return (
    <div className={`${styles.intro} ${phase === 'fade' ? styles.fadeOut : ''}`}>

      <div className={`${styles.glow} ${is('glow','logo','orbit','title','tagline','hold') ? styles.glowVisible : ''}`} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <div className={styles.center}>

        {/* Stage — logo + orbit */}
        <div className={styles.stage}>

          {/* Orbit ring */}
          <svg
            className={`${styles.orbitSvg} ${is('orbit','title','tagline','hold','fade') ? styles.orbitVisible : ''}`}
            viewBox="0 0 320 320" fill="none" aria-hidden="true"
          >
            <ellipse cx="160" cy="160" rx="148" ry="62"
              stroke="rgba(244,99,30,0.25)" strokeWidth="1"
              className={styles.orbitOuter}
            />
            <ellipse cx="160" cy="160" rx="148" ry="62"
              stroke="rgba(244,99,30,0.85)" strokeWidth="1.5"
              className={styles.orbitInner}
            />
          </svg>

          {/* Real Thrillophilia logo */}
          <div className={`${styles.logoWrap} ${is('logo','orbit','title','tagline','hold','fade') ? styles.logoVisible : ''}`}>
            <Image
              src="/thrillo-logo-clean.svg"
              alt="Thrillophilia"
              width={140}
              height={128}
              priority
              className={styles.logoImg}
            />
            {/* Light sweep */}
            <div className={`${styles.sweep} ${is('logo','orbit','title','tagline','hold','fade') ? styles.sweepActive : ''}`} aria-hidden="true" />
          </div>

          {/* Orange burst */}
          <div className={`${styles.burst} ${is('orbit','title','tagline','hold','fade') ? styles.burstActive : ''}`} aria-hidden="true" />

        </div>

        {/* Brand name */}
        <div className={`${styles.titleWrap} ${is('title','tagline','hold','fade') ? styles.titleVisible : ''}`}>
          {'THRILLOPHILIA'.split('').map((char, i) => (
            <span key={i} className={styles.titleChar} style={{ animationDelay: `${i * 42}ms` }}>
              {char}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className={`${styles.tagline} ${is('tagline','hold','fade') ? styles.taglineVisible : ''}`}>
          Every journey begins here
        </p>

        <div className={`${styles.rule} ${is('tagline','hold','fade') ? styles.ruleVisible : ''}`} aria-hidden="true" />

      </div>

      <button className={styles.skip} onClick={handleSkip} aria-label="Skip intro">Skip</button>
    </div>
  )
}