'use client'

import { useEffect, useState } from 'react'
import styles from './HomePage.module.css'

function fmt(n: number) {
  if (!n && n !== 0) return '₹0'
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n.toFixed(0)}`
}

function ChevronDown() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>) }
function ChevronRight() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>) }

function PopupModal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(4px)'}}/>
      <div style={{position:'relative',width:'92vw',maxWidth:'1000px',maxHeight:'88vh',background:'#0D0D0D',border:'1px solid #232323',borderRadius:'16px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #1A1A1A',background:'#111111',flexShrink:0}}>
          <h2 style={{fontSize:'0.95rem',fontWeight:700,color:'#F0EDE8'}}>{title}</h2>
          <button onClick={onClose} style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #333',background:'transparent',color:'#8A8278',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'20px'}}>{children}</div>
      </div>
    </div>
  )
}

// Check if any seller in L1 has Top Line
const hasToplineSellers = (l1: any) => {
  let hasTopline = false
  l1.l2_groups?.forEach((l2: any) => {
    l2.sellers?.forEach((s: any) => {
      const goal = (s.defined_goal || '').toLowerCase()
      if (goal.includes('topline')) hasTopline = true
    })
  })
  return hasTopline
}

export default function AdminOverviewPage() {
  const [apiData, setApiData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filteredResults, setFilteredResults] = useState<any[]>([])
  const [activeLine, setActiveLine] = useState<'topline' | 'bottomline'>('topline')
  const [expandedL2, setExpandedL2] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(r => r.json())
      .then(d => { 
        setApiData(d)
        // Set default active line based on data
        const allL1 = d?.l1_data || []
        let hasTopline = false
        allL1.forEach((l1: any) => {
          if (hasToplineSellers(l1)) hasTopline = true
        })
        setActiveLine(hasTopline ? 'topline' : 'bottomline')
        setLoading(false)
      })
  }, [])

  const toggleLine = () => {
    setActiveLine(activeLine === 'topline' ? 'bottomline' : 'topline')
  }

  const l1Data = apiData?.l1_data || []
  const totalSellers = apiData?.totalSellers || 0

  useEffect(() => {
    if (!search.trim()) { setFilteredResults([]); return }
    const q = search.toLowerCase().trim()
    const results: any[] = []
    l1Data.forEach((l1: any) => {
      const l1Match = l1.l1_name?.toLowerCase().includes(q)
      l1.l2_groups?.forEach((l2: any) => {
        const l2Match = l2.l2_name?.toLowerCase().includes(q)
        l2.sellers?.forEach((s: any) => {
          const sMatch = s.seller_name?.toLowerCase().includes(q) || s.seller_email?.toLowerCase().includes(q)
          if (l1Match || l2Match || sMatch) {
            results.push({ ...s, l1_name: l1.l1_name, l2_name: l2.l2_name })
          }
        })
      })
    })
    setFilteredResults(results)
  }, [search])

  const toggleL2 = (email: string) => {
    setExpandedL2((prev: any) => ({ ...prev, [email]: !prev[email] }))
  }

  const filterSeller = (seller: any) => {
    const goalType = (seller.defined_goal || '').toLowerCase()
    if (activeLine === 'topline') {
      return goalType.includes('topline')
    } else {
      return goalType.includes('bottomline')
    }
  }

  const filteredL1Data = l1Data.map((l1: any) => {
    const filteredL2 = (l1.l2_groups || []).map((l2: any) => {
      const filteredSellers = (l2.sellers || []).filter(filterSeller)
      return { ...l2, sellers: filteredSellers, seller_count: filteredSellers.length }
    }).filter((l2: any) => l2.sellers.length > 0)
    return { ...l1, l2_groups: filteredL2, total_sellers: filteredL2.reduce((s: number, l2: any) => s + l2.seller_count, 0) }
  }).filter((l1: any) => l1.total_sellers > 0)

  if (loading) return (
    <div className={styles.loadingWrap}><div className={styles.spinner}/><p>Loading...</p></div>
  )

  const allSellersFlat: any[] = []
  filteredL1Data.forEach((l1: any) => {
    l1.l2_groups?.forEach((l2: any) => {
      l2.sellers?.forEach((s: any) => {
        allSellersFlat.push({ ...s, l1_name: l1.l1_name, l2_name: l2.l2_name })
      })
    })
  })

  let totalGoal = 0, totalAch = 0, totalShb = 0
  filteredL1Data.forEach((l1: any) => {
    l1.l2_groups.forEach((l2: any) => {
      l2.sellers.forEach((s: any) => {
        totalGoal += s.goal || 0
        totalAch += s.achieved || 0
        totalShb += s.shb || 0
      })
    })
  })
  const totalPct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

  return (
    <div className={styles.page} style={{maxWidth:'1100px',margin:'0 auto',padding:'20px'}}>
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <h1 style={{fontSize:'1.4rem',fontWeight:700,color:'#C9A84C'}}>Admin Dashboard</h1>
          <p style={{fontSize:'0.72rem',color:'#8A8278'}}>
            {filteredL1Data.length} Category Managers · {totalSellers} Sellers
            <span style={{marginLeft:'8px',color: activeLine === 'topline' ? '#22C55E' : '#F4631E'}}>
              · {activeLine === 'topline' ? 'Top Line' : 'Bottom Line'}
            </span>
          </p>
        </div>
        <div className={styles.heroRight}>
          <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
            <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
            <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
          </div>
        </div>
      </div>

      {/* TOP LINE / BOTTOM LINE TOGGLE - Switch between Top and Bottom */}
      <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center'}}>
        <button onClick={toggleLine} style={{
          padding:'7px 16px',borderRadius:'8px',
          border: `1px solid ${activeLine === 'topline' ? '#22C55E' : '#F4631E'}`,
          background: activeLine === 'topline' ? 'rgba(34,197,94,0.12)' : 'rgba(244,99,30,0.12)',
          color: activeLine === 'topline' ? '#22C55E' : '#F4631E',
          cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
        }}>
          {activeLine === 'topline' ? '✓ Top Line' : 'Top Line'}
        </button>
        <button onClick={toggleLine} style={{
          padding:'7px 16px',borderRadius:'8px',
          border: `1px solid ${activeLine === 'bottomline' ? '#F4631E' : '#22C55E'}`,
          background: activeLine === 'bottomline' ? 'rgba(244,99,30,0.12)' : 'rgba(34,197,94,0.12)',
          color: activeLine === 'bottomline' ? '#F4631E' : '#22C55E',
          cursor:'pointer',fontSize:'0.7rem',fontWeight:600,transition:'all 0.2s'
        }}>
          {activeLine === 'bottomline' ? '✓ Bottom Line' : 'Bottom Line'}
        </button>
        <span style={{fontSize:'0.65rem',color:'#8A8278',marginLeft:'auto'}}>
          Showing {activeLine === 'topline' ? 'Top Line' : 'Bottom Line'} sellers
        </span>
      </div>

      <div style={{marginBottom:'16px'}}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by seller name, Category Manager or L1 Manager..." style={{width:'100%',padding:'10px 14px',background:'#141414',border:'1px solid #232323',borderRadius:'10px',color:'#F0EDE8',fontSize:'0.8rem',outline:'none',maxWidth:'500px'}}/>
      </div>

      {/* TABLE VIEW */}
      {(viewMode === 'table' || search.trim()) && (
        <div style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.74rem'}}>
            <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}><th style={{padding:'10px 14px',textAlign:'left',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Seller</th><th style={{padding:'10px 14px',textAlign:'left',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Category Mgr</th><th style={{padding:'10px 14px',textAlign:'left',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>L1 Manager</th><th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Goal</th><th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>Achieved</th><th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>SHB</th><th style={{padding:'10px 14px',textAlign:'right',fontSize:'0.6rem',color:'#8A8278',textTransform:'uppercase'}}>%</th></tr></thead>
            <tbody>{(search.trim() ? filteredResults : allSellersFlat).slice(0, 200).map((s: any, i: number) => (<tr key={s.seller_email || i} style={{borderBottom:'1px solid rgba(255,255,255,0.03)'}}><td style={{padding:'9px 14px',fontWeight:500,fontSize:'0.75rem'}}>{s.seller_name}</td><td style={{padding:'9px 14px',fontSize:'0.7rem',color:'#C9A84C'}}>{s.l1_name}</td><td style={{padding:'9px 14px',fontSize:'0.7rem',color:'#8A8278'}}>{s.l2_name}</td><td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem'}}>{fmt(s.goal)}</td><td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem',color:'#F4631E'}}>{fmt(s.achieved)}</td><td style={{padding:'9px 14px',textAlign:'right',fontSize:'0.72rem'}}>{fmt(s.shb)}</td><td style={{padding:'9px 14px',textAlign:'right',fontWeight:700,fontSize:'0.75rem',color:s.pct>=100?'#22C55E':'#F4631E'}}>{s.pct.toFixed(1)}%</td></tr>))}</tbody>
          </table>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && !search.trim() && (
        <>
          <div className={styles.statGrid} style={{gridTemplateColumns:'repeat(4,1fr)'}}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Goal</p>
              <p className={styles.statValue}>{fmt(totalGoal)}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Achieved</p>
              <p className={`${styles.statValue} ${styles.brandColor}`}>{fmt(totalAch)}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total SHB</p>
              <p className={styles.statValue}>{fmt(totalShb)}</p>
            </div>
            <div className={`${styles.statCard} ${styles.statCardHighlight}`}>
              <p className={styles.statLabel}>Total %</p>
              <p className={styles.statValue}>{totalPct.toFixed(1)}%</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width:`${Math.min(totalPct,100)}%`}}/>
              </div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'12px'}}>
            {filteredL1Data.map((l1: any) => {
              let l1Goal = 0, l1Ach = 0, l1Shb = 0, l1Sellers = 0
              l1.l2_groups.forEach((l2: any) => {
                l2.sellers.forEach((s: any) => {
                  l1Goal += s.goal || 0
                  l1Ach += s.achieved || 0
                  l1Shb += s.shb || 0
                  l1Sellers++
                })
              })
              const l1Pct = l1Goal > 0 ? (l1Ach / l1Goal) * 100 : 0

              return (
                <div key={l1.l1_email} onClick={() => setSelectedL1({...l1, total_goal: l1Goal, total_achieved: l1Ach, total_shb: l1Shb, pct: l1Pct, total_sellers: l1Sellers})} style={{background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'all 0.3s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                    <div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{l1.l1_name}</div><div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1Sellers} sellers · {l1.l2_groups.length} L1 Managers</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:'0.9rem',color:l1Pct>=100?'#22C55E':'#F4631E'}}>{l1Pct.toFixed(1)}%</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>{fmt(l1Ach)} / {fmt(l1Goal)}</div></div>
                  </div>
                  <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px'}}><div style={{height:'100%',background:'linear-gradient(90deg,#F4631E,#C9A84C)',borderRadius:'2px',width:`${Math.min(l1Pct,100)}%`,transition:'width 0.5s'}}/></div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* L1 Popup */}
      {selectedL1 && (
        <PopupModal title={`${selectedL1.l1_name} — L1 Managers`} onClose={() => setSelectedL1(null)}>
          <div style={{display:'flex',gap:'10px',marginBottom:'12px',fontSize:'0.7rem',color:'#8A8278'}}>
            <span>Goal: {fmt(selectedL1.total_goal)}</span>
            <span>Achieved: <span style={{color:'#F4631E'}}>{fmt(selectedL1.total_achieved)}</span></span>
            <span>SHB: {fmt(selectedL1.total_shb)}</span>
            <span style={{fontWeight:700,color:selectedL1.pct>=100?'#22C55E':'#F4631E'}}>{selectedL1.pct.toFixed(1)}%</span>
          </div>
          
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => {
              const isExpanded = expandedL2[l2.l2_email] === true
              
              const sellerGoal = l2.sellers.reduce((s: number, r: any) => s + (r.goal || 0), 0)
              const sellerAch = l2.sellers.reduce((s: number, r: any) => s + (r.achieved || 0), 0)
              const sellerShb = l2.sellers.reduce((s: number, r: any) => s + (r.shb || 0), 0)
              const sellerPct = sellerGoal > 0 ? (sellerAch / sellerGoal) * 100 : 0

              const displayGoal = isExpanded ? l2.l2_goal : sellerGoal
              const displayAch = isExpanded ? l2.l2_achieved : sellerAch
              const displayPct = isExpanded ? l2.l2_pct : sellerPct

              return (
                <div 
                  key={l2.l2_email} 
                  onClick={(e) => { 
                    e.stopPropagation()
                    toggleL2(l2.l2_email)
                  }} 
                  style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',cursor:'pointer'}}
                >
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:'0.82rem'}}>
                        {l2.l2_name}
                        <span style={{fontSize:'0.55rem',color:'#8A8278',fontWeight:400,marginLeft:'6px'}}>
                          {isExpanded ? '· Personal' : '· Team'}
                        </span>
                      </div>
                      <div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2.sellers.length} sellers</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:'0.85rem',color:displayPct >= 100 ? '#22C55E' : '#F4631E'}}>
                      {displayPct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{fontSize:'0.65rem',color:'#8A8278',marginTop:'4px'}}>{fmt(displayAch)} / {fmt(displayGoal)}</div>
                  <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}>
                    <div style={{height:'100%',background:displayPct >= 100 ? '#22C55E' : '#F4631E',borderRadius:'2px',width:`${Math.min(displayPct,100)}%`}}/>
                  </div>
                </div>
              )
            })}
          </div>
        </PopupModal>
      )}

      {/* L2 Popup */}
      {selectedL2 && (
        <PopupModal title={`${selectedL2.l2_name} — Sellers`} onClose={() => setSelectedL2(null)}>
          {selectedL2.sellers.map((s: any) => (
            <div key={s.seller_email} style={{background:'#141414',border:'1px solid #232323',borderRadius:'10px',padding:'12px',marginBottom:'6px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><span style={{fontWeight:600,fontSize:'0.8rem',display:'block'}}>{s.seller_name}</span><span style={{fontSize:'0.6rem',color:'#8A8278'}}>{s.region} · {s.haul} · {s.flag}</span></div>
                <div style={{textAlign:'right'}}><span style={{fontWeight:700,fontSize:'0.85rem',color:s.pct>=100?'#22C55E':'#F4631E'}}>{s.pct.toFixed(1)}%</span><div style={{fontSize:'0.65rem',color:'#8A8278'}}>{fmt(s.achieved)} / {fmt(s.goal)}</div></div>
              </div>
              <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',marginTop:'6px'}}>
                <div style={{height:'100%',background:s.pct>=100?'#22C55E':'#F4631E',borderRadius:'2px',width:`${Math.min(s.pct,100)}%`}}/>
              </div>
            </div>
          ))}
        </PopupModal>
      )}
    </div>
  )
}