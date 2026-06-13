'use client'

import { useEffect, useState } from 'react'
import styles from './IntroScreen.module.css'

interface IntroScreenProps {
  onComplete: () => void
}

type Phase = 'black' | 'glow' | 'feet' | 'merge' | 'orbit' | 'title' | 'tagline' | 'hold' | 'fade'

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<Phase>('black')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (skipped) return
    const timings: [Phase, number][] = [
      ['glow',    300],
      ['feet',    700],
      ['merge',   1600],
      ['orbit',   2400],
      ['title',   3200],
      ['tagline', 4000],
      ['hold',    4800],
      ['fade',    6000],
    ]
    const timers = timings.map(([p, d]) => setTimeout(() => setPhase(p), d))
    const done = setTimeout(() => onComplete(), 6800)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [skipped, onComplete])

  const handleSkip = () => { setSkipped(true); onComplete() }
  const is = (...phases: Phase[]) => phases.includes(phase)

  return (
    <div className={`${styles.intro} ${phase === 'fade' ? styles.fadeOut : ''}`}>

      <div className={`${styles.glow} ${is('glow','feet','merge','orbit','title','tagline','hold') ? styles.glowVisible : ''}`} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <div className={styles.center}>

        {/* Footprint + orbit animation stage */}
        <div className={styles.stage}>

          {/* Orbit ring — appears after merge */}
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

          {/* Left foot — slides in from left */}
          <svg
            className={`${styles.footSvg} ${styles.footLeft}
              ${is('feet','merge','orbit','title','tagline','hold','fade') ? styles.footVisible : ''}
              ${is('merge','orbit','title','tagline','hold','fade') ? styles.footMergeLeft : ''}`}
            viewBox="0 0 230 230" fill="none"
            aria-hidden="true"
          >
            <g transform="translate(115,115) scale(0.38)">
              {/* Left footprint body */}
              <path
                d="M0 0 C0 0.33 0 0.66 0 1 C-1.09 1.01 -2.2 1.03 -12.25 1.25 C-23.98 1.53 -33.59 2.13 -40.1 7.84 C-44.12 12.36 -45.47 15.77 -45.41 21.82 C-44.09 32.05 -39.22 41.9 -33 50 C-26.42 59.02 -21.58 64.98 -16.45 70.81 C-13 74.79 -13 74.79 -13 77 C-7.21 78.63 -4.77 82 -2.19 85.38 C3.03 90.71 8.8 95.69 14 101 C18.99 104.35 23 109 28.33 113.99 C34.07 118.35 39.95 122.69 42.78 124.83 C54.79 134.86 62.02 139.35 69.27 143.91 C79.28 150.07 84 153 84 155 C90.4 157.15 93.76 159.17 97.41 161.41 C104.69 165.69 109.13 168.06 114.13 170.18 C121.49 173.8 133.75 180.15 159.5 188.31 C175.45 192.6 193.59 195.5 206.22 189.13 C210.95 186.12 213.73 182.5 215 177 C216.27 165.21 213.79 156.1 208.27 145.75 C212.1 146.78 215.33 152.45 218 159 C222.25 169.51 222.61 179.03 219.83 185.89 C217.2 189.97 214.11 193.37 210 196 C190.86 204.76 171.6 203.32 154 199 C134.56 194.16 117.49 186.19 97.41 161.41 C80 140 74 149 71 165 C71 164.34 67.9 162.82 57.63 158.31 C51 154 44.08 149.38 34 143 C20 132 17 126 13.31 125.38 C8.5 124.21 4 118 4 118 C8.4 125.32 11 126 14 128 C14 134 17 139 16 143 C17.33 144.5 19 146 21.14 150.19 C21.25 158.81 20.33 170.34 17 175 C10.96 179.69 4.81 181.06 -1 183 C-6 183 -7 187 -10 188 C-6 189 -4.75 191.69 -4 201 C-8 203 -8.69 205.19 -17.19 213.81 C-26.9 214.48 -29.2 214.59 -32.94 211.81 C-38.43 203.01 -39.15 199.87 -38 196 C-34.27 191.29 -24 187 -18 185 C-19.5 183.75 -21 182 -21 178 C-24 178 -24 175 -25.94 174.63 C-28 174 -29 172 -35 171 C-36 167 -38.69 166.88 -46.05 161.87 C-47.48 159.06 -47.46 156.37 -47.63 153.27 C-50.5 147.38 -53.56 137.42 -53.76 131.64 C-55.25 123.23 -57 119 -58 116 C-55.19 104.69 -55.19 104.69 -52 101 C-50 101 -49.75 98.31 -50 95 C-45.96 89.96 -41 88 -39 91 C-39.33 89.35 -40 86 -37 86 C-32.69 84.93 -29 86 -29 86 C-32 81.63 -35 77 -35 75 C-38.06 72.69 -41.5 66.72 -43.44 63.81 C-49.08 53.08 -55.33 30.32 -55.31 25.94 C-55.37 18.79 -52 12 -51.19 9.5 C-48.86 4.6 -43.79 1.34 -39 -1 C-26.61 -4.99 -12.23 -4.03 0 0 Z"
                fill="#F5F5F0"
                opacity="0.92"
              />
            </g>
          </svg>

          {/* Right foot — slides in from right */}
          <svg
            className={`${styles.footSvg} ${styles.footRight}
              ${is('feet','merge','orbit','title','tagline','hold','fade') ? styles.footVisible : ''}
              ${is('merge','orbit','title','tagline','hold','fade') ? styles.footMergeRight : ''}`}
            viewBox="0 0 230 230" fill="none"
            aria-hidden="true"
          >
            <g transform="translate(115,115) scale(0.38)">
              {/* Right footprint body */}
              <path
                d="M0 0 C1.04 -0.03 2.1 -0.06 3.49 -0.11 C7.3 0.39 8.25 1.45 10.69 4.31 C12.83 5.1 14.69 5.31 14.69 2.31 C21.31 3.06 24.69 5.31 24.69 8.31 C26.01 8.97 27.33 9.63 28.69 10.31 C27.46 14.62 28.69 18.31 31.33 17.65 C36.69 16.31 41.69 20.31 41.69 20.31 C41.12 23.58 40.19 25.14 37.69 27.31 C36.19 29.31 35.69 29.31 33.69 29.31 C33.69 32.61 28.94 35.44 26.69 34.31 C26.69 36.31 24.69 36.31 22.69 42.31 C20.69 45.31 15.69 47.31 14.69 50.31 C12.42 51.19 10.76 52.94 6.69 57.31 C4.93 58.41 3.12 59.35 1.28 60.31 C-1.31 63.31 -5.88 63.94 -10.31 64.31 C-12.54 66.39 -14.77 66.45 -20.76 66.61 C-24.53 66.29 -26.41 65.7 -29.31 63.31 C-33.31 63.31 -36.31 60.31 -40.31 52.31 C-42.68 45.2 -42.18 37.36 -39.25 30.5 C-35.2 22.67 -29.75 16.98 -22.31 12.31 C-17.31 6.31 -15.31 4.31 -0 0 Z"
                fill="#F5F5F0"
                opacity="0.92"
                transform="translate(-14, -34) scale(1.5)"
              />
              {/* Toes */}
              <circle cx="-8" cy="-52" r="9" fill="#F5F5F0" opacity="0.85"/>
              <circle cx="14" cy="-58" r="8" fill="#F5F5F0" opacity="0.85"/>
              <circle cx="34" cy="-56" r="7" fill="#F5F5F0" opacity="0.85"/>
              <circle cx="51" cy="-46" r="6" fill="#F5F5F0" opacity="0.80"/>
              <circle cx="60" cy="-30" r="5.5" fill="#F5F5F0" opacity="0.80"/>
            </g>
          </svg>

          {/* Orange glow burst on merge */}
          <div className={`${styles.burst} ${is('merge','orbit','title','tagline','hold','fade') ? styles.burstActive : ''}`} aria-hidden="true" />

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