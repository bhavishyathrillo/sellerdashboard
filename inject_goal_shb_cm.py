import re

filepath = 'components/pages/L1SellerViewPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert GoalShbTrendChart below MheTrendChart
goal_shb_chart_code = """
function GoalShbTrendChart({ labels, goalValues, shbValues }: { labels: string[]; goalValues: number[]; shbValues: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      
      const maxDataVal = Math.max(...goalValues, ...shbValues, 0)
      const yMax = Math.max(20, Math.ceil((maxDataVal + 5) / 10) * 10)

      instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              type: 'line',
              label: 'SHB %',
              data: shbValues,
              borderColor: '#EAB308',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              borderWidth: 2,
              fill: false,
              tension: 0.3,
              pointBackgroundColor: '#EAB308',
              pointRadius: 4,
              yAxisID: 'y'
            },
            {
              type: 'bar',
              label: 'Goal %',
              data: goalValues,
              backgroundColor: '#3B82F6',
              borderRadius: 4,
              barPercentage: 0.6,
              maxBarThickness: 32,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, labels: { color: '#8A8278' } },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`
              }
            }
          },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: {
              max: yMax,
              beginAtZero: true,
              ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => `${v}%` },
              grid: { color: 'rgba(255,255,255,0.06)' },
            }
          }
        }
      })
    })
    return () => {
      active = false
      if (instance) instance.destroy()
    }
  }, [labels, goalValues, shbValues])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
"""
content = re.sub(r'(function MheTrendChart.*?\n}\n)', r'\1' + goal_shb_chart_code, content, flags=re.DOTALL)

# 2. Insert state variables
state_vars = """  const [showGoalShbTrendModal, setShowGoalShbTrendModal] = useState(false)
  const [goalShbDrillSeller, setGoalShbDrillSeller] = useState<any>(null)
  const [goalShbExpandedTl, setGoalShbExpandedTl] = useState<string | null>(null)
"""
content = content.replace("const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)\n", 
                          "const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)\n" + state_vars)


# 3. Insert Goal vs SHB KPI Card
kpi_card_code = """
        {/* CM Goal vs SHB KPI Card */}
        {(() => {
          const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
          let allMembers: any[] = []
          processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })
          allMembers.forEach((m: any) => {
            ;(m.monthly_goal_shb || []).forEach((r: any) => {
              const d = r.date
              if (!d) return
              const goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
              const shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
              if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
              dayMap[d].goalSum += goalPct
              dayMap[d].shbSum += shbPct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          let latestDay = sortedDays[sortedDays.length - 1]
          if (date && dayMap[date]) {
            latestDay = date
          }
          
          const latestAvgGoal = latestDay ? parseFloat((dayMap[latestDay].goalSum / dayMap[latestDay].count).toFixed(0)) : 0
          const latestAvgShb = latestDay ? parseFloat((dayMap[latestDay].shbSum / dayMap[latestDay].count).toFixed(0)) : 0

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid #333`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); setShowGoalShbTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3B82F6' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Team Goal vs SHB</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Goal</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )
        })()}
"""
content = re.sub(r'(<span style={{ fontSize: \'0.6rem\', color: \'#555\', marginLeft: \'auto\' }}>tap to view ▶</span>\n.*?</div>\n.*?</div>\n.*?)\{/\* ═══════════════ MODALS ═══════════════ \*/\}', r'\1' + kpi_card_code + r'              {/* ═══════════════ MODALS ═══════════════ */}', content, flags=re.DOTALL)

