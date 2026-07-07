'use client'

import { useEffect, useState, useRef } from 'react'
import styles from './PerformancePage.module.css'
import Loader from '@/components/ui/Loader'

function fmt(n: number) { if (!n && n !== 0) return '₹0'; if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`; return `₹${n.toFixed(0)}` }

function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(10)].map((_,i)=>(<div key={i} style={{position:'absolute',top:'110%',left:`${Math.random()*100}%`,color:'#C9A84C',fontSize:`${0.5+Math.random()*0.7}rem`,opacity:0.12,animation:`rise ${5+Math.random()*6}s linear infinite`,animationDelay:`${Math.random()*6}s`}}>{['✦','◈','◇','◆'][Math.floor(Math.random()*4)]}</div>))}
      <style>{`@keyframes rise{0%{transform:translateY(0)rotate(0);opacity:0}10%{opacity:0.5}90%{opacity:0.2}100%{transform:translateY(-110vh)rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

function PopupModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)'}}/>
      <div style={{position:'relative',width:'92vw',maxWidth:'900px',maxHeight:'88vh',background:'#0D0D0D',border:'1px solid #232323',borderRadius:'16px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #1A1A1A',background:'#111111',flexShrink:0}}>
          <h2 style={{fontSize:'0.95rem',fontWeight:700,color:'#F0EDE8'}}>{title}</h2>
          <button onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #333',background:'transparent',color:'#8A8278',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'20px'}}>{children}</div>
      </div>
    </div>
  )
}

