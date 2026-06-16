'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './RewardsPage.module.css'
import Confetti from '@/components/ui/Confetti'

interface Props { session: UserSession }

const PREMIUM_PRIZES = ['WFH Tomorrow','₹1000 Voucher','1 Day Off','2 Regularisation','2 WFH','Movie Tickets','Spin Again','Lunch with Manager']
const STANDARD_PRIZES = ['WFH Tomorrow','₹500 Voucher','1 Day Off','1 Regularisation','Movie Tickets','₹1000 Voucher','Better Luck','Upgrade to Premium']
const WC_PREM = ['#6B1E3A','#8B2A4C','#A33A60','#7A2240','#C9A84C','#9E2B52','#5A1830','#B8860B']
const WC_STD  = ['#1a2a4a','#2a3d6b','#1e3560','#3a5490','#1a4a7a','#2d4875','#152238','#4a7a9a']

export default function RewardsPage({ session }: Props) {
  const [rewards, setRewards] = useState<any>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [wheelAngle, setWheelAngle] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { loadRewards() }, [])

  async function loadRewards() {
    try {
      const res = await fetch(`/api/seller/rewards?email=${encodeURIComponent(session.email)}`)
      const data = await res.json()
      if (res.ok) setRewards(data)
    } catch {}
    setLoading(false)
  }

  function drawWheel(type: string, angle: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const prizes = type === 'PREMIUM' ? PREMIUM_PRIZES : STANDARD_PRIZES
    const colors = type === 'PREMIUM' ? WC_PREM : WC_STD
    const cx = 150, cy = 150, r = 130
    const arc = (2 * Math.PI) / prizes.length

    ctx.clearRect(0, 0, 300, 300)
    prizes.forEach((p, i) => {
      const s = i * arc - Math.PI / 2 + angle, e = s + arc
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, s, e)
      ctx.fillStyle = colors[i]; ctx.fill()
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke()
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(s + arc / 2)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'right'
      ctx.fillText(p, r - 12, 4); ctx.restore()
    })
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI)
    ctx.fillStyle = '#0a0a0a'; ctx.fill()
    ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#C9A84C'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('SPIN', cx, cy + 4)
  }

  async function spin(type: string) {
    if (spinning) return
    const canSpin = type === 'PREMIUM' ? rewards?.premiumAvailable > 0 : rewards?.standardAvailable > 0
    if (!canSpin || !rewards?.goalDone) {
      setResult('🔒 Goal not completed yet!')
      return
    }
    
    setSpinning(true)
    setResult('')
    drawWheel(type, 0)

    const targetAngle = wheelAngle + Math.random() * 10 + 15
    const duration = 2000
    const start = performance.now()
    const startAngle = wheelAngle

    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 4)
      const angle = startAngle + targetAngle * ease
      drawWheel(type, angle)
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setWheelAngle(angle % (2 * Math.PI))
        finishSpin(type)
      }
    }
    requestAnimationFrame(animate)
  }

  async function finishSpin(type: string) {
    try {
      const res = await fetch('/api/seller/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, spinType: type })
      })
      const data = await res.json()
      if (data.success) {
        setResult(`🎉 ${data.result}!`)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      } else {
        setResult(`❌ ${data.message}`)
      }
    } catch {
      setResult('❌ Spin failed')
    }
    setSpinning(false)
    loadRewards()
  }

  useEffect(() => {
    if (rewards?.goalDone) drawWheel('PREMIUM', 0)
  }, [rewards])

  if (loading) return <div className={styles.loading}>Loading...</div>

  const goalDone = rewards?.goalDone
  const pct = rewards?.pct || 0

  return (
    <div className={styles.page}>
      {showConfetti && <Confetti />}
      <h1 className={styles.title}>🎰 Rewards</h1>

      <div className={styles.pctBadge} style={{background: goalDone ? 'rgba(34,160,107,0.15)' : 'rgba(239,68,68,0.1)', borderColor: goalDone ? 'rgba(34,160,107,0.3)' : 'rgba(239,68,68,0.25)', color: goalDone ? '#22C55E' : '#EF4444'}}>
        {pct.toFixed(1)}% of Goal {goalDone ? '✅ Unlocked' : '🔒 Locked'}
      </div>

      <div className={styles.wheelWrap}>
        <canvas ref={canvasRef} width={300} height={300} className={styles.wheel} />
        
        {/* LOCK OVERLAY - shows when goal NOT done */}
        {!goalDone && (
          <div className={styles.lockOverlay}>
            🔒 Complete 100% goal to unlock
          </div>
        )}
        
        <div className={styles.spinBtns}>
          <button 
            onClick={() => spin('PREMIUM')} 
            disabled={spinning || !goalDone || rewards?.premiumAvailable <= 0} 
            className={`${styles.spinBtn} ${!goalDone ? styles.spinBtnLocked : ''}`}
          >
            👑 Premium ({rewards?.premiumAvailable || 0})
          </button>
          <button 
            onClick={() => spin('STANDARD')} 
            disabled={spinning || !goalDone || rewards?.standardAvailable <= 0} 
            className={`${styles.spinBtn2} ${!goalDone ? styles.spinBtnLocked : ''}`}
          >
            ⭐ Standard ({rewards?.standardAvailable || 0})
          </button>
        </div>
        {result && <div className={styles.result}>{result}</div>}
      </div>

      <div className={styles.milestones}>
        <h2>Milestones</h2>
        {rewards?.milestones?.map((m: any) => (
          <div key={m.by} className={`${styles.milestone} ${rewards?.achieved?.by === m.by ? styles.unlocked : ''}`}>
            <span>{m.label}: {m.reward}</span>
            {rewards?.achieved?.by === m.by && <span className={styles.check}>✅</span>}
          </div>
        ))}
      </div>
    </div>
  )
}