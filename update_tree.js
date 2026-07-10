const fs = require('fs');
let code = fs.readFileSync('components/pages/AdminLTAPage.tsx', 'utf8');

const mheModalCode = `
              {/* MHE Modal */}
              {showMheModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowMheModal(false); setMheDrillSeller(null); setBreakdownExpandedTl(null); setMheExpandedCm(null); }}>
                  <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: mheDrillSeller ? '600px' : '900px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setShowMheModal(false); setMheDrillSeller(null); setBreakdownExpandedTl(null); setMheExpandedCm(null); }}
                      style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                    >×</button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      {mheDrillSeller && (
                        <button
                          onClick={() => setMheDrillSeller(null)}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#E5E5E5', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >← Back</button>
                      )}
                      <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>
                        {mheDrillSeller 
                           ? \`\${mheDrillSeller.seller_name} — MHE Trend\` 
                           : breakdownExpandedTl 
                              ? \`\${hierarchy.find((c: any) => c.category_name === mheExpandedCm)?.tls.find((t: any) => t.tl_email === breakdownExpandedTl)?.tl_name || 'Team'} — MHE Trend\` 
                              : mheExpandedCm
                                ? \`\${mheExpandedCm} — MHE Trend\`
                                : 'Monthly MHE Trend · Org Avg'}
                      </h3>
                    </div>

                    {(() => {
                      const dayMap: Record<string, { sum: number; count: number }> = {}
                      let activeSellers: any[] = []

                      if (mheDrillSeller) {
                        activeSellers = [mheDrillSeller]
                      } else if (breakdownExpandedTl && mheExpandedCm) {
                        const targetCm = hierarchy.find((c: any) => c.category_name === mheExpandedCm)
                        const targetTl = targetCm?.tls.find((t: any) => t.tl_email === breakdownExpandedTl)
                        activeSellers = targetTl?.sellers || []
                      } else if (mheExpandedCm) {
                        const targetCm = hierarchy.find((c: any) => c.category_name === mheExpandedCm)
                        activeSellers = targetCm?.tls.flatMap((t: any) => t.sellers) || []
                      } else {
                        activeSellers = allSellers
                      }

                      activeSellers.forEach((m: any) => {
                        ; (m.monthly_lta_rows || []).forEach((r: any) => {
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
                        const dt = new Date(d);
                        return \`\${dt.getDate()} \${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()]}\`;
                      })
                      const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))

                      const mheAvg = sortedDays.length > 0 ? parseFloat((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0
                      const isGood = mheAvg <= 20

                      return (
                        <div style={{ display: 'flex', gap: '24px', flexDirection: mheDrillSeller ? 'column' : 'row' }}>
                          <div style={{ flex: 1, minWidth: '400px' }}>
                            <div style={{ height: '240px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #333' }}>
                              {values.length > 0 ? (
                                <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No MHE data available for this month.</div>
                              )}
                            </div>
                          </div>
                          {!mheDrillSeller && (
                            <div style={{ width: '300px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>Team Drill-down</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                                {hierarchy.map((c: any) => {
                                  const cMheMap: Record<string, { s: number; c: number }> = {}
                                  c.tls.flatMap((t: any) => t.sellers).forEach((m: any) => {
                                    ; (m.monthly_lta_rows || []).forEach((r: any) => {
                                      const d = r.log_date; if (!d) return;
                                      if (!cMheMap[d]) cMheMap[d] = { s: 0, c: 0 };
                                      cMheMap[d].s += typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0
                                      cMheMap[d].c += 1
                                    })
                                  })
                                  let cSum = 0; let cDays = 0;
                                  Object.values(cMheMap).forEach(v => { cSum += v.s / v.c; cDays++; })
                                  const cAvg = cDays > 0 ? parseFloat((cSum / cDays).toFixed(1)) : 0

                                  return (
                                    <React.Fragment key={c.category_name}>
                                      <div onClick={() => { setMheExpandedCm(mheExpandedCm === c.category_name ? null : c.category_name); setBreakdownExpandedTl(null); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#E5E5E5' }}>
                                        <span><span style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', transform: mheExpandedCm === c.category_name ? 'rotate(90deg)' : 'none' }}>▶</span> {c.category_name}</span>
                                        <span style={{ color: cAvg <= 20 ? '#22C55E' : '#EF4444' }}>{cAvg}%</span>
                                      </div>
                                      
                                      {mheExpandedCm === c.category_name && c.tls.map((t: any) => {
                                        const tMheMap: Record<string, { s: number; c: number }> = {}
                                        t.sellers.forEach((m: any) => {
                                          ; (m.monthly_lta_rows || []).forEach((r: any) => {
                                            const d = r.log_date; if (!d) return;
                                            if (!tMheMap[d]) tMheMap[d] = { s: 0, c: 0 };
                                            tMheMap[d].s += typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0
                                            tMheMap[d].c += 1
                                          })
                                        })
                                        let tSum = 0; let tDays = 0;
                                        Object.values(tMheMap).forEach(v => { tSum += v.s / v.c; tDays++; })
                                        const tAvg = tDays > 0 ? parseFloat((tSum / tDays).toFixed(1)) : 0

                                        return (
                                          <React.Fragment key={t.tl_email}>
                                            <div onClick={(e) => { e.stopPropagation(); setBreakdownExpandedTl(breakdownExpandedTl === t.tl_email ? null : t.tl_email); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#C9A84C', borderLeft: '1px solid #333', marginLeft: '6px' }}>
                                              <span><span style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', transform: breakdownExpandedTl === t.tl_email ? 'rotate(90deg)' : 'none' }}>▶</span> {t.tl_name}</span>
                                              <span style={{ color: tAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tAvg}%</span>
                                            </div>
                                            
                                            {breakdownExpandedTl === t.tl_email && t.sellers.map((m: any) => {
                                              let mSum = 0; let mDays = 0;
                                              ; (m.monthly_lta_rows || []).forEach((r: any) => {
                                                if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++; }
                                              })
                                              const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0
                                              return (
                                                <div key={m.seller_email} onClick={(e) => { e.stopPropagation(); setMheDrillSeller(m); }} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 32px', cursor: 'pointer', fontSize: '0.8rem', color: '#E5E5E5', borderLeft: '1px solid #333', marginLeft: '20px' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                  <span>{m.seller_name}</span>
                                                  <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444' }}>{\`\${mAvg}%\`}</span>
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
                      )
                    })()}
                  </div>
                </div>
              )}
`;

