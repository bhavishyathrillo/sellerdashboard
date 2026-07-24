import React, { useEffect, useRef } from 'react';
import { UserSession } from '@/lib/session';
export interface RoadmapData {
  seller_email: string; seller_name: string; l2_name: string; l1_name: string
  region: string; status: string; duration_in_org: string
  date_of_joining: string; last_hike_month: string; next_hike_month: string
  current_eligible_hike_percent: number
  last_3_months_arps: number; last_6_months_arps: number; last_12_months_arps: number
}

export interface Props { session: UserSession; viewMode?: 'my' | 'team' }

function fmt(n: number) { if (!n && n !== 0) return '—'; if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`; return `₹${n.toFixed(0)}` }


export function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function StarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="0.5" style={{display:'inline',verticalAlign:'middle'}}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function SparkleIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="0.3">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle'}}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}>
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'5px'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

export function Particles() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {[...Array(12)].map((_,i)=>(
        <div key={i} style={{position:'absolute',top:'110%',left:`${Math.random()*100}%`,opacity:0.1,animation:`rise ${6+Math.random()*8}s linear infinite`,animationDelay:`${Math.random()*8}s`}}>
          <SparkleIcon size={6+Math.random()*8} />
        </div>
      ))}
      <style>{`@keyframes rise{0%{transform:translateY(0)rotate(0);opacity:0}10%{opacity:0.6}90%{opacity:0.3}100%{transform:translateY(-110vh)rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

function ARPSChart({ roadmap }: { roadmap: any }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)

  useEffect(() => {
    if (!roadmap) return
    import('chart.js/auto').then(mod => {
      const Chart = mod.default || mod
      if (chartRef.current) {
        if (chartInstance.current) chartInstance.current.destroy()
        const ctx = chartRef.current.getContext('2d')
        if (!ctx) return
        const values = [roadmap.last_3_months_arps||0, roadmap.last_6_months_arps||0, roadmap.last_12_months_arps||0]
        const maxVal = Math.max(...values, 1)
        
        const g3 = ctx.createLinearGradient(0,0,0,200)
        g3.addColorStop(0,'rgba(244,99,30,0.85)'); g3.addColorStop(1,'rgba(244,99,30,0.3)')
        const g6 = ctx.createLinearGradient(0,0,0,200)
        g6.addColorStop(0,'rgba(201,168,76,0.85)'); g6.addColorStop(1,'rgba(201,168,76,0.3)')
        const g12 = ctx.createLinearGradient(0,0,0,200)
        g12.addColorStop(0,'rgba(34,197,94,0.85)'); g12.addColorStop(1,'rgba(34,197,94,0.3)')

        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['3 Months', '6 Months', '12 Months'],
            datasets: [{
              data: values,
              backgroundColor: [g3,g6,g12],
              borderColor: ['#F4631E','#C9A84C','#22C55E'],
              borderWidth: 1.5,
              borderRadius: 8,
              borderSkipped: false,
              barPercentage: 0.45,
              categoryPercentage: 0.55,
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1a1a1a', borderColor: '#333', borderWidth: 1,
                titleColor: '#F0EDE8', bodyColor: '#F0EDE8', padding: 12,
                cornerRadius: 8,
                callbacks: { label: (ctx:any) => `  ARPS: ${fmt(ctx.raw)}  ` }
              }
            },
            scales: {
              x: { ticks: { color:'#8A8278',font:{size:10,weight:600},padding:10 }, grid:{display:false}, border:{display:false} },
              y: { ticks: { color:'#8A8278',font:{size:9},callback:(v:any)=>fmt(v),padding:8 }, grid:{color:'rgba(255,255,255,0.03)'}, border:{display:false}, beginAtZero:true, max:maxVal*1.3 }
            },
            layout: { padding: { top: 10, bottom: 5 } }
          }
        })
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [roadmap])

  return <canvas ref={chartRef} style={{width:'100%',height:'100%'}}/>
}

function RoadmapCard({ roadmap, name, compact = false }: { roadmap: any; name: string; compact?: boolean }) {
  if (!roadmap) {
    return (
      <div style={{
        textAlign:'center',padding: compact ? '20px 12px' : '30px 16px',
        color:'#8A8278',fontSize:'0.8rem',
        background:'rgba(255,255,255,0.01)',borderRadius:'10px',
        border:'1px dashed rgba(255,255,255,0.05)'
      }}>
        No roadmap data available
      </div>
    )
  }
  const hikeVal = roadmap.current_eligible_hike_percent

  return (
    <div style={{padding: compact ? '8px 0' : '12px 0'}}>
      {/* Stats Row */}
      <div style={{
        display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',
        marginBottom: compact ? '8px' : '12px'
      }}>
        {[
          { icon: <CalendarIcon />, label: 'DOJ', value: roadmap.date_of_joining||'—' },
          { icon: <ClockIcon />, label: 'Duration', value: roadmap.duration_in_org||'—' },
          { icon: <TrendingUpIcon />, label: 'Last Hike', value: roadmap.last_hike_month||'—' },
          { icon: <TargetIcon />, label: 'Next Hike', value: roadmap.next_hike_month||'—' },
        ].map((item, i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.05)',
            borderRadius:'8px',padding: compact ? '4px 6px' : '8px 10px',textAlign:'center'
          }}>
            <div style={{fontSize:'0.6rem',color:'#8A8278',marginBottom:'3px',display:'flex',alignItems:'center',justifyContent:'center',gap:'3px'}}>
              {item.icon} {item.label}
            </div>
            <div style={{fontSize:'0.72rem',fontWeight:600,color:'#E0DCD5'}}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Hike Card */}
      <div style={{
        display:'flex',alignItems:'center',gap:'12px',
        background: hikeVal 
          ? 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.02))'
          : 'linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.005))',
        border: hikeVal ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius:'10px',padding: compact ? '8px 12px' : '12px 14px',marginBottom: compact ? '8px' : '14px'
      }}>
        <div style={{
          width:'40px',height:'40px',borderRadius:'50%',
          background: hikeVal ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
          display:'flex',alignItems:'center',justifyContent:'center',
          flexShrink:0
        }}>
          {hikeVal ? <StarIcon size={18} /> : <LockIcon />}
        </div>
        <div>
          <div style={{fontSize:'0.62rem',color:'#8A8278',textTransform:'uppercase',letterSpacing:'0.05em'}}>Eligible Hike</div>
          <div style={{fontSize:'1.2rem',fontWeight:700,color: hikeVal ? '#22C55E' : '#8A8278'}}>
            {hikeVal ? `${hikeVal}%` : 'Not Available'}
          </div>
          {hikeVal && <div style={{fontSize:'0.62rem',color:'#8A8278'}}>Based on ARPS performance</div>}
        </div>
      </div>

      {/* ARPS Chart */}
      <div style={{
        background:'rgba(255,255,255,0.015)',border:'1px solid rgba(255,255,255,0.05)',
        borderRadius:'12px',padding: compact ? '10px' : '14px'
      }}>
        <div style={{fontSize:'0.7rem',fontWeight:600,color:'#C9A84C',marginBottom: compact ? '4px' : '8px'}}>
          ARPS Performance
        </div>
        <div style={{height: compact ? '120px' : '180px'}}>
          <ARPSChart roadmap={roadmap} />
        </div>
      </div>
    </div>
  )
}
export { RoadmapCard, fmt };