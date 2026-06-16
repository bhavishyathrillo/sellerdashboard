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

function FloatingParticles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{position:'absolute',top:'110%',left:`${Math.random()*100}%`,color:'#C9A84C',fontSize:`${0.5+Math.random()*0.8}rem`,opacity:0.15+Math.random()*0.2,animation:`particleRise ${6+Math.random()*8}s linear infinite`,animationDelay:`${Math.random()*8}s`}}>
          {['✦','◈','◇','◆','○'][Math.floor(Math.random()*5)]}
        </div>
      ))}
      <style>{`@keyframes particleRise{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}90%{opacity:0.5}100%{transform:translateY(-110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

export default function RewardsPage({ session }: Props) {
  const [rewards, setRewards] = useState<any>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [selectedWheel, setSelectedWheel] = useState<'PREMIUM' | 'STANDARD'>('PREMIUM')
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

  function drawWheel(angle: number) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1; const size = 350
    if (canvas.width !== size * dpr) { canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; ctx.scale(dpr, dpr) }
    const type = selectedWheel; const prizes = type === 'PREMIUM' ? PREMIUM_PRIZES : STANDARD_PRIZES; const colors = type === 'PREMIUM' ? WC_PREM : WC_STD
    const cx = 175, cy = 175, r = 155; const arc = (2 * Math.PI) / prizes.length
    ctx.clearRect(0, 0, 350, 350)
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy+5, r+15, 0, 2*Math.PI); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill(); ctx.restore()
    const outerGlow = ctx.createRadialGradient(cx, cy, r-8, cx, cy, r+25); outerGlow.addColorStop(0, 'rgba(255,215,0,0.4)'); outerGlow.addColorStop(0.5, 'rgba(244,99,30,0.2)'); outerGlow.addColorStop(1, 'rgba(244,99,30,0)')
    ctx.beginPath(); ctx.arc(cx, cy, r+25, 0, 2*Math.PI); ctx.fillStyle = outerGlow; ctx.fill()
    ctx.beginPath(); ctx.arc(cx, cy, r+6, 0, 2*Math.PI); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 10; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, r+6, 0, 2*Math.PI); ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 5; ctx.stroke()
    for (let i = 0; i < 32; i++) { const ba = (i/32)*Math.PI*2; const bx = cx+Math.cos(ba)*(r+6); const by = cy+Math.sin(ba)*(r+6); const bulbGrad = ctx.createRadialGradient(bx,by,0,bx,by,5); bulbGrad.addColorStop(0,'#fff'); bulbGrad.addColorStop(0.5,i%2===0?'#FFD700':'#F4631E'); bulbGrad.addColorStop(1,'rgba(0,0,0,0)'); ctx.beginPath(); ctx.arc(bx,by,5,0,2*Math.PI); ctx.fillStyle = bulbGrad; ctx.fill() }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke()
    prizes.forEach((p, i) => { const s = i*arc-Math.PI/2+angle, e = s+arc; const mid = s+arc/2; const grad = ctx.createLinearGradient(cx+Math.cos(mid)*r,cy+Math.sin(mid)*r,cx+Math.cos(mid)*30,cy+Math.sin(mid)*30); grad.addColorStop(0,colors[i]); grad.addColorStop(0.6,colors[i]); grad.addColorStop(1,'rgba(0,0,0,0.4)'); ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,s,e); ctx.fillStyle = grad; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.stroke(); ctx.save(); ctx.translate(cx,cy); ctx.rotate(mid); ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.font = 'bold 10px "Segoe UI", sans-serif'; ctx.textAlign = 'right'; ctx.fillText(p,r-18,5); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Segoe UI", sans-serif'; ctx.textAlign = 'right'; ctx.fillText(p,r-17,4); ctx.restore() })
    const innerRing = ctx.createRadialGradient(cx,cy,20,cx,cy,35); innerRing.addColorStop(0,'rgba(0,0,0,0)'); innerRing.addColorStop(0.5,'rgba(0,0,0,0.08)'); innerRing.addColorStop(1,'rgba(0,0,0,0.25)')
    ctx.beginPath(); ctx.arc(cx,cy,35,0,2*Math.PI); ctx.fillStyle = innerRing; ctx.fill()
    const btnGrad = ctx.createRadialGradient(cx,cy,5,cx,cy,24); btnGrad.addColorStop(0,'#3a3a3a'); btnGrad.addColorStop(0.4,'#1a1a1a'); btnGrad.addColorStop(1,'#000')
    ctx.beginPath(); ctx.arc(cx,cy,24,0,2*Math.PI); ctx.fillStyle = btnGrad; ctx.fill(); ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,20,0,2*Math.PI); ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(255,215,0,0.5)'; ctx.shadowBlur = 8; ctx.fillText('SPIN',cx,cy+4); ctx.shadowBlur = 0
    ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx-15,cy-r-28); ctx.lineTo(cx+15,cy-r-28); ctx.closePath()
    const ptrGrad = ctx.createLinearGradient(cx,cy-r-28,cx,cy-r); ptrGrad.addColorStop(0,'#F4631E'); ptrGrad.addColorStop(1,'#FFD700')
    ctx.fillStyle = ptrGrad; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy-r-12,4,0,2*Math.PI); ctx.fillStyle = '#fff'; ctx.fill()
  }

  function drawLockedWheel() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const dpr = window.devicePixelRatio || 1; const size = 350
    if (canvas.width !== size * dpr) { canvas.width = size * dpr; canvas.height = size * dpr; canvas.style.width = size + 'px'; canvas.style.height = size + 'px'; ctx.scale(dpr, dpr) }
    const cx = 175, cy = 175, r = 155; ctx.clearRect(0, 0, 350, 350)
    const prizes = selectedWheel === 'PREMIUM' ? PREMIUM_PRIZES : STANDARD_PRIZES; const colors = selectedWheel === 'PREMIUM' ? WC_PREM : WC_STD; const arc = (2*Math.PI)/prizes.length
    ctx.beginPath(); ctx.arc(cx,cy,r+6,0,2*Math.PI); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 10; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,r+6,0,2*Math.PI); ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.stroke()
    prizes.forEach((p,i)=>{const s=i*arc-Math.PI/2,e=s+arc;const mid=s+arc/2;const grad=ctx.createLinearGradient(cx+Math.cos(mid)*r,cy+Math.sin(mid)*r,cx,cy);grad.addColorStop(0,colors[i]);grad.addColorStop(1,'rgba(0,0,0,0.3)');ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,s,e);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1.5;ctx.stroke();ctx.save();ctx.translate(cx,cy);ctx.rotate(mid);ctx.fillStyle='#fff';ctx.font='bold 10px "Segoe UI", sans-serif';ctx.textAlign='right';ctx.fillText(p,r-18,5);ctx.restore()})
    
    const glassGrad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r)
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.05)')
    glassGrad.addColorStop(0.5, 'rgba(0,0,0,0.55)')
    glassGrad.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.fillStyle = glassGrad; ctx.fill()
    ctx.beginPath(); ctx.arc(cx,cy,60,0,2*Math.PI); ctx.strokeStyle = 'rgba(255,68,68,0.4)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,58,0,2*Math.PI); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.stroke()
    const lockGlow = ctx.createRadialGradient(cx,cy,30,cx,cy,55); lockGlow.addColorStop(0,'rgba(30,30,30,0.98)'); lockGlow.addColorStop(1,'rgba(0,0,0,0.95)')
    ctx.beginPath(); ctx.arc(cx,cy,55,0,2*Math.PI); ctx.fillStyle = lockGlow; ctx.fill()
    ctx.beginPath(); ctx.arc(cx,cy,52,0,2*Math.PI); ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 3; ctx.stroke()
    ctx.beginPath(); ctx.arc(cx,cy,48,0,2*Math.PI); ctx.strokeStyle = 'rgba(255,68,68,0.3)'; ctx.lineWidth = 6; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(239,68,68,0.5)'; ctx.shadowBlur = 15
    ctx.fillText('🔒', cx, cy - 8); ctx.shadowBlur = 0
    ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px "Segoe UI", sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('GOAL NOT', cx, cy + 26)
    ctx.fillText('COMPLETED', cx, cy + 40)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '8px "Segoe UI", sans-serif'
    ctx.fillText('Unlock by hitting 100%', cx, cy + 52)
  }

  async function spin() {
    if (spinning) return
    if (!rewards?.goalDone) { setResult('🔒 Hit 100% goal to unlock spins!'); return }
    const canSpin = selectedWheel === 'PREMIUM' ? rewards?.premiumAvailable > 0 : rewards?.standardAvailable > 0
    if (!canSpin) { setResult(`No ${selectedWheel} spins left this month`); return }
    setSpinning(true); setResult('Spinning...')
    const targetAngle = wheelAngle + Math.random()*12+18; const duration=2500; const start=performance.now(); const startAngle=wheelAngle
    function animate(now:number){const elapsed=now-start;const progress=Math.min(elapsed/duration,1);const ease=1-Math.pow(1-progress,4);drawWheel(startAngle+targetAngle*ease);if(progress<1)requestAnimationFrame(animate);else{setWheelAngle((startAngle+targetAngle)%(2*Math.PI));finishSpin()}}
    requestAnimationFrame(animate)
  }

  async function finishSpin() {
    try {
      const res = await fetch('/api/seller/spin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:session.email,spinType:selectedWheel})})
      const data = await res.json()
      if(data.success){setResult(`🎉 You won: ${data.result}!`);setShowConfetti(true);setTimeout(()=>setShowConfetti(false),4000)}
      else setResult(`❌ ${data.message}`)
    } catch { setResult('❌ Spin failed') }
    setSpinning(false); loadRewards()
  }

  useEffect(()=>{const t=setTimeout(()=>{if(!rewards||!rewards.goalDone)drawLockedWheel();else drawWheel(0)},200)},[rewards,selectedWheel])

  if(loading)return<div className={styles.loadingWrap}><div className={styles.loadingSpinner}/><p>Loading...</p></div>
  const goalDone=rewards?.goalDone;const pct=rewards?.pct||0;const gapToGoal=Math.max(0,100-pct)

  return (
    <div className={styles.page}>
      <FloatingParticles/>
      {showConfetti&&<Confetti/>}
      <div className={styles.hero}><div className={styles.heroGlow}/><span className={styles.heroEmoji}>🏆</span><h1 className={styles.heroTitle}>Rewards Arena</h1><p className={styles.heroSub}>Hit your monthly goal to unlock exclusive spins & prizes</p><div className={styles.progressRing}><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"/><circle cx="60" cy="60" r="52" fill="none" stroke={goalDone?'#22C55E':'#F4631E'} strokeWidth="6" strokeDasharray={`${Math.min(pct,100)*3.27} 327`} strokeLinecap="round" transform="rotate(-90 60 60)"/></svg><div className={styles.progressCenter}><span className={styles.progressPct}>{pct.toFixed(1)}%</span><span className={styles.progressLabel}>of goal</span></div></div>{!goalDone&&<div className={styles.motivationBox}>🚀 Only <strong>{gapToGoal.toFixed(1)}%</strong> away!</div>}{goalDone&&<div className={styles.unlockedBox}>🎉 Wheel unlocked!</div>}</div>
      <div className={styles.prizeSection}><h3>{selectedWheel==='PREMIUM'?'👑 Premium Prizes':'⭐ Standard Prizes'}</h3><div className={styles.prizeGrid}>{(selectedWheel==='PREMIUM'?PREMIUM_PRIZES:STANDARD_PRIZES).map((p,i)=><div key={p} className={styles.prizeCard}><span className={styles.prizeDot} style={{background:(selectedWheel==='PREMIUM'?WC_PREM:WC_STD)[i]}}/>{p}</div>)}</div></div>
      <div className={styles.wheelSection}><div className={styles.wheelTabs}><button onClick={()=>setSelectedWheel('PREMIUM')} className={`${styles.wheelTab} ${selectedWheel==='PREMIUM'?styles.wheelTabActive:''}`}>👑 Premium ({rewards?.premiumAvailable||0})</button><button onClick={()=>setSelectedWheel('STANDARD')} className={`${styles.wheelTab} ${selectedWheel==='STANDARD'?styles.wheelTabActive:''}`}>⭐ Standard ({rewards?.standardAvailable||0})</button></div><div className={styles.wheelContainer}><canvas ref={canvasRef} width={350} height={350} className={styles.wheelCanvas}/></div><button onClick={spin} disabled={spinning||!goalDone} className={styles.spinButton}>{spinning?'🎰 Spinning...':goalDone?'🎰 SPIN NOW!':'🔒 Unlock by Hitting Goal'}</button>{result&&<div className={`${styles.resultBox} ${result.includes('won')?styles.resultWin:''}`}>{result}</div>}</div>
      <div className={styles.milestoneSection}><h3>🎯 Goal Timeline Rewards</h3><p className={styles.milestoneSub}>Earlier you hit 100%, bigger the reward!</p><div className={styles.milestoneGrid}>{rewards?.milestones?.map((m:any)=>{const achieved=rewards?.achieved?.by===m.by;const missed=rewards?.goalDone&&!achieved&&m.by<(rewards?.completionDay||32);return<div key={m.by} className={`${styles.milestoneCard} ${achieved?styles.milestoneUnlocked:missed?styles.milestoneMissed:''}`}><div className={styles.milestoneIcon}>{achieved?'✅':missed?'❌':'🔒'}</div><div className={styles.milestoneDay}>By {m.by}th</div><div className={styles.milestoneTitle}>{m.label}</div><div className={styles.milestoneReward}>{m.reward}</div>{achieved&&<div className={styles.milestoneRibbon}>UNLOCKED</div>}</div>})}</div></div>
      {rewards?.spinHistory?.length>0&&<div className={styles.historySection}><h3>📜 Your Spin History</h3><div className={styles.historyList}>{rewards.spinHistory.slice(0,8).map((s:any,i:number)=><div key={i} className={styles.historyItem}><span className={`${styles.historyType} ${s.spin_type==='PREMIUM'?styles.typePremium:styles.typeStandard}`}>{s.spin_type}</span><span className={styles.historyResult}>{s.result}</span><span className={styles.historyDate}>{s.date||''}</span></div>)}</div></div>}
    </div>
  )
}