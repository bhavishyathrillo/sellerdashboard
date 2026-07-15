import React, { useRef, useEffect, useState } from 'react';
import { MheTrendChart, GoalShbTrendChart } from './LTACharts';
import { aggregateLtaFunnel } from './utils';

export function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

export function FunnelModal({ title, funnel, kalpit, onClose }: { title: string, funnel: ReturnType<typeof aggregateLtaFunnel>, kalpit: any[], onClose: () => void }) {
  const stages = [
    { 
      id: 'planned', label: 'Base target', sublabel: 'Planned LTA', value: funnel.planned, color: '#3B82F6', 
      drop: funnel.dynLost, dropLabel: funnel.dynLost > 0 ? 'Overallocation' : funnel.dynLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'dynamic', label: 'Dynamic LTA', sublabel: 'Adjusted for online time', value: funnel.dynLta, color: '#EAB308', 
      drop: funnel.hygLost, dropLabel: funnel.hygLost > 0 ? 'MHE penalty' : funnel.hygLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'hygiene', label: 'After MHE', sublabel: 'Based on mishandled', value: funnel.hygLta, color: '#F97316', 
      drop: funnel.rev1Lost, dropLabel: funnel.rev1Lost > 0 ? 'Goal completion' : funnel.rev1Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'goalComplete', label: 'After Goal Completion', sublabel: 'Adjusted for goal completion', value: funnel.rev1Lta, color: '#8B5CF6', 
      drop: funnel.rev2Lost, dropLabel: funnel.rev2Lost > 0 ? 'Final adjustment' : funnel.rev2Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'final', label: "Final target", sublabel: 'Actual LTA', value: funnel.actual, color: '#22C55E', 
      drop: null, dropLabel: null
    },
  ]
  return (
    <div className="la-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: 'auto', maxWidth: '95vw', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8' }}>{title} — LTA Funnel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
          {(() => {
            const usedSteps = stages.filter((step) => {
              const isNotUsed = step.id !== 'planned' && step.id !== 'final' &&
                kalpit?.find((k: any) => k.name === (step.id === 'goalComplete' ? 'goal' : step.id))?.value === 0;
              return !isNotUsed;
            });

            const actualSteps = usedSteps.map((step, idx, arr) => {
              if (idx === arr.length - 1) return step;
              const nextStep = arr[idx + 1];
              const dropValue = step.value - nextStep.value;
              let dropLabel = null;
              if (dropValue > 0) {
                if (nextStep.id === 'dynamic') dropLabel = 'Overallocation';
                else if (nextStep.id === 'hygiene') dropLabel = 'MHE penalty';
                else if (nextStep.id === 'goalComplete') dropLabel = 'Goal completion';
                else if (nextStep.id === 'final') dropLabel = 'Final adjustment';
              } else if (dropValue < 0) {
                dropLabel = 'Bonus added';
              }
              return { ...step, drop: dropValue, dropLabel };
            });

            return actualSteps.map((step, idx) => {
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
                  <div style={{ background: '#0D0D0D', border: `1px solid ${`${step.color}40`}`, borderRadius: '10px', padding: '10px 14px', minWidth: '100px', flexShrink: 0, position: 'relative' }}>
                    <div style={{ fontSize: '0.55rem', color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>{step.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F0EDE8', lineHeight: 1 }}>{step.value}</div>
                    <div style={{ fontSize: '0.52rem', color: '#5A5650', marginTop: '3px', lineHeight: 1.3 }}>{step.sublabel}</div>
                  </div>
                  {idx < actualSteps.length - 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px', minWidth: '56px' }}>
                      {step.drop !== null && step.drop !== 0 && (
                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: step.drop > 0 ? '#EF4444' : '#22C55E', background: step.drop > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: '2px 5px', borderRadius: '5px', marginBottom: '3px', whiteSpace: 'nowrap' }}>
                          {step.drop > 0 ? `−${step.drop}` : `+${Math.abs(step.drop)}`}
                        </div>
                      )}
                      <div style={{ fontSize: '0.5rem', color: '#4A4642', textAlign: 'center', lineHeight: 1.2, marginBottom: '3px' }}>{step.dropLabel}</div>
                      <span style={{ color: '#3A3A3A', fontSize: '0.9rem' }}>→</span>
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}

export function MheTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)
  
  // Canvas Refs for Monthly Breakdown
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);
  const lostChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lostChartInstance = useRef<any>(null);



  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allSellers = flatTls.flatMap(tl => tl.sellers)

  const buildDayMap = (sellers: any[]) => {
    const dayMap: Record<string, { sum: number; count: number }> = {}
    sellers.forEach((m: any) => {
      ;(m.monthly_lta_rows || []).forEach((r: any) => {
        const d = r.log_date
        if (!d) return
        const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
        if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
        dayMap[d].sum += pct
        dayMap[d].count += 1
      })
    })
    return dayMap
  }

  const activeSellers = drillSeller ? [drillSeller] : expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : expandedCatKey ? (hierarchy.find(c => c.category_name === expandedCatKey)?.tls.flatMap((t: any) => t.sellers) || []) : allSellers
  const dayMap = buildDayMap(activeSellers)
  const sortedDays = Object.keys(dayMap).sort()
  const labels = sortedDays.map(d => {
    const dt = new Date(d)
    return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`
  })
  const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))
  const avg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0
  const isGood = avg <= 20

  const title = drillSeller ? `${drillSeller.seller_name} — MHE Trend` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} Team — MHE Trend` : expandedCatKey ? `${expandedCatKey} Team — MHE Trend` : 'Org MHE Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: isGood ? '#22C55E' : '#EF4444' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
          <div style={{ flex: 1, minWidth: '400px', height: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
          </div>
          {(
            <div style={{ width: '260px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  const cCount = catSellers.length
                  let cmSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                    if (r && typeof r.mishandled_pct === 'number') cmSum += r.mishandled_pct * 100
                  })
                  const catAvg = cCount > 0 ? parseFloat((cmSum / cCount).toFixed(1)) : 0
                  
                  return (
                    <React.Fragment key={cat.category_name}>
                      <div className="la-drill-tl-row" onClick={() => { setExpandedCatKey(expandedCatKey === cat.category_name ? null : cat.category_name); setExpandedTlKey(null) }}>
                        <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{cat.category_name}</span>
                        <span style={{ color: catAvg <= 20 ? '#22C55E' : '#EF4444' }}>{catAvg}%</span>
                      </div>
                      
                      {expandedCatKey === cat.category_name && cat.tls.map((tl: any) => {
                        const tlKey = `${cat.category_name}-${tl.tl_name}`
                        const tlSellers = tl.sellers || []
                        const tCount = tlSellers.length
                        let tmSum = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                          if (r && typeof r.mishandled_pct === 'number') tmSum += r.mishandled_pct * 100
                        })
                        const tlAvg = tCount > 0 ? parseFloat((tmSum / tCount).toFixed(1)) : 0
                        
                        return (
                          <React.Fragment key={tlKey}>
                            <div className="la-drill-tl-row" style={{ paddingLeft: '24px' }} onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)}>
                              <span>{tl.tl_name}</span>
                              <span style={{ color: tlAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tlAvg}%</span>
                            </div>
                            
                            {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                              const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                              const mAvg = r && typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                              return (
                                <div key={s.seller_email} className="la-drill-seller-row" style={{ paddingLeft: '40px' }} onClick={() => setDrillSeller(s)}>
                                  <span>{s.seller_name}</span>
                                  <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444' }}>{mAvg}%</span>
                                </div>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function GoalShbTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)

  const flatTls = hierarchy.flatMap(cat => cat.tls.map((tl: any) => ({ ...tl, category_name: cat.category_name, key: `${cat.category_name}-${tl.tl_name}` })))
  const allSellers = flatTls.flatMap(tl => tl.sellers)

  const [y, mStr] = dateFrom.split('-')
  const daysInMonth = new Date(parseInt(y), parseInt(mStr), 0).getDate()

  const buildPadded = (sellers: any[]) => {
    const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
    sellers.forEach((m: any) => {
      ;(m.monthly_goal_shb || []).forEach((r: any) => {
        const d = r.date
        if (!d) return
        if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
        dayMap[d].goalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
        dayMap[d].shbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
        dayMap[d].count += 1
      })
    })
    const targetDay = parseInt(dateFrom.split('-')[2])
    const maxDay = targetDay <= daysInMonth ? targetDay : daysInMonth
    const padded = []
    for (let i = 1; i <= maxDay; i++) {
      const dStr = `${y}-${mStr}-${String(i).padStart(2, '0')}`
      if (dayMap[dStr]) {
        padded.push({ date: dStr, goalAvg: parseFloat((dayMap[dStr].goalSum / dayMap[dStr].count).toFixed(0)), shbAvg: parseFloat((dayMap[dStr].shbSum / dayMap[dStr].count).toFixed(0)) })
      } else {
        padded.push({ date: dStr, goalAvg: 0, shbAvg: 0 })
      }
    }
    return padded
  }

  const activeSellers = drillSeller ? [drillSeller] : expandedTlKey ? (flatTls.find(t => t.key === expandedTlKey)?.sellers || []) : expandedCatKey ? (hierarchy.find(c => c.category_name === expandedCatKey)?.tls.flatMap((t: any) => t.sellers) || []) : allSellers
  const activeData = buildPadded(activeSellers)
  const labels = activeData.map(d => {
    const labelDateObj = new Date(d.date)
    labelDateObj.setDate(labelDateObj.getDate() - 1)
    return `${labelDateObj.getDate()} ${labelDateObj.toLocaleString('default', { month: 'short' })}`
  })
  const goalValues = activeData.map(d => d.goalAvg)
  const shbValues = activeData.map(d => d.shbAvg)
  const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)

  const title = drillSeller ? `${drillSeller.seller_name} — Goal vs SHB` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} Team — Goal vs SHB` : expandedCatKey ? `${expandedCatKey} Team — Goal vs SHB Trend` : 'Org Goal vs SHB Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: '#3B82F6' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 2, height: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            {hasData ? <GoalShbTrendChart labels={labels} goalValues={goalValues} shbValues={shbValues} /> : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No data for this month yet.</div>
            )}
          </div>
          {(
            <div style={{ flex: 1, borderLeft: '1px solid #262626', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  let cGSum = 0, cSSum = 0, cValidCount = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                    if (r) {
                      cGSum += (r.goal_completion || 0) * 100
                      cSSum += (r.shb_percent || 0) * 100
                      cValidCount++
                    }
                  })
                  const cgAvg = cValidCount > 0 ? parseFloat((cGSum / cValidCount).toFixed(1)) : 0
                  const csAvg = cValidCount > 0 ? parseFloat((cSSum / cValidCount).toFixed(1)) : 0
                  
                  return (
                    <React.Fragment key={cat.category_name}>
                      <div className="la-drill-tl-row" onClick={() => { setExpandedCatKey(expandedCatKey === cat.category_name ? null : cat.category_name); setExpandedTlKey(null) }}>
                        <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{cat.category_name}</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <span style={{ color: '#3B82F6' }}>{cgAvg}%</span>
                          <span style={{ color: '#EAB308' }}>{csAvg}%</span>
                        </div>
                      </div>
                      
                      {expandedCatKey === cat.category_name && cat.tls.map((tl: any) => {
                        const tlKey = `${cat.category_name}-${tl.tl_name}`
                        const tlSellers = tl.sellers || []
                        let gSum = 0, sSum = 0, tValidCount = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                          if (r) {
                            gSum += (r.goal_completion || 0) * 100
                            sSum += (r.shb_percent || 0) * 100
                            tValidCount++
                          }
                        })
                        const gAvg = tValidCount > 0 ? parseFloat((gSum / tValidCount).toFixed(1)) : 0
                        const sAvg = tValidCount > 0 ? parseFloat((sSum / tValidCount).toFixed(1)) : 0
                        
                        return (
                          <React.Fragment key={tlKey}>
                            <div className="la-drill-tl-row" style={{ paddingLeft: '24px' }} onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)}>
                              <span>{tl.tl_name}</span>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <span style={{ color: '#3B82F6' }}>{gAvg}%</span>
                                <span style={{ color: '#EAB308' }}>{sAvg}%</span>
                              </div>
                            </div>
                            
                            {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                              const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                              const mgAvg = r ? parseFloat(((r.goal_completion || 0) * 100).toFixed(1)) : 0
                              const msAvg = r ? parseFloat(((r.shb_percent || 0) * 100).toFixed(1)) : 0
                              return (
                                <div key={s.seller_email} className="la-drill-seller-row" style={{ paddingLeft: '40px' }} onClick={() => setDrillSeller(s)}>
                                  <span>{s.seller_name}</span>
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ color: '#3B82F6' }}>{mgAvg}%</span>
                                    <span style={{ color: '#EAB308' }}>{msAvg}%</span>
                                  </div>
                                </div>
                              )
                            })}
                          </React.Fragment>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function NoLeadsModal({ sellers, onClose }: { sellers: any[], onClose: () => void }) {
  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '850px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Sellers without leads</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 2fr', gap: '16px', padding: '0 16px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>SELLER NAME</span>
            <span>STATUS</span>
            <span>CATEGORY MANAGER</span>
            <span>TEAM LEAD</span>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {sellers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No sellers without leads!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sellers.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 2fr', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#F0EDE8', fontWeight: 500 }}>{s.seller_name}</span>
                    <span style={{ color: '#EF4444', fontWeight: 500 }}>{s.status}</span>
                    <span style={{ color: '#8A8278' }}>{s.catName}</span>
                    <span style={{ color: '#F59E0B' }}>{s.tlName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function OverallocationModal({ sellers, onClose }: { sellers: any[], onClose: () => void }) {
  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '850px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Overallocated Sellers</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 2fr', gap: '16px', padding: '0 16px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>SELLER NAME</span>
            <span>FULFILLMENT %</span>
            <span>ALLOTTED / LTA</span>
            <span>TEAM LEAD</span>
            <span>CATEGORY MANAGER</span>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {sellers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No overallocated sellers!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sellers.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 2fr', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ color: '#F0EDE8', fontWeight: 500 }}>{s.seller_name}</span>
                    <span style={{ color: '#EF4444', fontWeight: 500 }}>{s.pct}%</span>
                    <span style={{ color: '#8A8278' }}>{s.totalLeads} / {s.ltaActual || 0}</span>
                    <span style={{ color: '#F59E0B' }}>{s.tlName}</span>
                    <span style={{ color: '#3B82F6' }}>{s.catName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

