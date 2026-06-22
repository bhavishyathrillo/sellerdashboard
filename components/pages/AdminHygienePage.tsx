'use client'

import { useEffect, useState, useRef } from 'react'
import styles from './HygienePage.module.css'

function fmtDuration(min: number) { 
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60}m`; 
  return `${min}m` 
}

function ChevronDown() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>) }
function ChevronRight() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>) }
function CallIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>) }
function ClockIcon() { return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>) }
function StarIcon() { return (<svg width="10" height="10" viewBox="0 0 24 24" fill="#C9A84C" stroke="#C9A84C" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>) }

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

function HygieneChart({ dailyData }: { dailyData: any[] }) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<any>(null)

  useEffect(() => {
    if (!dailyData || dailyData.length === 0) return
    import('chart.js/auto').then(mod => {
      const Chart = mod.default || mod
      if (chartRef.current) {
        if (chartInstance.current) chartInstance.current.destroy()
        const ctx = chartRef.current.getContext('2d')
        if (!ctx) return
        chartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: dailyData.map((d: any) => d.date),
            datasets: [
              { label: 'Calls', data: dailyData.map((d: any) => d.call_dials || 0), borderColor: '#F4631E', backgroundColor: 'rgba(244,99,30,0.08)', fill: true, tension: 0.35, yAxisID: 'y', pointRadius: 3 },
              { label: 'Duration (min)', data: dailyData.map((d: any) => d.call_duration || 0), borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.05)', fill: false, tension: 0.35, yAxisID: 'y2', pointRadius: 3 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, labels: { color: '#8A8278', font: { size: 10 } } } },
            scales: {
              x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
              y: { type: 'linear', position: 'left', ticks: { color: '#F4631E', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
              y2: { type: 'linear', position: 'right', ticks: { color: '#22C55E', font: { size: 9 } }, grid: { drawOnChartArea: false }, beginAtZero: true }
            }
          }
        })
      }
    })
    return () => { if (chartInstance.current) chartInstance.current.destroy() }
  }, [dailyData])

  return (<div style={{ height: '200px', marginBottom: '16px' }}><canvas ref={chartRef} style={{ width: '100%', height: '100%' }} /></div>)
}

function getDisplayName(email: string, allSellers?: any[]): string {
  if (!email || !allSellers) return email?.split('@')[0]?.replace(/\./g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown'
  const key = email.toLowerCase().trim()
  
  const sellerRow = allSellers.find((s: any) => (s.seller_email || '').toLowerCase().trim() === key)
  if (sellerRow?.seller_name) return sellerRow.seller_name
  
  const l1Row = allSellers.find((s: any) => (s.l1_email || '').toLowerCase().trim() === key)
  if (l1Row?.l1_name) return l1Row.l1_name
  
  const l2Row = allSellers.find((s: any) => (s.l2_email || '').toLowerCase().trim() === key)
  if (l2Row?.l2_name) return l2Row.l2_name
  
  const prefix = email.split('@')[0]
  return prefix.replace(/\./g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
}

export default function AdminHygienePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedL1, setSelectedL1] = useState<any>(null)
  const [selectedL2, setSelectedL2] = useState<any>(null)
  const [selectedSeller, setSelectedSeller] = useState<any>(null)
  const [monthName, setMonthName] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [filteredResults, setFilteredResults] = useState<any[]>([])
  const [allSrsSellers, setAllSrsSellers] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/hygiene')
      .then(r => r.json())
      .then(d => { setData(d); setMonthName(d.month || ''); setAllSrsSellers(d._srsSellers || []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!data?.l1_data) return
    if (!search.trim()) { setFilteredResults([]); return }
    const q = search.toLowerCase().trim()
    const results: any[] = []
    data.l1_data.forEach((l1: any) => {
      l1.l2_groups?.forEach((l2: any) => {
        l2.sellers?.forEach((s: any) => {
          const sMatch = s.seller_name?.toLowerCase().includes(q) || s.seller_email?.toLowerCase().includes(q) || l1.l1_name?.toLowerCase().includes(q) || l2.l2_name?.toLowerCase().includes(q)
          if (sMatch) { s.dailyData?.forEach((d: any) => { results.push({ ...d, seller_name: s.seller_name, l1_name: l1.l1_name, l2_name: l2.l2_name }) }) }
        })
      })
    })
    setFilteredResults(results.slice(0, 500))
  }, [search, data])

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/><p>Loading...</p></div>

  const l1Data = data?.l1_data || []
  const summary = data?.summary || {}
  const daysPassed = data?.daysPassed || 19
  const totalCalls = summary.totalCalls || 0
  const totalSellers = summary.totalSellers || 0
  const avgCallsPerDay = summary.avgCallsPerSellerPerDay || 0
  const avgDurationPerDay = summary.avgDurationPerSellerPerDay || 0

  const allFlat: any[] = []
  l1Data.forEach((l1: any) => { l1.l2_groups?.forEach((l2: any) => { l2.sellers?.forEach((s: any) => { s.dailyData?.forEach((d: any) => { allFlat.push({ ...d, seller_name: s.seller_name, l1_name: l1.l1_name, l2_name: l2.l2_name }) }) }) }) })

  return (
    <div className={styles.page}>
      <div className={styles.particles}>{[...Array(10)].map((_, i) => (<div key={i} className={styles.particle} style={{left:`${Math.random()*100}%`,animationDelay:`${Math.random()*6}s`,animationDuration:`${4+Math.random()*6}s`}}><StarIcon /></div>))}</div>

      <div className={styles.hero}>
        <div className={styles.heroGlow}/>
        <span className={styles.heroIcon}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="1.5"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg></span>
        <h1 className={styles.heroTitle}>Performance Hygiene</h1>
        <p className={styles.heroSub}>All Teams · {monthName}</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiPrimary}`}><div className={styles.kpiIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4631E" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div><div className={styles.kpiValue}>{totalCalls}</div><div className={styles.kpiLabel}>Total Calls</div></div>
        <div className={styles.kpiCard}><div className={styles.kpiIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div><div className={styles.kpiValue}>{avgCallsPerDay}</div><div className={styles.kpiLabel}>Avg Calls/Day</div><div className={styles.kpiTrend}>Per seller · {totalSellers} sellers</div></div>
        <div className={styles.kpiCard}><div className={styles.kpiIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div className={styles.kpiValue}>{fmtDuration(avgDurationPerDay)}</div><div className={styles.kpiLabel}>Avg Duration/Day</div><div className={styles.kpiTrend}>Per seller · {daysPassed} days</div></div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}}>
          <button onClick={() => setViewMode('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='cards'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => setViewMode('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:viewMode==='table'?'rgba(244,99,30,0.15)':'transparent',color:viewMode==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller, Category Mgr, L1 Mgr..." style={{padding:'7px 12px',background:'#141414',border:'1px solid #232323',borderRadius:'8px',color:'#F0EDE8',fontSize:'0.72rem',outline:'none',width:'250px'}} />
      </div>

      {(viewMode === 'table' || search.trim()) && (
        <div className={styles.tableCard}><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>Seller</th><th>Category Mgr</th><th>L1 Manager</th><th>Calls</th><th>Duration</th></tr></thead><tbody>{(search.trim() ? filteredResults : allFlat).slice(0, 500).map((d: any, i: number) => (<tr key={i}><td style={{fontSize:'0.7rem',color:'#8A8278'}}>{d.date}</td><td style={{fontWeight:500,fontSize:'0.72rem'}}>{d.seller_name}</td><td style={{fontSize:'0.68rem',color:'#C9A84C'}}>{d.l1_name}</td><td style={{fontSize:'0.68rem',color:'#8A8278'}}>{d.l2_name}</td><td style={{fontWeight:600,fontSize:'0.72rem'}}>{d.call_dials||'—'}</td><td style={{fontSize:'0.7rem'}}>{d.call_duration > 0 ? `${d.call_duration} min` : '—'}</td></tr>))}</tbody></table></div></div>
      )}

      {viewMode === 'cards' && !search.trim() && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'12px'}}>
          {l1Data.map((l1: any) => {
            const tc = l1.total_calls || 0; const td = l1.total_duration || 0; const ac = l1.avg_calls_per_seller_per_day || 0; const ad = l1.avg_duration_per_seller_per_day || 0; const sc = l1.total_sellers || 0
            return (
              <div key={l1.l1_email} onClick={() => setSelectedL1(l1)} style={{background:'#141414',border:'1px solid #232323',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'all 0.3s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div><div style={{fontWeight:700,fontSize:'0.9rem'}}>{getDisplayName(l1.l1_email, allSrsSellers)}</div><div style={{fontSize:'0.62rem',color:'#8A8278'}}>{l1.l2_count} L1 Managers · {sc} sellers</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontSize:'0.75rem',fontWeight:600,color:'#F4631E'}}>{ac} calls/day</div><div style={{fontSize:'0.65rem',color:'#22C55E'}}>{fmtDuration(ad)}</div></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}><div style={{background:'rgba(255,255,255,0.02)',borderRadius:'8px',padding:'8px',textAlign:'center'}}><div style={{fontSize:'0.55rem',color:'#8A8278',textTransform:'uppercase'}}>Total Calls</div><div style={{fontSize:'0.85rem',fontWeight:700,color:'#F4631E'}}><CallIcon />{tc}</div></div><div style={{background:'rgba(255,255,255,0.02)',borderRadius:'8px',padding:'8px',textAlign:'center'}}><div style={{fontSize:'0.55rem',color:'#8A8278',textTransform:'uppercase'}}>Total Duration</div><div style={{fontSize:'0.85rem',fontWeight:700,color:'#22C55E'}}><ClockIcon />{fmtDuration(td)}</div></div></div>
                <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px'}}><div style={{height:'100%',background:'linear-gradient(90deg,#F4631E,#C9A84C)',borderRadius:'2px',width:'100%'}}/></div>
              </div>
            )
          })}
        </div>
      )}

      {/* L1 Popup */}
      {selectedL1 && (
        <PopupModal title={`${getDisplayName(selectedL1.l1_email, allSrsSellers)} — Hygiene`} onClose={() => setSelectedL1(null)}>
          {(() => {
            const allSellers: any[] = []; selectedL1.l2_groups?.forEach((l2: any) => { l2.sellers?.forEach((s: any) => allSellers.push(s)) })
            const dateMap: Record<string, { date: string; call_dials: number; call_duration: number }> = {}
            allSellers.forEach((s: any) => { (s.dailyData || []).forEach((d: any) => { if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, call_dials: 0, call_duration: 0 }; dateMap[d.date].call_dials += (d.call_dials || 0); dateMap[d.date].call_duration += (d.call_duration || 0) }) })
            const teamDailyData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date))
            const teamTotalCalls = teamDailyData.reduce((s, d) => s + d.call_dials, 0); const teamTotalDuration = teamDailyData.reduce((s, d) => s + d.call_duration, 0)
            return (<><HygieneChart dailyData={teamDailyData} /><div style={{display:'flex',gap:'16px',marginBottom:'12px',fontSize:'0.72rem',color:'#8A8278'}}><span>Team Total Calls: <strong style={{color:'#F4631E'}}>{teamTotalCalls}</strong></span><span>Team Total Duration: <strong style={{color:'#22C55E'}}>{fmtDuration(teamTotalDuration)}</strong></span><span>Avg/Day: <strong>{selectedL1.avg_calls_per_seller_per_day}</strong></span><span>Sellers: <strong>{allSellers.length}</strong></span></div></>)
          })()}
          <h3 style={{fontSize:'0.8rem',fontWeight:700,color:'#C9A84C',marginBottom:'10px'}}>L1 Managers ({selectedL1.l2_groups.length})</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:'10px'}}>
            {selectedL1.l2_groups.map((l2: any) => {
              const l2tc = l2.sellers?.reduce((s:number,r:any)=>s+(r.total_calls||0),0) || 0; const l2td = l2.sellers?.reduce((s:number,r:any)=>s+(r.total_duration||0),0) || 0
              return (<div key={l2.l2_email} onClick={(e) => { e.stopPropagation(); setSelectedL2(l2) }} style={{background:'#141414',border:'1px solid #232323',borderRadius:'12px',padding:'14px',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{getDisplayName(l2.l2_email, allSrsSellers)}</div><div style={{fontSize:'0.6rem',color:'#8A8278'}}>{l2.seller_count} sellers</div></div><div style={{textAlign:'right'}}><div style={{fontSize:'0.7rem',color:'#F4631E'}}><CallIcon />{l2tc}</div><div style={{fontSize:'0.6rem',color:'#22C55E'}}><ClockIcon />{fmtDuration(l2td)}</div></div></div></div>)
            })}
          </div>
        </PopupModal>
      )}

      {/* L2 Popup */}
      {selectedL2 && (
        <PopupModal title={`${getDisplayName(selectedL2.l2_email, allSrsSellers)} — Hygiene`} onClose={() => setSelectedL2(null)}>
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C9A84C', marginBottom: '10px' }}>👥 Team Combined</h4>
            {(() => {
              const allSellers = selectedL2.sellers || []
              if (allSellers.length === 0) return <div style={{ textAlign: 'center', padding: '20px', color: '#8A8278', fontSize: '0.75rem' }}>No data available</div>
              const dateMap: Record<string, { date: string; call_dials: number; call_duration: number }> = {}
              allSellers.forEach((s: any) => { (s.dailyData || []).forEach((d: any) => { if (!dateMap[d.date]) dateMap[d.date] = { date: d.date, call_dials: 0, call_duration: 0 }; dateMap[d.date].call_dials += (d.call_dials || 0); dateMap[d.date].call_duration += (d.call_duration || 0) }) })
              const teamDailyData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)); const ttc = teamDailyData.reduce((s, d) => s + d.call_dials, 0); const ttd = teamDailyData.reduce((s, d) => s + d.call_duration, 0)
              if (ttc === 0 && ttd === 0) return <div style={{ textAlign: 'center', padding: '20px', color: '#8A8278', fontSize: '0.75rem' }}>No call data available for this month</div>
              return (<><HygieneChart dailyData={teamDailyData} /><div style={{ display: 'flex', gap: '16px', fontSize: '0.72rem', color: '#8A8278', marginTop: '8px' }}><span>Team Total Calls: <strong style={{ color: '#F4631E' }}>{ttc}</strong></span><span>Team Total Duration: <strong style={{ color: '#22C55E' }}>{fmtDuration(ttd)}</strong></span><span>Sellers: <strong>{allSellers.length}</strong></span></div></>)
            })()}
          </div>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C9A84C', marginBottom: '10px' }}>👥 All Sellers ({(selectedL2.sellers || []).length + 1})</h4>
          {(() => {
            const ownData = selectedL2.sellers?.find((s: any) => s.seller_email?.toLowerCase() === selectedL2.l2_email?.toLowerCase())
            const l2SellerData = ownData || { seller_name: getDisplayName(selectedL2.l2_email, allSrsSellers), seller_email: selectedL2.l2_email, total_calls: 0, total_duration: 0, dailyData: [] }
            return (<div onClick={() => setSelectedSeller(l2SellerData)} style={{ background: 'rgba(244,99,30,0.08)', border: '1px solid rgba(244,99,30,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '6px', cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getDisplayName(selectedL2.l2_email, allSrsSellers)} <span style={{ fontSize: '0.6rem', color: '#F4631E', marginLeft: '6px' }}>(Manager)</span></span><div style={{ display: 'flex', gap: '14px', fontSize: '0.72rem' }}><span style={{ color: '#F4631E' }}><CallIcon />{l2SellerData.total_calls || 0}</span><span style={{ color: '#22C55E' }}><ClockIcon />{fmtDuration(l2SellerData.total_duration || 0)}</span></div></div></div>)
          })()}
          {(selectedL2.sellers || []).filter((s: any) => s.seller_email?.toLowerCase() !== selectedL2.l2_email?.toLowerCase()).map((s: any) => (<div key={s.seller_email} onClick={() => setSelectedSeller(s)} style={{ background: '#141414', border: '1px solid #232323', borderRadius: '10px', padding: '12px', marginBottom: '6px', cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{getDisplayName(s.seller_email, allSrsSellers)}</span><div style={{ display: 'flex', gap: '14px', fontSize: '0.72rem' }}><span style={{ color: '#F4631E' }}><CallIcon />{s.total_calls}</span><span style={{ color: '#22C55E' }}><ClockIcon />{fmtDuration(s.total_duration)}</span></div></div></div>))}
        </PopupModal>
      )}

      {/* Seller Popup */}
      {selectedSeller && (
        <PopupModal title={`${getDisplayName(selectedSeller.seller_email, allSrsSellers)} — Daily Log`} onClose={() => setSelectedSeller(null)}>
          <HygieneChart dailyData={selectedSeller.dailyData || []} />
          <div className={styles.tableWrap} style={{marginTop:'16px'}}><table className={styles.table}><thead><tr><th>Date</th><th>Calls</th><th>Duration</th></tr></thead><tbody>{[...(selectedSeller.dailyData || [])].reverse().map((d: any, i: number) => (<tr key={i}><td style={{fontSize:'0.7rem',color:'#8A8278'}}>{d.date}</td><td style={{fontWeight:600}}>{d.call_dials||'—'}</td><td>{d.call_duration > 0 ? `${d.call_duration} min` : '—'}</td></tr>))}</tbody></table></div>
        </PopupModal>
      )}
    </div>
  )
}