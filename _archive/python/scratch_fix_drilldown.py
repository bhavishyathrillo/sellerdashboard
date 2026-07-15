import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# --- Fix MheTrendModal ---
mhe_replacement = """
function MheTrendModal({ hierarchy, onClose }: { hierarchy: any[], onClose: () => void }) {
  const [drillSeller, setDrillSeller] = useState<any>(null)
  const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)

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

  const title = drillSeller ? `${drillSeller.seller_name} — MHE Trend` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} — MHE Trend` : expandedCatKey ? `${expandedCatKey} — MHE Trend` : 'Org MHE Trend'

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card wide" onClick={e => e.stopPropagation()}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          {drillSeller && <button className="la-back-btn" onClick={() => setDrillSeller(null)}>← Back</button>}
          <span className="la-modal-dot" style={{ background: isGood ? '#22C55E' : '#EF4444' }} />
          <span className="la-modal-title">{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexDirection: drillSeller ? 'column' : 'row' }}>
          <div style={{ flex: 1, minWidth: '400px', height: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
            <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
          </div>
          {!drillSeller && (
            <div style={{ width: '260px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  const catDayMap = buildDayMap(catSellers)
                  const catDays = Object.keys(catDayMap)
                  const catAvg = catDays.length > 0 ? parseFloat((catDays.reduce((s, d) => s + (catDayMap[d].sum / catDayMap[d].count), 0) / catDays.length).toFixed(1)) : 0
                  
                  return (
                    <React.Fragment key={cat.category_name}>
                      <div className="la-drill-tl-row" onClick={() => { setExpandedCatKey(expandedCatKey === cat.category_name ? null : cat.category_name); setExpandedTlKey(null) }}>
                        <span style={{ fontWeight: 600, color: '#F0EDE8' }}>{cat.category_name}</span>
                        <span style={{ color: catAvg <= 20 ? '#22C55E' : '#EF4444' }}>{catAvg}%</span>
                      </div>
                      
                      {expandedCatKey === cat.category_name && cat.tls.map((tl: any) => {
                        const tlKey = `${cat.category_name}-${tl.tl_name}`
                        const tlDayMap = buildDayMap(tl.sellers)
                        const tlDays = Object.keys(tlDayMap)
                        const tlAvg = tlDays.length > 0 ? parseFloat((tlDays.reduce((s, d) => s + (tlDayMap[d].sum / tlDayMap[d].count), 0) / tlDays.length).toFixed(1)) : 0
                        
                        return (
                          <React.Fragment key={tlKey}>
                            <div className="la-drill-tl-row" style={{ paddingLeft: '24px' }} onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)}>
                              <span>{tl.tl_name}</span>
                              <span style={{ color: tlAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tlAvg}%</span>
                            </div>
                            
                            {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                              let mSum = 0, mDays = 0
                              ;(s.monthly_lta_rows || []).forEach((r: any) => { if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++ } })
                              const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0
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
""".strip()

text = re.sub(
    r'function MheTrendModal.*?(?=/\* ─── Goal vs SHB Trend Modal ─── \*/)', 
    mhe_replacement + '\n\n', 
    text, 
    flags=re.DOTALL
)

# --- Fix GoalShbTrendModal ---
goal_shb_replacement = """
function GoalShbTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {
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
    const padded = []
    for (let i = 1; i <= daysInMonth; i++) {
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
  const labels = activeData.map(d => `${parseInt(d.date.split('-')[2])} ${new Date(d.date).toLocaleString('default', { month: 'short' })}`)
  const goalValues = activeData.map(d => d.goalAvg)
  const shbValues = activeData.map(d => d.shbAvg)
  const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)

  const title = drillSeller ? `${drillSeller.seller_name} — Goal vs SHB` : expandedTlKey ? `${flatTls.find(t => t.key === expandedTlKey)?.tl_name} — Goal vs SHB` : expandedCatKey ? `${expandedCatKey} — Goal vs SHB Trend` : 'Org Goal vs SHB Trend'

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
          {!drillSeller && (
            <div style={{ flex: 1, borderLeft: '1px solid #262626', paddingLeft: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px' }}>Team Drill-down</div>
              <div className="la-drill-list">
                {hierarchy.map(cat => {
                  let cGSum = 0, cSSum = 0, cCnt = 0
                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  catSellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { cGSum += (r.goal_completion || 0) * 100; cSSum += (r.shb_percent || 0) * 100; cCnt++ }))
                  const cgAvg = cCnt > 0 ? Math.round(cGSum / cCnt) : 0
                  const csAvg = cCnt > 0 ? Math.round(cSSum / cCnt) : 0
                  
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
                        let gSum = 0, sSum = 0, cnt = 0
                        tl.sellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { gSum += (r.goal_completion || 0) * 100; sSum += (r.shb_percent || 0) * 100; cnt++ }))
                        const gAvg = cnt > 0 ? Math.round(gSum / cnt) : 0
                        const sAvg = cnt > 0 ? Math.round(sSum / cnt) : 0
                        
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
                              let mg = 0, ms = 0, mc = 0
                              ;(s.monthly_goal_shb || []).forEach((r: any) => { mg += (r.goal_completion || 0) * 100; ms += (r.shb_percent || 0) * 100; mc++ })
                              const mgAvg = mc > 0 ? Math.round(mg / mc) : 0
                              const msAvg = mc > 0 ? Math.round(ms / mc) : 0
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
""".strip()

text = re.sub(
    r'function GoalShbTrendModal.*?(?=export default function AdminLTAPage)', 
    goal_shb_replacement + '\n\n', 
    text, 
    flags=re.DOTALL
)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
