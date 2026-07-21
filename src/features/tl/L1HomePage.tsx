'use client'

import { useEffect, useState } from 'react'
import { UserSession } from '@/lib/session'
import styles from '../shared/HomePage.module.css'
import Loader from '@/components/ui/Loader'
import { useStickyState } from '@/hooks/useStickyState'

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
  const [toggleState, setToggleState] = useStickyState<'topline' | 'bottomline' | 'all'>('all', 'L1HomePage_toggleState')
  const [viewMode, setViewMode] = useStickyState<'cards' | 'table'>('cards', 'L1HomePage_viewMode')
  const [search, setSearch] = useStickyState('', 'L1HomePage_search')
  const [filteredResults, setFilteredResults] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/seller/l1-team?email=${encodeURIComponent(session.email)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session.email])

  const toggleL2 = (email: string) => {
    setExpandedL2((prev: any) => ({ ...prev, [email]: !prev[email] }))
  }

  const handleToggle = (type: 'topline' | 'bottomline') => {
    if (toggleState === type) {
      setToggleState('all')
    } else {
      setToggleState(type)
    }
  }

  // Search function
  useEffect(() => {
    if (!search.trim()) { setFilteredResults([]); return }
    const q = search.toLowerCase().trim()
    const results: any[] = []
    
    data?.l2Groups?.forEach((group: any) => {
      const l2Match = group.l2_name?.toLowerCase().includes(q)
      group.sellers?.forEach((s: any) => {
        const sMatch = s.seller_name?.toLowerCase().includes(q) || s.seller_email?.toLowerCase().includes(q)
        if (l2Match || sMatch) {
          results.push({ ...s, l2_name: group.l2_name, l2_email: group.l2_email, l2_kpi: group.l2_kpi })
        }
      })
    })
    setFilteredResults(results)
  }, [search, data])

  if (loading) return <Loader text="Loading..." />

  if (!data || data.totalSellers === 0) return (
    <div className={styles.errorWrap}><p>No team data found</p></div>
  )

  const l1Email = session.email.toLowerCase()

  const filterSeller = (seller: any) => {
    const goalType = (seller.defined_goal || '').toLowerCase()
    if (toggleState === 'all') return true
    if (toggleState === 'topline' && goalType.includes('topline')) return true
    if (toggleState === 'bottomline' && goalType.includes('bottomline')) return true
    return false
  }

  const filteredL2Groups = (data.l2Groups || []).map((group: any) => {
    const filteredSellers = (group.sellers || []).filter(filterSeller)
    return {
      ...group,
      sellers: filteredSellers,
      seller_count: filteredSellers.length,
    }
  }).filter((group: any) => {
    if (group.sellers.length > 0) return true
    if (toggleState === 'all' && group.l2_kpi?.goal > 0) return true
    return false
  })

  let totalGoal = 0, totalAch = 0, totalShb = 0, totalSellers = 0
  filteredL2Groups.forEach((group: any) => {
    // Include L1 Manager's own data in team totals
    if (group.l2_kpi) {
      const gType = (group.l2_kpi.defined_goal || group.l2_kpi.flag || '').toLowerCase()
      let includeL1 = false
      if (toggleState === 'all') includeL1 = true
      else if (toggleState === 'topline' && gType.includes('topline')) includeL1 = true
      else if (toggleState === 'bottomline' && !gType.includes('topline')) includeL1 = true

      if (includeL1) {
        totalGoal += group.l2_kpi.goal || 0
        totalAch += group.l2_kpi.achieved || 0
        totalShb += group.l2_kpi.shb || 0
        if (group.l2_kpi.goal !== undefined) totalSellers++
      }
    }

    group.sellers.forEach((s: any) => {
      totalGoal += s.goal || 0
      totalAch += s.achieved || 0
      totalShb += s.shb || 0
      totalSellers++
    })
  })
  const totalPct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

  // Flatten sellers for table view
  const allSellersFlat: any[] = []
  filteredL2Groups.forEach((group: any) => {
    group.sellers.forEach((s: any) => {
      allSellersFlat.push({ ...s, l2_name: group.l2_name, l2_email: group.l2_email })
    })
  })

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
            <span className={styles.metaText}>{totalSellers} Sellers</span>
          </div>
          <p className={styles.oneLiner}>Team Performance Overview</p>
        </div>
        <div className={styles.heroRight}>
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
            <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
          </div>
        </div>
      </div>

      {/* TOP LINE / BOTTOM LINE TOGGLE */}
      <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
        <button onClick={() => handleToggle('topline')} style={{
          padding:'7px 16px',borderRadius:'8px',
          border:`1px solid ${toggleState === 'topline' ? '#22C55E' : toggleState === 'all' ? '#22C55E' : '#2A2A2A'}`,
          background: toggleState === 'topline' ? 'rgba(34,197,94,0.12)' : toggleState === 'all' ? 'rgba(34,197,94,0.06)' : 'transparent',
          color: toggleState === 'topline' ? '#22C55E' : toggleState === 'all' ? '#8A8278' : '#8A8278',
          cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
        }}>
          {toggleState === 'topline' ? '✓ ' : ''}Top Line
        </button>
        <button onClick={() => handleToggle('bottomline')} style={{
          padding:'7px 16px',borderRadius:'8px',
          border:`1px solid ${toggleState === 'bottomline' ? '#F4631E' : toggleState === 'all' ? '#F4631E' : '#2A2A2A'}`,
          background: toggleState === 'bottomline' ? 'rgba(244,99,30,0.12)' : toggleState === 'all' ? 'rgba(244,99,30,0.06)' : 'transparent',
          color: toggleState === 'bottomline' ? '#F4631E' : toggleState === 'all' ? '#8A8278' : '#8A8278',
          cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
        }}>
          {toggleState === 'bottomline' ? '✓ ' : ''}Bottom Line
        </button>
        <span style={{fontSize:'0.65rem',color:'#8A8278',marginLeft:'auto'}}>
          {toggleState === 'all' ? 'Showing all' : toggleState === 'topline' ? 'Top Line only' : 'Bottom Line only'}
        </span>
      </div>

      {/* Search Bar */}
      <div style={{marginBottom:'16px'}}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by seller name or L1 Manager name..."
          style={{
            width:'100%',padding:'10px 14px',background:'#141414',border:'1px solid #232323',
            borderRadius:'10px',color:'#F0EDE8',fontSize:'0.8rem',outline:'none',
            maxWidth:'500px'
          }}
        />
      </div>

      {/* TABLE VIEW */}
      {(viewMode === 'table' || search.trim()) && (
        <div style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.74rem'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <th style={{padding:'10px 14px',textAlign:'left',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Seller</th>
                <th style={{padding:'10px 14px',textAlign:'left',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>L1 Manager</th>
                <th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Goal</th>
                <th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Achieved</th>
                <th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>SHB</th>
                <th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>%</th>
              </tr>
            </thead>
            <tbody>
              {(search.trim() ? filteredResults : allSellersFlat).slice(0, 200).map((s: any, i: number) => (
                <tr key={s.seller_email || i} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
                  <td style={{padding:'9px 14px',fontWeight:500,fontSize:'0.75rem'}}>{s.seller_name}</td>
                  <td style={{padding:'9px 14px',fontSize:'0.7rem',color:'#C9A84C'}}>{s.l2_name}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem'}}>{fmt(s.goal)}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem',color:'#F4631E'}}>{fmt(s.achieved)}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem'}}>{fmt(s.shb)}</td>
                  <td style={{padding:'9px 14px',textAlign:'right',fontWeight:700,fontSize:'0.75rem',color:s.pct>=100?'#22C55E':'#F4631E'}}>{s.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && !search.trim() && (
        <>
          {/* 4 KPI Cards */}
          <div className={styles.statGrid} style={{gridTemplateColumns:'repeat(4,1fr)'}}>
            <div className={styles.statCard}>
              <div className={styles.statBar} style={{ background: '#D4AF37' }} />
              <p className={styles.statLabel}>Team Goal</p>
              <p className={styles.statValue}>{fmt(totalGoal)}</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statBar} style={{ background: '#22C55E' }} />
              <p className={styles.statLabel}>Team Achieved</p>
              <p className={`${styles.statValue} ${styles.brandColor}`}>{fmt(totalAch)}</p>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statBar} style={{ background: '#F4631E' }} />
              <p className={styles.statLabel}>Team SHB</p>
              <p className={styles.statValue}>{fmt(totalShb)}</p>
            </div>
            <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
              <div className={styles.statBar} style={{ background: '#C9A84C' }} />
              <p className={styles.statLabel}>Team % Achieved</p>
              <p className={styles.statValue}>{totalPct.toFixed(1)}%</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width:`${Math.min(totalPct,100)}%`}}/>
              </div>
            </div>
          </div>

          {/* L2 Manager Rows */}
          {filteredL2Groups.map((group: any) => {
            const isOwnGroup = group.l2_email?.toLowerCase() === l1Email
            const isExpanded = expandedL2[group.l2_email] === true
            
            let sellerGoal = group.sellers.reduce((s: number, r: any) => s + (r.goal || 0), 0)
            let sellerAch = group.sellers.reduce((s: number, r: any) => s + (r.achieved || 0), 0)
            let sellerShb = group.sellers.reduce((s: number, r: any) => s + (r.shb || 0), 0)
            
            // Include TL's personal KPI in their Team accordion summary
            if (group.l2_kpi) {
              const gType = (group.l2_kpi.defined_goal || group.l2_kpi.flag || '').toLowerCase()
              let includeL1 = false
              if (toggleState === 'all') includeL1 = true
              else if (toggleState === 'topline' && gType.includes('topline')) includeL1 = true
              else if (toggleState === 'bottomline' && !gType.includes('topline')) includeL1 = true
        
              if (includeL1) {
                sellerGoal += group.l2_kpi.goal || 0
                sellerAch += group.l2_kpi.achieved || 0
                sellerShb += group.l2_kpi.shb || 0
              }
            }

            const sellerPct = sellerGoal > 0 ? (sellerAch / sellerGoal) * 100 : 0

            const displayGoal = isExpanded ? group.l2_kpi.goal : sellerGoal
            const displayAch = isExpanded ? group.l2_kpi.achieved : sellerAch
            const displayShb = isExpanded ? group.l2_kpi.shb : sellerShb
            const displayPct = isExpanded ? group.l2_kpi.pct : sellerPct

            return (
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
                      {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </span>
                    <div>
                      <span style={{fontWeight:700,fontSize:'0.85rem',display:'block'}}>
                        <UserIcon /> {group.l2_name}
                        <span style={{fontSize:'0.55rem',color:'#8A8278',fontWeight:400,marginLeft:'8px'}}>
                          {isExpanded ? '· Personal' : '· Team'}
                        </span>
                      </span>
                      <span style={{fontSize:'0.6rem',color:'#8A8278'}}>
                        {group.l2_kpi.region || '--'} · {group.l2_kpi.haul || '--'} · {group.sellers.length} seller{group.sellers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {!isOwnGroup && (
                    <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontSize:'0.7rem',color:'#8A8278',display:'block'}}>
                          {fmt(displayAch)} / {fmt(displayGoal)}
                        </span>
                        <span style={{fontSize:'0.6rem',color:'#8A8278'}}>SHB: {fmt(displayShb)}</span>
                      </div>
                      <span style={{fontWeight:700,fontSize:'0.9rem',color: displayPct >= 100 ? '#22C55E' : '#F4631E'}}>
                        {displayPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {isOwnGroup && (
                    <span style={{fontSize:'0.65rem',color:'#8A8278'}}>
                      {group.sellers.length} seller{group.sellers.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {!isOwnGroup && (
                  <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',margin:'8px 0'}}>
                    <div style={{height:'100%',background: displayPct >= 100 ? '#22C55E' : '#F4631E',borderRadius:'2px',width:`${Math.min(displayPct,100)}%`,transition:'width 0.5s'}}/>
                  </div>
                )}

                {isExpanded && group.sellers.length > 0 && (
                  <div style={{display:'flex',flexDirection:'column',gap:'4px',marginTop:'8px'}}>
                    {group.sellers.map((seller: any) => (
                      <div key={seller.seller_email} style={{
                        padding:'8px 12px',marginLeft:'24px',
                        background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)',
                        borderRadius:'8px'
                      }}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span style={{fontWeight:500,fontSize:'0.78rem'}}>{seller.seller_name}</span>
                          <span style={{fontWeight:700,fontSize:'0.8rem',color: seller.pct >= 100 ? '#22C55E' : '#F4631E'}}>
                            {seller.pct.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{marginTop:'3px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.62rem',color:'#8A8278',marginBottom:'2px'}}>
                            <span>{fmt(seller.achieved)} / {fmt(seller.goal)} completed</span>
                            <span>SHB: {fmt(seller.shb)}</span>
                          </div>
                          <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:'2px',background: seller.pct >= 100 ? '#22C55E' : '#F4631E',width:`${Math.min(seller.pct,150)}%`,transition:'width 0.5s'}}/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {isExpanded && group.sellers.length === 0 && (
                  <div style={{padding:'12px',marginLeft:'24px',color:'#8A8278',fontSize:'0.75rem',textAlign:'center'}}>
                    No sellers match the selected filter
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}