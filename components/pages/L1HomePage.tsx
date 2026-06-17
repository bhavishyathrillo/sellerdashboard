'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from './HomePage.module.css'

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="1" style={{display:'inline',verticalAlign:'middle',marginRight:'2px'}}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

export default function L1HomePage({ session }: { session: UserSession }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedL2, setExpandedL2] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`/api/seller/l1-team?email=${encodeURIComponent(session.email)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session.email])

  const toggleL2 = (email: string) => {
    setExpandedL2((prev: any) => ({ ...prev, [email]: !prev[email] }))
  }

  if (loading) return (
    <div className={styles.loadingWrap}><div className={styles.spinner}/><p>Loading team...</p></div>
  )

  if (!data || data.totalSellers === 0) return (
    <div className={styles.errorWrap}><p>No team data found</p></div>
  )

  const { teamTotals } = data

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.sellerMeta}>
            <span className={styles.flag} style={{background:'rgba(201,168,76,0.12)',color:'#C9A84C'}}>
              <StarIcon /> Category Manager
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{data.l2Groups.length} L1 Managers</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>{data.totalSellers} Sellers</span>
          </div>
          <p className={styles.oneLiner}>Team Performance Overview</p>
        </div>
        <div className={styles.heroRight}><span className={styles.goalType}>Team Goal</span></div>
      </div>

      <div className={styles.statGrid} style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Team Goal</p>
          <p className={styles.statValue}>{fmt(teamTotals.goal)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Team Achieved</p>
          <p className={`${styles.statValue} ${styles.brandColor}`}>{fmt(teamTotals.achieved)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Team SHB</p>
          <p className={styles.statValue}>{fmt(teamTotals.shb)}</p>
        </div>
        <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
          <p className={styles.statLabel}>Team % Achieved</p>
          <p className={styles.statValue}>{teamTotals.pct.toFixed(1)}%</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{width:`${Math.min(teamTotals.pct,100)}%`}}/>
          </div>
        </div>
      </div>

      {data.l2Groups.map((group: any) => (
        <div key={group.l2_email} style={{
          background:'#141414',border:'1px solid #232323',borderRadius:'12px',
          padding:'14px',marginBottom:'10px',transition:'all 0.3s'
        }}>
          <div onClick={() => toggleL2(group.l2_email)} style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            cursor:'pointer',padding:'4px 0'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',flex:1}}>
              <span style={{fontSize:'0.7rem',color:'#8A8278',width:'16px'}}>
                {expandedL2[group.l2_email] ? <ChevronDown /> : <ChevronRight />}
              </span>
              <div>
                <span style={{fontWeight:700,fontSize:'0.85rem',display:'block'}}>
                  <UserIcon /> {group.l2_name}
                </span>
                <span style={{fontSize:'0.6rem',color:'#8A8278'}}>
                  {group.l2_kpi.region || '--'} · {group.l2_kpi.haul || '--'} · {group.seller_count} seller{group.seller_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:'0.7rem',color:'#8A8278',display:'block'}}>
                  {fmt(group.l2_kpi.achieved)} / {fmt(group.l2_kpi.goal)}
                </span>
                <span style={{fontSize:'0.6rem',color:'#8A8278'}}>
                  SHB: {fmt(group.l2_kpi.shb)}
                </span>
              </div>
              <span style={{
                fontWeight:700,fontSize:'0.9rem',
                color: group.l2_kpi.pct >= 100 ? '#22C55E' : '#F4631E'
              }}>
                {group.l2_kpi.pct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',margin:'8px 0'}}>
            <div style={{
              height:'100%',background:'linear-gradient(90deg,#F4631E,#C9A84C)',
              borderRadius:'2px',width:`${Math.min(group.l2_kpi.pct,100)}%`,transition:'width 0.5s'
            }}/>
          </div>

          {expandedL2[group.l2_email] && group.sellers.length > 0 && (
            <div style={{display:'flex',flexDirection:'column',gap:'4px',marginTop:'8px'}}>
              {group.sellers.map((seller: any) => (
                <div key={seller.seller_email} style={{
                  padding:'8px 12px',marginLeft:'24px',
                  background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',
                  borderRadius:'8px'
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontWeight:500,fontSize:'0.78rem'}}>{seller.seller_name}</span>
                    <span style={{
                      fontWeight:700,fontSize:'0.8rem',
                      color: seller.pct >= 100 ? '#22C55E' : '#F4631E'
                    }}>
                      {seller.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{marginTop:'3px'}}>
                    <div style={{
                      display:'flex',justifyContent:'space-between',
                      fontSize:'0.62rem',color:'#8A8278',marginBottom:'2px'
                    }}>
                      <span>{fmt(seller.achieved)} / {fmt(seller.goal)} completed</span>
                      <span>SHB: {fmt(seller.shb)}</span>
                    </div>
                    <div style={{
                      height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'
                    }}>
                      <div style={{
                        height:'100%',borderRadius:'2px',
                        background: seller.pct >= 100 ? '#22C55E' : '#F4631E',
                        width:`${Math.min(seller.pct,150)}%`,transition:'width 0.5s'
                      }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {expandedL2[group.l2_email] && group.sellers.length === 0 && (
            <div style={{padding:'12px',marginLeft:'24px',color:'#8A8278',fontSize:'0.75rem',textAlign:'center'}}>
              No sellers under this manager
            </div>
          )}
        </div>
      ))}
    </div>
  )
}