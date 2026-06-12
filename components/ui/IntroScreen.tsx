'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import styles from './IntroScreen.module.css'

interface IntroScreenProps {
  onComplete: () => void
}

type Phase = 'black' | 'ring' | 'logo' | 'title' | 'tagline' | 'hold' | 'fade'

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>('black')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return

    const timings: [Phase, number][] = [
      ['ring',    400],
      ['logo',    1000],
      ['title',   1800],
      ['tagline', 2600],
      ['hold',    3400],
      ['fade',    4800],
    ]

    const timers = timings.map(([p, delay]) =>
      setTimeout(() => setPhase(p), delay)
    )
    const done = setTimeout(() => onComplete(), 5600)

    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [skipped, onComplete])

  const handleSkip = () => {
    setSkipped(true)
    onComplete()
  }

  const is = (...phases: Phase[]) => phases.includes(phase)

  return (
    <div className={`${styles.intro} ${phase === 'fade' ? styles.fadeOut : ''}`}>

      {/* Noise texture overlay */}
      <div className={styles.noise} aria-hidden="true" />

      {/* Ambient radial glow — appears with logo */}
      <div className={`${styles.glow} ${is('logo','title','tagline','hold','fade') ? styles.glowVisible : ''}`} aria-hidden="true" />

      {/* Horizontal scan line */}
      <div className={`${styles.scanline} ${is('ring','logo','title','tagline','hold') ? styles.scanlineActive : ''}`} aria-hidden="true" />

      {/* Center stage */}
      <div className={styles.center}>

        {/* SVG orbit ring — draws itself */}
        <div className={`${styles.ringWrap} ${is('ring','logo','title','tagline','hold','fade') ? styles.ringVisible : ''}`}>
          <svg className={styles.ringSvg} viewBox="0 0 200 200" fill="none" aria-hidden="true">
            {/* Outer orbit ellipse */}
            <ellipse
              cx="100" cy="100" rx="90" ry="38"
              stroke="rgba(244,99,30,0.35)"
              strokeWidth="1"
              className={styles.orbitOuter}
            />
            {/* Inner orbit ellipse */}
            <ellipse
              cx="100" cy="100" rx="90" ry="38"
              stroke="rgba(244,99,30,0.7)"
              strokeWidth="1.5"
              className={`${styles.orbitInner} ${is('logo','title','tagline','hold','fade') ? styles.orbitBright : ''}`}
            />
            {/* Swoosh accent */}
            <path
              d="M 20 100 Q 100 60 180 100"
              stroke="rgba(244,99,30,0.4)"
              strokeWidth="1"
              fill="none"
              className={styles.swoosh}
            />
          </svg>

          {/* Logo inside ring */}
          <div className={`${styles.logoWrap} ${is('logo','title','tagline','hold','fade') ? styles.logoVisible : ''}`}>
            <Image
              src="/thrillo-logo.png"
              alt="Thrillophilia"
              width={88}
              height={88}
              priority
              className={styles.logoImg}
            />
            {/* Light sweep */}
            <div className={`${styles.sweep} ${is('logo','title','tagline','hold','fade') ? styles.sweepActive : ''}`} aria-hidden="true" />
          </div>
        </div>

        {/* Brand name — letters stagger in */}
        <div className={`${styles.titleWrap} ${is('title','tagline','hold','fade') ? styles.titleVisible : ''}`}>
          {'THRILLOPHILIA'.split('').map((char, i) => (
            <span
              key={i}
              className={styles.titleChar}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className={`${styles.tagline} ${is('tagline','hold','fade') ? styles.taglineVisible : ''}`}>
          Every journey begins here
        </p>

        {/* Bottom rule line */}
        <div className={`${styles.rule} ${is('tagline','hold','fade') ? styles.ruleVisible : ''}`} aria-hidden="true" />

      </div>

      {/* Skip */}
      <button className={styles.skip} onClick={handleSkip} aria-label="Skip intro">
        Skip
      </button>

    </div>
  )
}