const goalModalCode = `
              {/* Goal vs SHB Modal */}
              {showGoalModal && (() => {
                const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
                let activeSellers: any[] = []

                if (goalShbDrillSeller) {
                  activeSellers = [goalShbDrillSeller]
                } else if (goalShbExpandedTl && goalShbExpandedCm) {
                  const targetCm = hierarchy.find((c: any) => c.category_name === goalShbExpandedCm)
                  const targetTl = targetCm?.tls.find((t: any) => t.tl_email === goalShbExpandedTl)
                  activeSellers = targetTl?.sellers || []
                } else if (goalShbExpandedCm) {
                  const targetCm = hierarchy.find((c: any) => c.category_name === goalShbExpandedCm)
                  activeSellers = targetCm?.tls.flatMap((t: any) => t.sellers) || []
                } else {
                  activeSellers = allSellers
                }
                
                activeSellers.forEach((m: any) => {
                  ;(m.monthly_goal_shb || []).forEach((r: any) => {
                    const d = r.date
                    if (!d) return
                    const goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
                    const shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
                    if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
                    dayMap[d].goalSum += goalPct; dayMap[d].shbSum += shbPct; dayMap[d].count += 1
                  })
                })
                
                const sortedDays = Object.keys(dayMap).sort()
                const labels = sortedDays.map(d => parseInt(d.split('-')[2]) + ' ' + new Date(d).toLocaleString('default', { month: 'short' }))
                const goalValues = sortedDays.map(d => parseFloat((dayMap[d].goalSum / dayMap[d].count).toFixed(0)))
                const shbValues = sortedDays.map(d => parseFloat((dayMap[d].shbSum / dayMap[d].count).toFixed(0)))
                const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)

                return (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowGoalModal(false); setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); setGoalShbExpandedCm(null); }}>
                    <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '900px', maxWidth: '95%', height: '600px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      
                      <button
                        onClick={() => { setShowGoalModal(false); setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); setGoalShbExpandedCm(null); }}
                        style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', zIndex: 10 }}
                      >×</button>

                      <h2 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {goalShbDrillSeller && (
                          <button
                            onClick={() => setGoalShbDrillSeller(null)}
                            style={{ background: 'transparent', border: '1px solid #333', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8278', cursor: 'pointer' }}
                          >←</button>
                        )}
                        {goalShbDrillSeller 
                           ? \`\${goalShbDrillSeller.seller_name} — Goal vs SHB Trend\` 
                           : goalShbExpandedTl 
                              ? \`\${hierarchy.find((c: any) => c.category_name === goalShbExpandedCm)?.tls.find((t: any) => t.tl_email === goalShbExpandedTl)?.tl_name || 'Team'} — Goal vs SHB Trend\` 
                              : goalShbExpandedCm
                                ? \`\${goalShbExpandedCm} — Goal vs SHB Trend\`
                                : 'Monthly Goal vs SHB Trend · Org Avg'}
                      </h2>

                      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                        <div style={{ flex: 2, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
                          {hasData ? (
                            <GoalShbTrendChart labels={labels} goalValues={goalValues} shbValues={shbValues} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No Goal vs SHB data for this month yet.</div>
                          )}
                        </div>
                        
                        {!goalShbDrillSeller && (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333', paddingLeft: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#E5E5E5' }}>Team Drill-down</h3>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                              {hierarchy.map((c: any) => {
                                let cGoalSum = 0; let cShbSum = 0; let cDays = 0;
                                c.tls.flatMap((t: any) => t.sellers).forEach((m: any) => {
                                  ;(m.monthly_goal_shb || []).forEach((r: any) => {
                                    cGoalSum += (r.goal_completion || 0) * 100
                                    cShbSum += (r.shb_percent || 0) * 100
                                    cDays++
                                  })
                                })
                                const cGoalAvg = cDays > 0 ? parseFloat((cGoalSum / cDays).toFixed(0)) : 0
                                const cShbAvg = cDays > 0 ? parseFloat((cShbSum / cDays).toFixed(0)) : 0
                                
                                return (
                                  <React.Fragment key={c.category_name}>
                                    <div 
                                      onClick={() => { setGoalShbExpandedCm(goalShbExpandedCm === c.category_name ? null : c.category_name); setGoalShbExpandedTl(null); }}
                                      style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#E5E5E5', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', marginBottom: '4px' }}
                                    >
                                      <span style={{ fontWeight: 600, color: '#E5E5E5' }}>{goalShbExpandedCm === c.category_name ? '▼' : '▶'} {c.category_name}</span>
                                      <div style={{ display: 'flex', gap: '12px' }}>
                                         <span style={{ color: '#3B82F6' }}>{cGoalAvg}%</span>
                                         <span style={{ color: '#EAB308' }}>{cShbAvg}%</span>
                                      </div>
                                    </div>
                                    
                                    {goalShbExpandedCm === c.category_name && c.tls.map((t: any) => {
                                      let tGoalSum = 0; let tShbSum = 0; let tDays = 0;
                                      t.sellers.forEach((m: any) => {
                                        ;(m.monthly_goal_shb || []).forEach((r: any) => {
                                          tGoalSum += (r.goal_completion || 0) * 100
                                          tShbSum += (r.shb_percent || 0) * 100
                                          tDays++
                                        })
                                      })
                                      const tGoalAvg = tDays > 0 ? parseFloat((tGoalSum / tDays).toFixed(0)) : 0
                                      const tShbAvg = tDays > 0 ? parseFloat((tShbSum / tDays).toFixed(0)) : 0

                                      return (
                                        <React.Fragment key={t.tl_email}>
                                          <div 
                                            onClick={(e) => { e.stopPropagation(); setGoalShbExpandedTl(goalShbExpandedTl === t.tl_email ? null : t.tl_email); }}
                                            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 20px', cursor: 'pointer', fontSize: '0.8rem', color: '#C9A84C', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', marginBottom: '4px', borderLeft: '1px solid #333', marginLeft: '6px' }}
                                          >
                                            <span style={{ fontWeight: 600 }}>{goalShbExpandedTl === t.tl_email ? '▼' : '▶'} {t.tl_name}</span>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                              <span style={{ color: '#3B82F6' }}>{tGoalAvg}%</span>
                                              <span style={{ color: '#EAB308' }}>{tShbAvg}%</span>
                                            </div>
                                          </div>

                                          {goalShbExpandedTl === t.tl_email && t.sellers.map((m: any) => {
                                            let mGoalSum = 0; let mShbSum = 0; let mDays = 0;
                                            ;(m.monthly_goal_shb || []).forEach((r: any) => {
                                              mGoalSum += (r.goal_completion || 0) * 100
                                              mShbSum += (r.shb_percent || 0) * 100
                                              mDays++
                                            })
                                            const mGoalAvg = mDays > 0 ? parseFloat((mGoalSum / mDays).toFixed(0)) : 0
                                            const mShbAvg = mDays > 0 ? parseFloat((mShbSum / mDays).toFixed(0)) : 0
                                            
                                            return (
                                              <div 
                                                key={m.seller_email} 
                                                onClick={(e) => { e.stopPropagation(); setGoalShbDrillSeller(m); }} 
                                                style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 32px', cursor: 'pointer', fontSize: '0.8rem', color: '#E5E5E5', borderLeft: '1px solid #333', marginLeft: '20px' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                              >
                                                <span>{m.seller_name}</span>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                  <span style={{ color: '#3B82F6' }}>{mGoalAvg}%</span>
                                                  <span style={{ color: '#EAB308' }}>{mShbAvg}%</span>
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
              })()}
`;

code = code.replace(/\{\/\* MHE Modal \*\/\}[\s\S]*?\{\/\* Goal vs SHB Modal \*\/\}[\s\S]*?<\/>/, mheModalCode + '\n' + goalModalCode + '\n            </>');

fs.writeFileSync('components/pages/AdminLTAPage.tsx', code);
console.log('Successfully updated Modals to 3-level tree!');