function SellerStats({ data }: { data: any }) {
  const pct = data.pct || 0
  const goal = data.goal || 0
  const achieved = data.achieved || 0
  const shb = data.shb || 0
  const required = data.required_daily || 0
  const shbDiff = achieved - shb
  const aboveShb = shbDiff >= 0
  const weeks = [1,2,3,4].map(w => ({ week: w, goal: data[`week_${w}_goal`] || 0, achieved: data[`week_${w}_achieved`] || 0 }))

  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)

  useEffect(() => {
    import('chart.js/auto').then(mod => {
      const Chart = mod.default || mod
      if (chartRef.current) {
        if (chartInstance.current) chartInstance.current.destroy()
        const ctx = chartRef.current.getContext('2d')
        if (!ctx) return
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: weeks.map(w => `Week ${w.week}`),
            datasets: [
              { label: 'SHB', data: weeks.map(w => 0), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.35, pointRadius: 4 },
              { label: 'Achieved', data: weeks.map(w => w.achieved), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: false, tension: 0.35, pointRadius: 4 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { ticks: { color: '#8A8278', font: { size: 9 }, callback: (v: any) => fmt(v) }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true }
            }
          }
        })
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [data])

  return (
    <div>
      <div className={styles.stats} style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className={styles.stat}><span>Goal</span><strong>{fmt(goal)}</strong></div>
        <div className={styles.stat}><span>Achieved</span><strong style={{color:aboveShb?'#22C55E':'#EF4444'}}>{fmt(achieved)}</strong></div>
        <div className={styles.stat}><span>Required</span><strong>{fmt(required)}</strong></div>
        <div className={styles.stat}><span>SHB</span><strong>{fmt(shb)}</strong></div>
      </div>
      <div className={styles.pctSection}>
        <div className={styles.pctBar}><div className={styles.pctFill} style={{width:`${Math.min(pct,100)}%`}}/></div>
        <p className={styles.pctText}>{pct.toFixed(1)}% of goal</p>
      </div>
      <div style={{height:'180px',marginTop:'12px'}}><canvas ref={chartRef} style={{width:'100%',height:'100%'}}/></div>
      {weeks.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginTop:'10px'}}>
          {weeks.map(w => {
            const wpct = w.goal > 0 ? (w.achieved / w.goal) * 100 : 0
            return (
              <div key={w.week} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{fontSize:'0.65rem',fontWeight:600}}>W{w.week}</div>
                <div style={{fontSize:'0.6rem',color:'#8A8278'}}>{fmt(w.achieved)} / {fmt(w.goal)}</div>
                <div style={{fontSize:'0.65rem',fontWeight:700,color:'#C9A84C'}}>{wpct.toFixed(0)}%</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminPerformancePage() {
  const [l1Data, setL1Data] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [selectedSeller, setSelectedSeller] = useState<any>(null)

  useEffect(() => { 
    fetch('/api/admin/performance')
      .then(r => r.json())
      .then(d => { setL1Data(d.l1_data || []); setLoading(false) }) 
  }, [])

  if (loading) return <Loader text="Loading..." />

  const totalGoal = l1Data.reduce((s: number, l: any) => s + l.goal, 0)
  const totalAch = l1Data.reduce((s: number, l: any) => s + l.achieved, 0)
  const totalShb = l1Data.reduce((s: number, l: any) => s + l.shb, 0)
  const totalPct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0
  const totalSellers = l1Data.reduce((s: number, l: any) => s + l.seller_count, 0)

  return (
    <div className={styles.page}>
      <Particles />
      <div className={styles.header}>
        <h1 className={styles.title}>Performance</h1>
        <span style={{fontSize:'0.72rem',color:'#C9A84C',fontWeight:600}}>All Teams</span>
      </div>

      {/* Top KPI Cards — Same style as normal Performance */}
      <div className={styles.teamKpiWrap}>
        <div className={styles.teamKpiHeader}>
          <h3 className={styles.groupTitle}>COMPANY TOTALS</h3>
          <span className={styles.teamCount}>{l1Data.length} Category Managers · {totalSellers} sellers</span>
        </div>
        <div className={styles.stats}>
          <div className={`${styles.stat} ${styles.statPct}`}><span>Total %</span><strong style={{color:'#C9A84C'}}>{totalPct.toFixed(1)}%</strong></div>
          <div className={styles.stat}><span>Goal</span><strong>{fmt(totalGoal)}</strong></div>
          <div className={styles.stat}><span>Achieved</span><strong style={{color: (totalAch - totalShb) >= 0 ? '#22C55E' : '#EF4444'}}>{fmt(totalAch)}</strong></div>
          <div className={styles.stat}><span>SHB</span><strong>{fmt(totalShb)}</strong></div>
        </div>
        <div className={styles.pctSection}>
          <div className={styles.pctBar}><div className={styles.pctFill} style={{width:`${Math.min(totalPct,100)}%`}}/></div>
          <p className={styles.pctText}>{totalPct.toFixed(1)}% of total goal</p>
        </div>
      </div>

      {/* L1 Cards Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'12px',marginTop:'16px'}}>
        {l1Data.map((l1: any) => (
          <div key={l1.l1_email} onClick={() => setSelectedL1(l1)} style={{
            background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',
            cursor:'pointer',transition:'all 0.3s'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div>
                <div style={{fontWeight:700,fontSize:'0.9rem'}}>{l1.l1_name}</div>
                <div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1.seller_count} sellers · {l1.l2_count} L1 Managers</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontWeight:700,fontSize:'0.9rem',color:l1.pct>=100?'#22C55E':'#F4631E'}}>{l1.pct.toFixed(1)}%</div>
                <div style={{fontSize:'0.6rem',color:'#8A8278'}}>{fmt(l1.achieved)} / {fmt(l1.goal)}</div>
              </div>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginBottom:'8px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#F4631E,#C9A84C)',borderRadius:'2px',width:`${Math.min(l1.pct,100)}%`,transition:'width 0.5s'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px',fontSize:'0.62rem',color:'#8A8278'}}>
              <div style={{textAlign:'center'}}><div>W1</div><div style={{color:'#F4631E'}}>{fmt(l1.week_1_achieved)}</div></div>
              <div style={{textAlign:'center'}}><div>W2</div><div style={{color:'#F4631E'}}>{fmt(l1.week_2_achieved)}</div></div>
              <div style={{textAlign:'center'}}><div>W3</div><div style={{color:'#F4631E'}}>{fmt(l1.week_3_achieved)}</div></div>
              <div style={{textAlign:'center'}}><div>W4</div><div style={{color:'#F4631E'}}>{fmt(l1.week_4_achieved)}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* L1 Popup → Full KPI + L2 Cards */}
      {selectedL1 && (
        <PopupModal title={`${selectedL1.l1_name} — Category Manager`} onClose={() => setSelectedL1(null)}>
          <SellerStats data={selectedL1} />
          <h3 style={{fontSize:'0.8rem',fontWeight:700,color:'#C9A84C',marginTop:'16px',marginBottom:'10px'}}>
            L1 Managers ({selectedL1.l2_groups.length})
          </h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => (
              <div key={l2.l2_email} onClick={(e) => { e.stopPropagation(); setSelectedL2(l2) }} style={{
                background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',
                cursor:'pointer',transition:'all 0.3s'
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'0.82rem'}}>{l2.l2_name}</div>
                    <div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2.seller_count} sellers</div>
                  </div>
                  <div style={{fontWeight:700,fontSize:'0.85rem',color:l2.pct>=100?'#22C55E':'#F4631E'}}>{l2.pct.toFixed(1)}%</div>
                </div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}>
                  <div style={{height:'100%',background:l2.pct>=100?'#22C55E':'#F4631E',borderRadius:'2px',width:`${Math.min(l2.pct,100)}%`}}/>
                </div>
                <div style={{fontSize:'0.65rem',color:'#8A8278',marginTop:'6px'}}>{fmt(l2.achieved)} / {fmt(l2.goal)}</div>
              </div>
            ))}
          </div>
        </PopupModal>
      )}

      {/* L2 Popup → Full KPI + Sellers */}
      {selectedL2 && (
        <PopupModal title={`${selectedL2.l2_name} — L1 Manager`} onClose={() => setSelectedL2(null)}>
          <SellerStats data={selectedL2} />
          <h3 style={{fontSize:'0.8rem',fontWeight:700,color:'#C9A84C',marginTop:'16px',marginBottom:'10px'}}>
            Sellers ({selectedL2.sellers.length})
          </h3>
          {selectedL2.sellers.map((s: any) => (
            <div key={s.seller_email} onClick={() => setSelectedSeller(s)} style={{
              background:'#141414',border:'1px solid #232323',borderRadius:'10px',padding:'12px',
              marginBottom:'6px',cursor:'pointer',transition:'all 0.3s'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <span style={{fontWeight:600,fontSize:'0.8rem',display:'block'}}>{s.seller_name}</span>
                  <span style={{fontSize:'0.6rem',color:'#8A8278'}}>{s.region} · {s.haul} · {s.flag}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{fontWeight:700,fontSize:'0.85rem',color:s.pct>=100?'#22C55E':'#F4631E'}}>{s.pct.toFixed(1)}%</span>
                  <div style={{fontSize:'0.65rem',color:'#8A8278'}}>{fmt(s.achieved)} / {fmt(s.goal)}</div>
                </div>
              </div>
              <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}>
                <div style={{height:'100%',background:s.pct>=100?'#22C55E':'#F4631E',borderRadius:'2px',width:`${Math.min(s.pct,100)}%`}}/>
              </div>
            </div>
          ))}
        </PopupModal>
      )}

      {/* Seller Popup → Full KPI detail */}
      {selectedSeller && (
        <PopupModal title={`${selectedSeller.seller_name} — Seller`} onClose={() => setSelectedSeller(null)}>
          <SellerStats data={selectedSeller} />
        </PopupModal>
      )}
    </div>
  )
}