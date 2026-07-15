import React from 'react';


export default function MheTrendModal(props: any) {
  const { setShowMheTrendModal, date, todayStr, mheDrillSeller, setMheDrillSeller, allMembers, processedGroups, mheExpandedTl, setMheExpandedTl, MheTrendChart } = props;

  // Render logic extracted from L1SellerViewPage
  const targetDay = date || todayStr();
          const dayMap: Record<string, { sum: number; count: number }> = {}
          const activeSellers = mheDrillSeller ? (mheDrillSeller.isGroup ? mheDrillSeller.members : [mheDrillSeller]) : allMembers
          activeSellers.forEach((m: any) => {
            ;(m.monthly_lta_rows || []).forEach((r: any) => {
              const d = r.log_date
              if (!d) return
              const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
              if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
              dayMap[d].sum += pct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          const labels = sortedDays.map(d => {
            const dt = new Date(d)
            return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`
          })
          const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))
          const teamAvg = values.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0
          const isGood = teamAvg <= 20
          const title = mheDrillSeller ? `${mheDrillSeller.seller_name} — MHE Trend` : `Team MHE Trend`

          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMheTrendModal(false)}>
              <div style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px', width: '820px', maxWidth: '96vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#E5E7EB', cursor: 'pointer', fontSize: '1rem', padding: '4px 10px', borderRadius: '6px', lineHeight: 1 }} onClick={() => setShowMheTrendModal(false)}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #262626' }}>
                  {mheDrillSeller && <button style={{ background: 'transparent', border: '1px solid #444', color: '#A1A1AA', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '8px' }} onClick={() => setMheDrillSeller(null)}>← Back</button>}
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isGood ? '#22C55E' : '#EF4444', boxShadow: `0 0 10px ${isGood ? '#22C55E' : '#EF4444'}` }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{title}</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
                  <div style={{ flex: 1, minWidth: '400px', height: '260px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
                    {labels.length > 0 ? (
                      <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No MHE data for this month yet.</div>
                    )}
                  </div>
                  <div style={{ width: '260px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {processedGroups.map((g: any) => {
                        let tlSum = 0;
                        let tlCount = 0;
                        g.members.forEach((s: any) => {
                          const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === targetDay)
                          if (r && typeof r.mishandled_pct === 'number') {
                            tlSum += r.mishandled_pct * 100
                            tlCount++
                          }
                        })
                        const tlAvg = tlCount > 0 ? parseFloat((tlSum / tlCount).toFixed(1)) : 0
                        return (
                        <div key={g.l2_email} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div 
                            onClick={() => {
                              setMheExpandedTl(mheExpandedTl === g.l2_email ? null : g.l2_email);
                              setMheDrillSeller({ ...g, isGroup: true, seller_name: `Team ${g.l2_name}` });
                            }}
                            style={{ fontSize: '0.75rem', fontWeight: 700, color: mheExpandedTl === g.l2_email ? '#F4631E' : '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ transform: mheExpandedTl === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.6rem' }}>▶</span>
                              {g.l2_name}
                            </div>
                            <span style={{ color: tlAvg <= 20 ? '#22C55E' : '#EF4444', fontWeight: 500 }}>{tlAvg}%</span>
                          </div>
                          {mheExpandedTl === g.l2_email && g.members.map((s: any) => {
                            const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === targetDay)
                            const mAvg = r && typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                            return (
                              <div key={s.seller_email} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: mheDrillSeller?.seller_email === s.seller_email ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setMheDrillSeller(s)}>
                                <span style={{ color: '#E5E7EB' }}>{s.seller_name}</span>
                                <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444', fontWeight: 500 }}>{mAvg}%</span>
                              </div>
                            )
                          })}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
}