# 4. Insert Modal
modal_code = """
              {/* CM Goal vs SHB Trend Modal */}
              {showGoalShbTrendModal && (() => {
                const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
                let allMembers: any[] = []
                processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })
                
                allMembers.forEach((m: any) => {
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
                const paddedTeamAvg: any[] = []
                const [y, mStr] = (date || todayStr()).split('-')
                const daysInMonth = new Date(parseInt(y), parseInt(mStr), 0).getDate()
                
                for (let i = 1; i <= daysInMonth; i++) {
                  const dStr = `${y}-${mStr}-${String(i).padStart(2, '0')}`
                  if (dayMap[dStr]) {
                    paddedTeamAvg.push({
                      date: dStr,
                      goalAvg: parseFloat((dayMap[dStr].goalSum / dayMap[dStr].count).toFixed(0)),
                      shbAvg: parseFloat((dayMap[dStr].shbSum / dayMap[dStr].count).toFixed(0))
                    })
                  } else {
                    paddedTeamAvg.push({ date: dStr, goalAvg: 0, shbAvg: 0 })
                  }
                }

                let drillLogs: any[] = []
                if (goalShbDrillSeller) {
                  const logs = goalShbDrillSeller.monthly_goal_shb || []
                  for (let i = 1; i <= daysInMonth; i++) {
                    const dStr = `${y}-${mStr}-${String(i).padStart(2, '0')}`
                    const existing = logs.find((r: any) => r.date === dStr)
                    drillLogs.push({
                      date: dStr,
                      goalAvg: existing && typeof existing.goal_completion === 'number' ? existing.goal_completion * 100 : 0,
                      shbAvg: existing && typeof existing.shb_percent === 'number' ? existing.shb_percent * 100 : 0
                    })
                  }
                }

                const activeData = goalShbDrillSeller ? drillLogs : paddedTeamAvg
                const activeLabels = activeData.map((d: any) => parseInt(d.date.split('-')[2]) + ' ' + new Date(d.date).toLocaleString('default', { month: 'short' }))
                const activeGoalValues = activeData.map((d: any) => d.goalAvg)
                const activeShbValues = activeData.map((d: any) => d.shbAvg)
                const hasData = activeGoalValues.some((v: number) => v > 0) || activeShbValues.some((v: number) => v > 0)

                return (
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowGoalShbTrendModal(false); setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); }}>
                    <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '900px', maxWidth: '95%', height: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      
                      <button
                        onClick={() => { setShowGoalShbTrendModal(false); setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); }}
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
                           ? `${goalShbDrillSeller.seller_name} — Goal vs SHB Trend` 
                           : goalShbExpandedTl 
                              ? `${processedGroups.find((g: any) => g.l2_email === goalShbExpandedTl)?.l2_name || 'Team'} — Goal vs SHB Trend` 
                              : 'Monthly Goal vs SHB Trend · CM Avg'}
                      </h2>

                      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
                        <div style={{ flex: 2, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '16px', border: '1px solid #222' }}>
                          {hasData ? (
                            <GoalShbTrendChart labels={activeLabels} goalValues={activeGoalValues} shbValues={activeShbValues} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No Goal vs SHB data for this month yet.</div>
                          )}
                        </div>
                        
                        {!goalShbDrillSeller && (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333', paddingLeft: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#E5E5E5' }}>Team Drill-down</h3>
                            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                              {processedGroups.map((g: any) => {
                                let gGoalSum = 0; let gShbSum = 0; let gDays = 0;
                                g.members.forEach((m: any) => {
                                  ;(m.monthly_goal_shb || []).forEach((r: any) => {
                                    gGoalSum += (r.goal_completion || 0) * 100
                                    gShbSum += (r.shb_percent || 0) * 100
                                    gDays++
                                  })
                                })
                                const gGoalAvg = gDays > 0 ? parseFloat((gGoalSum / gDays).toFixed(0)) : 0
                                const gShbAvg = gDays > 0 ? parseFloat((gShbSum / gDays).toFixed(0)) : 0
                                
                                return (
                                  <React.Fragment key={g.l2_email}>
                                    <div 
                                      onClick={() => setGoalShbExpandedTl(goalShbExpandedTl === g.l2_email ? null : g.l2_email)}
                                      style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#E5E5E5', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '4px' }}
                                    >
                                      <span style={{ fontWeight: 600, color: '#EAB308' }}>{goalShbExpandedTl === g.l2_email ? '▼' : '▶'} {g.l2_name}</span>
                                      <div style={{ display: 'flex', gap: '12px' }}>
                                         <span style={{ color: '#3B82F6' }}>{gGoalAvg}%</span>
                                         <span style={{ color: '#EAB308' }}>{gShbAvg}%</span>
                                      </div>
                                    </div>
                                    
                                    {goalShbExpandedTl === g.l2_email && g.members.map((m: any) => {
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
                                          onClick={() => setGoalShbDrillSeller(m)} 
                                          style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 24px', cursor: 'pointer', fontSize: '0.8rem', color: '#E5E5E5', borderLeft: '1px solid #333', marginLeft: '6px' }}
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
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
"""

content = re.sub(r'(<div style={{ display: \'flex\', alignItems: \'center\', justifyContent: \'center\', height: \'100%\', color: \'#555\', fontSize: \'0.85rem\', fontStyle: \'italic\' }}>No MHE trend data for this month yet.</div>\n.*?</div>\n.*?</div>\n.*?</div>\n.*?</div>\n.*?)\{\/\* ═══════════════ TABLES ═══════════════ \*\/\}', r'\1' + modal_code + r'              {/* ═══════════════ TABLES ═══════════════ */}', content, flags=re.DOTALL)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
