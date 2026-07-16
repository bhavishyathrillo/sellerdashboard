'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './RoadmapPage.module.css'
import Loader from '@/components/ui/Loader'

interface RoadmapData {
  seller_email: string; seller_name: string; l2_name: string; l1_name: string
  region: string; status: string; duration_in_org: string
  date_of_joining: string; last_hike_month: string; next_hike_month: string
  current_eligible_hike_percent: number
  last_3_months_arps: number; last_6_months_arps: number; last_12_months_arps: number
}

interface Props { session: UserSession; viewMode?: 'my' | 'team' }

function fmt(n: number) { if (!n && n !== 0) return '—'; if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`; return `₹${n.toFixed(0)}` }


function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function ChevronRight() {
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

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'5px'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function Particles() {
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
        marginBottom:'12px'
      }}>
        {[
          { icon: <CalendarIcon />, label: 'DOJ', value: roadmap.date_of_joining||'—' },
          { icon: <ClockIcon />, label: 'Duration', value: roadmap.duration_in_org||'—' },
          { icon: <TrendingUpIcon />, label: 'Last Hike', value: roadmap.last_hike_month||'—' },
          { icon: <TargetIcon />, label: 'Next Hike', value: roadmap.next_hike_month||'—' },
        ].map((item, i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.05)',
            borderRadius:'8px',padding:'8px 10px',textAlign:'center'
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
        borderRadius:'10px',padding:'12px 14px',marginBottom:'14px'
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
        borderRadius:'12px',padding:'14px'
      }}>
        <div style={{fontSize:'0.7rem',fontWeight:600,color:'#C9A84C',marginBottom:'8px'}}>
          ARPS Performance
        </div>
        <div style={{height: compact ? '150px' : '180px'}}>
          <ARPSChart roadmap={roadmap} />
        </div>
      </div>
    </div>
  )
}

export default function RoadmapPage({ session, viewMode: externalViewMode }: Props) {
  const [data, setData] = useState<RoadmapData | null>(null)
  const [teamData, setTeamData] = useState<any>(null)
  const [l1Data, setL1Data] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [internalViewMode, setInternalViewMode] = useState<'my' | 'team'>('my')
  const [expandedL2, setExpandedL2] = useState<Record<string, boolean>>({})
  const [expandedSellers, setExpandedSellers] = useState<Record<string, boolean>>({})

  const viewMode = externalViewMode || internalViewMode

  const isL1 = session.role === 'L1'
  const isL2 = session.role === 'L2'

  useEffect(() => {
    async function load() {
      try {
        if (isL1) {
          const res = await fetch(`/api/seller/tl/roadmap?email=${encodeURIComponent(session.email)}`)
          if (res.ok) {
            const json = await res.json()
            setL1Data(json)
          }
        } else {
          const [myRes, teamRes] = await Promise.all([
            fetch(`/api/seller/seller/roadmap?email=${encodeURIComponent(session.email)}`),
            isL2 ? fetch(`/api/seller/team-performance?email=${encodeURIComponent(session.email)}&role=L2`) : null
          ])
          if (myRes.ok) {
            const myJson = await myRes.json()
            if (!myJson.error) setData(myJson)
          }
          if (teamRes && teamRes.ok) {
            const tJson = await teamRes.json()
            if (tJson?.team) {
              const emails = tJson.team.map((s:any) => s.seller_email)
              const rRes = await fetch('/api/seller/cm/roadmap', {
                method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({emails})
              })
              if (rRes.ok) {
                const rJson = await rRes.json()
                setTeamData({ sellers: tJson.team, roadmaps: rJson.roadmaps || [] })
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load roadmap:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session.email])

  const toggleL2 = (email: string) => setExpandedL2((p:any)=>({...p,[email]:!p[email]}))
  const toggleSeller = (email: string) => setExpandedSellers((p:any)=>({...p,[email]:!p[email]}))

  if (loading) return <Loader text="Loading..." />

  // ========== L1 VIEW ==========
  if (isL1) {
    return (
      <div style={{padding:'18px',maxWidth:'700px',margin:'0 auto',color:'#F0EDE8',position:'relative'}}>
        <Particles />
        
        {/* Hero */}
        <div style={{textAlign:'center',padding:'16px 0 20px'}}>
          <div style={{marginBottom:'8px'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
          </div>
          <h1 style={{fontSize:'1.5rem',fontWeight:800,background:'linear-gradient(135deg,#C9A84C,#F4631E)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'4px'}}>
            Team Roadmap
          </h1>
          <p style={{fontSize:'0.72rem',color:'#8A8278'}}>Career growth across your organization</p>
        </div>

        {!l1Data?.l2Groups?.length ? (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#8A8278'}}>No team data found</div>
        ) : (
          l1Data.l2Groups.map((group: any) => (
            <div key={group.l2_email} style={{
              background:'#141414',border:'1px solid #232323',borderRadius:'14px',
              padding:'16px',marginBottom:'12px',transition:'all 0.3s'
            }}>
              <div onClick={() => toggleL2(group.l2_email)} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                cursor:'pointer',userSelect:'none'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{color:'#8A8278',width:'20px',textAlign:'center'}}>
                    {expandedL2[group.l2_email] ? <ChevronDown /> : <ChevronRight />}
                  </span>
                  <div>
                    <div style={{fontWeight:700,fontSize:'0.9rem',display:'flex',alignItems:'center',gap:'6px'}}>
                      <UserIcon /> {group.l2_name}
                    </div>
                    <div style={{fontSize:'0.62rem',color:'#8A8278',marginTop:'2px'}}>
                      {group.sellers.length} seller{group.sellers.length !== 1 ? 's' : ''} under this manager
                    </div>
                  </div>
                </div>
              </div>

              {expandedL2[group.l2_email] && (
                <div style={{marginTop:'12px',marginLeft:'32px'}}>
                  <div style={{
                    fontSize:'0.68rem',fontWeight:600,color:'#C9A84C',
                    textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'
                  }}>
                    L2 Manager Roadmap
                  </div>
                  <RoadmapCard roadmap={group.l2_roadmap} name={group.l2_name} compact />

                  {group.sellers.length > 0 && (
                    <div style={{
                      fontSize:'0.68rem',fontWeight:600,color:'#C9A84C',
                      textTransform:'uppercase',letterSpacing:'0.06em',margin:'14px 0 8px'
                    }}>
                      Team Members
                    </div>
                  )}
                  {group.sellers.map((s: any) => (
                    <div key={s.seller_email} style={{
                      marginTop:'6px',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:'8px'
                    }}>
                      <div onClick={() => toggleSeller(s.seller_email)} style={{
                        display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',
                        padding:'6px 0'
                      }}>
                        <span style={{color:'#8A8278',fontSize:'0.7rem'}}>
                          {expandedSellers[s.seller_email] ? <ChevronDown /> : <ChevronRight />}
                        </span>
                        <span style={{fontWeight:500,fontSize:'0.8rem'}}>{s.seller_name}</span>
                      </div>
                      {expandedSellers[s.seller_email] && (
                        <div style={{marginTop:'4px'}}>
                          <RoadmapCard roadmap={s.roadmap} name={s.seller_name} compact />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  // ========== L2 VIEW ==========
  if (isL2) {
    const teamSellers = teamData?.sellers || []
    const teamRoadmaps = teamData?.roadmaps || []
    const getRoadmap = (email: string) => teamRoadmaps.find((r:any) => r.seller_email?.toLowerCase() === email.toLowerCase())

    return (
      <div style={{padding:'18px',maxWidth:'700px',margin:'0 auto',color:'#F0EDE8',position:'relative'}}>
        <Particles />

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'18px'}}>
          <h1 style={{fontSize:'1.3rem',fontWeight:700,color:'#C9A84C'}}>Roadmap</h1>
          {!externalViewMode && (
            <div style={{display:'flex',gap:'3px',background:'#141414',border:'1px solid #232323',borderRadius:'8px',padding:'3px'}}>
              <button onClick={() => setInternalViewMode('my')} style={{
                padding:'7px 16px',border:'none',borderRadius:'6px',
                background: viewMode==='my'?'rgba(244,99,30,0.15)':'transparent',
                color: viewMode==='my'?'#F4631E':'#8A8278',
                cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
              }}>My Roadmap</button>
              <button onClick={() => setInternalViewMode('team')} style={{
                padding:'7px 16px',border:'none',borderRadius:'6px',
                background: viewMode==='team'?'rgba(244,99,30,0.15)':'transparent',
                color: viewMode==='team'?'#F4631E':'#8A8278',
                cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
              }}>Team ({teamSellers.length})</button>
            </div>
          )}
        </div>

        {viewMode === 'my' && (
          data ? <RoadmapCard roadmap={data} name={data.seller_name} /> :
          <div style={{textAlign:'center',padding:'60px',color:'#8A8278'}}>No roadmap data found</div>
        )}

        {viewMode === 'team' && (
          teamSellers.length === 0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'#8A8278'}}>No team members found</div>
          ) : (
            teamSellers.map((s: any) => (
              <div key={s.seller_email} style={{
                background:'#141414',border:'1px solid #232323',borderRadius:'10px',
                padding:'12px 14px',marginBottom:'8px'
              }}>
                <div onClick={() => toggleSeller(s.seller_email)} style={{
                  display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'
                }}>
                  <span style={{color:'#8A8278',width:'18px'}}>
                    {expandedSellers[s.seller_email] ? <ChevronDown /> : <ChevronRight />}
                  </span>
                  <div>
                    <span style={{fontWeight:600,fontSize:'0.82rem',display:'block'}}>{s.seller_name}</span>
                    <span style={{fontSize:'0.62rem',color:'#8A8278'}}>{s.region}</span>
                  </div>
                </div>
                {expandedSellers[s.seller_email] && (
                  <div style={{marginTop:'8px',marginLeft:'28px'}}>
                    <RoadmapCard roadmap={getRoadmap(s.seller_email)} name={s.seller_name} compact />
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>
    )
  }

  // ========== SELLER VIEW ==========
  if (!data) return (
    <div style={{padding:'18px',maxWidth:'700px',margin:'0 auto',textAlign:'center'}}>
      <Particles />
      <div style={{padding:'60px 20px',color:'#8A8278'}}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" style={{marginBottom:'12px'}}>
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        </svg>
        <h2 style={{color:'#C9A84C',marginBottom:'6px'}}>No Roadmap Data</h2>
        <p>Your growth journey will appear here.</p>
      </div>
    </div>
  )

  return (
    <div style={{padding:'18px',maxWidth:'700px',margin:'0 auto',color:'#F0EDE8',position:'relative'}}>
      <Particles />
      
      {/* Hero */}
      <div style={{textAlign:'center',padding:'12px 0 18px'}}>
        <div style={{marginBottom:'6px'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          </svg>
        </div>
        <h1 style={{fontSize:'1.4rem',fontWeight:800,background:'linear-gradient(135deg,#C9A84C,#F4631E)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'4px'}}>
          Your Growth Journey
        </h1>
        <p style={{fontSize:'0.7rem',color:'#8A8278'}}>Track your career progression at Thrillophilia</p>
      </div>

      <RoadmapCard roadmap={data} name={data.seller_name} />
    </div>
  )
}