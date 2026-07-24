'use client'
import { useEffect, useState, useRef } from 'react'
import { UserSession } from '@/lib/session'
import styles from './RoadmapPage.module.css'
import Loader from '@/components/ui/Loader'

import { RoadmapCard, fmt, RoadmapData, Props, ChevronDown, ChevronRight, UserIcon, Particles } from './RoadmapCard';

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