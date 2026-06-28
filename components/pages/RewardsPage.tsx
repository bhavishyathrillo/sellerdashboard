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

  // ========== L1 MANAGER ==========
  if (session.role === 'L1') {
    const [l1Rewards, setL1Rewards] = useState<any>(null)
    const [l1Loading, setL1Loading] = useState(true)
    const [showPremium, setShowPremium] = useState(true)
    const [showStandard, setShowStandard] = useState(true)

    useEffect(() => {
      fetch(`/api/seller/l1-rewards?email=${encodeURIComponent(session.email)}`)
        .then(r => r.json()).then(d => { setL1Rewards(d); setL1Loading(false) }).catch(() => setL1Loading(false))
    }, [session.email])

    if (l1Loading) return (<div className={styles.loadingWrap}><div className={styles.loadingSpinner}/><p>Loading team rewards...</p></div>)
    if (!l1Rewards) return (<div className={styles.page}><FloatingParticles /><div style={{textAlign:'center',padding:'80px',color:'#8A8278'}}>No rewards data found</div></div>)

    const bothSelected = showPremium && showStandard
    let eligible: any[] = [], notEligible: any[] = [], sectionTitle = '', sectionColor = ''

    if (bothSelected) { eligible = l1Rewards.both?.eligible || []; notEligible = l1Rewards.both?.notEligible || []; sectionTitle = 'Premium + Standard'; sectionColor = '#22C55E' }
    else if (showPremium) { eligible = l1Rewards.premium?.eligible || []; notEligible = l1Rewards.premium?.notEligible || []; sectionTitle = 'Premium'; sectionColor = '#C9A84C' }
    else if (showStandard) { eligible = l1Rewards.standard?.eligible || []; notEligible = l1Rewards.standard?.notEligible || []; sectionTitle = 'Standard'; sectionColor = '#7DA4D4' }

    return (
      <div className={styles.page}>
        <FloatingParticles />
        <div className={styles.hero}><div className={styles.heroGlow}/><span className={styles.heroEmoji}>🏆</span><h1 className={styles.heroTitle}>Team Rewards</h1><p className={styles.heroSub}>Track spin eligibility across your team</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'14px'}}>
          <div style={{background:'#141414',border:'1px solid rgba(201,168,76,0.3)',borderRadius:'12px',padding:'12px',textAlign:'center'}}><div style={{fontSize:'1.4rem',fontWeight:700,color:'#C9A84C'}}>{l1Rewards.summary.premiumEligible}</div><div style={{fontSize:'0.58rem',color:'#8A8278',textTransform:'uppercase'}}>Premium Eligible</div></div>
          <div style={{background:'#141414',border:'1px solid rgba(125,164,212,0.3)',borderRadius:'12px',padding:'12px',textAlign:'center'}}><div style={{fontSize:'1.4rem',fontWeight:700,color:'#7DA4D4'}}>{l1Rewards.summary.standardEligible}</div><div style={{fontSize:'0.58rem',color:'#8A8278',textTransform:'uppercase'}}>Standard Eligible</div></div>
          <div style={{background:'#141414',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'12px',padding:'12px',textAlign:'center'}}><div style={{fontSize:'1.4rem',fontWeight:700,color:'#22C55E'}}>{l1Rewards.summary.bothEligible}</div><div style={{fontSize:'0.58rem',color:'#8A8278',textTransform:'uppercase'}}>Both</div></div>
        </div>
        <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
          <button onClick={() => setShowPremium(!showPremium)} style={{padding:'8px 20px',borderRadius:'8px',border:`1px solid ${showPremium ? '#C9A84C' : '#2A2A2A'}`,background: showPremium ? 'rgba(201,168,76,0.12)' : 'transparent',color: showPremium ? '#C9A84C' : '#8A8278',cursor:'pointer',fontSize:'0.72rem',fontWeight:600}}>👑 Premium ({l1Rewards.summary.premiumEligible})</button>
          <button onClick={() => setShowStandard(!showStandard)} style={{padding:'8px 20px',borderRadius:'8px',border:`1px solid ${showStandard ? '#7DA4D4' : '#2A2A2A'}`,background: showStandard ? 'rgba(125,164,212,0.12)' : 'transparent',color: showStandard ? '#7DA4D4' : '#8A8278',cursor:'pointer',fontSize:'0.72rem',fontWeight:600}}>⭐ Standard ({l1Rewards.summary.standardEligible})</button>
        </div>
        <div style={{marginBottom:'16px'}}>
          <h3 style={{fontSize:'0.8rem',fontWeight:700,color:sectionColor,marginBottom:'8px'}}>Eligible for {sectionTitle} Spin ({eligible.length})</h3>
          {eligible.length === 0 ? <div style={{textAlign:'center',padding:'30px',color:'#8A8278',fontSize:'0.8rem'}}>No sellers eligible</div> : eligible.map((s: any) => (
            <div key={s.seller_email} style={{background:'#141414',border:`1px solid ${sectionColor}22`,borderRadius:'10px',padding:'12px',marginBottom:'6px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:s.spins?.length > 0 ? '8px' : '0'}}>
                <div><span style={{fontWeight:600,fontSize:'0.82rem',display:'block'}}>{s.seller_name}</span><span style={{fontSize:'0.62rem',color:sectionColor}}>100% · {s.milestone || 'Goal Done'}</span></div>
                <div style={{display:'flex',gap:'8px'}}>
                  {s.max_premium > 0 && <span style={{fontSize:'0.62rem',background:'rgba(201,168,76,0.15)',color:'#C9A84C',padding:'3px 8px',borderRadius:'6px',fontWeight:600}}>👑 {s.premium_available}/{s.max_premium}</span>}
                  {s.max_standard > 0 && <span style={{fontSize:'0.62rem',background:'rgba(125,164,212,0.15)',color:'#7DA4D4',padding:'3px 8px',borderRadius:'6px',fontWeight:600}}>⭐ {s.standard_available}/{s.max_standard}</span>}
                </div>
              </div>
              {s.spins?.length > 0 && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:'8px',display:'flex',flexDirection:'column',gap:'4px'}}>
                  {s.spins.map((spin: any, i: number) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'0.7rem',color:'#8A8278'}}>
                      <span style={{background:spin.type==='PREMIUM'?'rgba(201,168,76,0.15)':'rgba(125,164,212,0.15)',color:spin.type==='PREMIUM'?'#C9A84C':'#7DA4D4',padding:'2px 8px',borderRadius:'4px',fontSize:'0.6rem',fontWeight:600}}>{spin.type}</span>
                      <span style={{flex:1}}>{spin.result}</span>
                      <span style={{fontSize:'0.6rem',opacity:0.5}}>{spin.date ? new Date(spin.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div>
          <h3 style={{fontSize:'0.8rem',fontWeight:700,color:'#EF4444',marginBottom:'8px'}}>Not Eligible for {sectionTitle} Spin ({notEligible.length})</h3>
          {notEligible.length === 0 ? <div style={{textAlign:'center',padding:'30px',color:'#8A8278',fontSize:'0.8rem'}}>All sellers are eligible!</div> : notEligible.map((s: any) => (
            <div key={s.seller_email} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#141414',border:'1px solid rgba(239,68,68,0.1)',borderRadius:'8px',padding:'10px 14px',marginBottom:'4px'}}>
              <div>
                <span style={{fontWeight:500,fontSize:'0.78rem',display:'block'}}>{s.seller_name}</span>
                <span style={{fontSize:'0.62rem',color:'#8A8278'}}>{s.pct.toFixed(1)}% achieved</span>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:'0.72rem',color:'#F4631E',fontWeight:600}}>{s.gap_to_goal.toFixed(1)}% left</span>
                <div style={{height:'4px',width:'80px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'4px',overflow:'hidden'}}>
                  <div style={{height:'100%',background:'#F4631E',borderRadius:'2px',width:`${Math.min(s.pct,100)}%`}}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ========== NON-L1 ==========
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
    const glassGrad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r); glassGrad.addColorStop(0, 'rgba(255,255,255,0.05)'); glassGrad.addColorStop(0.5, 'rgba(0,0,0,0.55)'); glassGrad.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.fillStyle = glassGrad; ctx.fill()
    ctx.beginPath(); ctx.arc(cx,cy,60,0,2*Math.PI); ctx.strokeStyle = 'rgba(255,68,68,0.4)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#fff'; ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(239,68,68,0.5)'; ctx.shadowBlur = 15; ctx.fillText('🔒', cx, cy - 8); ctx.shadowBlur = 0
    ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GOAL NOT', cx, cy + 26); ctx.fillText('COMPLETED', cx, cy + 40)
  }

  async function spin() {
    if (spinning) return
    if (!rewards?.goalDone) { setResult('🔒 Hit 100% goal to unlock spins!'); return }
    const canSpin = selectedWheel === 'PREMIUM' ? rewards?.premiumAvailable > 0 : rewards?.standardAvailable > 0
    if (!canSpin) { setResult(`No ${selectedWheel} spins left this month`); return }
    
    setSpinning(true); setResult('Spinning...')

    try {
      const res = await fetch('/api/seller/spin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: session.email, spinType: selectedWheel }) })
      const data = await res.json()
      if (!data.success) { setResult(`❌ ${data.message}`); setSpinning(false); return }

      const prizes = selectedWheel === 'PREMIUM' ? PREMIUM_PRIZES : STANDARD_PRIZES
      const prizeIndex = prizes.indexOf(data.result)
      const arcSize = (2 * Math.PI) / prizes.length
      const targetPrizeAngle = prizeIndex >= 0 ? prizeIndex * arcSize + arcSize / 2 : Math.random() * 2 * Math.PI
      const fullSpins = (Math.floor(Math.random() * 3) + 3) * 2 * Math.PI
      const targetAngle = wheelAngle + fullSpins + (2 * Math.PI - targetPrizeAngle + (wheelAngle % (2 * Math.PI)))
      
      const duration = 3000; const start = performance.now(); const startAngle = wheelAngle
      function animate(now: number) {
        const elapsed = now - start; const progress = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 4)
        drawWheel(startAngle + (targetAngle - startAngle) * ease)
        if (progress < 1) requestAnimationFrame(animate)
        else { setWheelAngle(targetAngle % (2 * Math.PI)); setResult(`🎉 You won: ${data.result}!`); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); setSpinning(false); loadRewards() }
      }
      requestAnimationFrame(animate)
    } catch { setResult('❌ Spin failed'); setSpinning(false) }
  }

  useEffect(()=>{const t=setTimeout(()=>{if(!rewards||!rewards.goalDone)drawLockedWheel();else drawWheel(0)},200)},[rewards,selectedWheel])

  if(loading)return<div className={styles.loadingWrap}><div className={styles.loadingSpinner}/><p>Loading...</p></div>
  const goalDone=rewards?.goalDone;const pct=rewards?.pct||0;const gapToGoal=Math.max(0,100-pct)

  return (
    <div className={styles.page}>
      <FloatingParticles/>
      {showConfetti&&<Confetti/>}
      <div className={styles.hero}><div className={styles.heroGlow}/><span className={styles.heroEmoji}>🏆</span><h1 className={styles.heroTitle}>Rewards Arena</h1><p className={styles.heroSub}>Hit your monthly goal to unlock exclusive spins and prizes</p><div className={styles.progressRing}><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"/><circle cx="60" cy="60" r="52" fill="none" stroke={goalDone?'#22C55E':'#F4631E'} strokeWidth="6" strokeDasharray={`${Math.min(pct,100)*3.27} 327`} strokeLinecap="round" transform="rotate(-90 60 60)"/></svg><div className={styles.progressCenter}><span className={styles.progressPct}>{pct.toFixed(1)}%</span><span className={styles.progressLabel}>of goal</span></div></div>{!goalDone&&<div className={styles.motivationBox}>🚀 Only <strong>{gapToGoal.toFixed(1)}%</strong> away!</div>}{goalDone&&<div className={styles.unlockedBox}>🎉 Wheel unlocked!</div>}</div>
      <div className={styles.prizeSection}><h3>{selectedWheel==='PREMIUM'?'👑 Premium Prizes':'⭐ Standard Prizes'}</h3><div className={styles.prizeGrid}>{(selectedWheel==='PREMIUM'?PREMIUM_PRIZES:STANDARD_PRIZES).map((p,i)=><div key={p} className={styles.prizeCard}><span className={styles.prizeDot} style={{background:(selectedWheel==='PREMIUM'?WC_PREM:WC_STD)[i]}}/>{p}</div>)}</div></div>
      <div className={styles.wheelSection}><div className={styles.wheelTabs}><button onClick={()=>setSelectedWheel('PREMIUM')} className={`${styles.wheelTab} ${selectedWheel==='PREMIUM'?styles.wheelTabActive:''}`}>👑 Premium ({rewards?.premiumAvailable||0})</button><button onClick={()=>setSelectedWheel('STANDARD')} className={`${styles.wheelTab} ${selectedWheel==='STANDARD'?styles.wheelTabActive:''}`}>⭐ Standard ({rewards?.standardAvailable||0})</button></div><div className={styles.wheelContainer}><canvas ref={canvasRef} width={350} height={350} className={styles.wheelCanvas}/></div><button onClick={spin} disabled={spinning||!goalDone} className={styles.spinButton}>{spinning?'🎰 Spinning...':goalDone?'🎰 SPIN NOW!':'🔒 Unlock by Hitting Goal'}</button>{result&&<div className={`${styles.resultBox} ${result.includes('won')?styles.resultWin:''}`}>{result}</div>}</div>
      <div className={styles.milestoneSection}><h3>🎯 Goal Timeline Rewards</h3><p className={styles.milestoneSub}>Earlier you hit 100%, bigger the reward!</p><div className={styles.milestoneGrid}>{(()=>{const completionDay=rewards?.completionDay||0;const goalDone=rewards?.goalDone;const sorted=[...(rewards?.milestones||[])].sort((a:any,b:any)=>a.by-b.by);const qualifiedBy=goalDone&&completionDay>0?sorted.find((m:any)=>completionDay<=m.by)?.by||0:0;return sorted.map((m:any)=>{const achieved=goalDone&&qualifiedBy===m.by;const missed=goalDone&&qualifiedBy!==m.by;return<div key={m.by} className={`${styles.milestoneCard} ${achieved?styles.milestoneUnlocked:missed?styles.milestoneMissed:''}`}><div className={styles.milestoneIcon}>{achieved?'✅':missed?'❌':'🔒'}</div><div className={styles.milestoneDay}>By {m.by}th</div><div className={styles.milestoneTitle}>{m.label}</div><div className={styles.milestoneReward}>{m.reward}</div>{achieved&&<div className={styles.milestoneRibbon}>UNLOCKED</div>}</div>})})()}</div></div>
      {rewards?.spinHistory?.length>0&&<div className={styles.historySection}><h3>📜 Your Spin History</h3><div className={styles.historyList}>{rewards.spinHistory.slice(0,8).map((s:any,i:number)=><div key={i} className={styles.historyItem}><span className={`${styles.historyType} ${s.spin_type==='PREMIUM'?styles.typePremium:styles.typeStandard}`}>{s.spin_type}</span><span className={styles.historyResult}>{s.result}</span><span className={styles.historyDate}>{s.date||''}</span></div>)}</div></div>}
    </div>
  )
}