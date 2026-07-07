const fs = require('fs');

const newKpiBlockL2 = `
      {/* KPI Grid */}
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Team Metrics</span></div>
      <div className={styles.kpiGrid}>
        {/* Leads Allotted */}
        <div className={styles.kpiTile} style={{ gridColumn: showHourlyView ? '1 / -1' : undefined, transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className={styles.kpiLabel}>Leads Allotted</div>
              <div className={\`\${styles.kpiValue} \${totalLeads > 0 ? styles.kpiValueOrange : styles.kpiValueMuted}\`}>
                {totalLeads} <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>/ {teamActual}</span>
              </div>
              <div className={styles.kpiSub}>Auto: {totalAuto} · Manual: {totalManual}</div>
            </div>
            {totalLeads > 0 && (
              <button
                onClick={() => setShowHourlyView(!showHourlyView)}
                style={{
                  background: showHourlyView ? 'rgba(244,99,30,0.15)' : 'rgba(255,255,255,0.06)',
                  border: \`1px solid \${showHourlyView ? 'rgba(244,99,30,0.4)' : 'rgba(255,255,255,0.1)'}\`,
                  color: showHourlyView ? '#F4631E' : '#6B7280',
                  borderRadius: '6px', padding: '3px 8px', fontSize: '0.6rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px', whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {showHourlyView ? '↑ hide' : '↓ hourly'}
              </button>
            )}
          </div>
          {showHourlyView && (() => {
            let cumLeads = 0;
            const hourRows = HOUR_SLOTS.map(hour => {
              const count = hourlyMap[hour] || 0;
              cumLeads += count;
              const cumPct = teamActual > 0 ? Math.min(100, Math.round((cumLeads / teamActual) * 100)) : 0;
              return { hour, count, cumLeads, cumPct };
            });
            const maxCount = Math.max(...hourRows.map(r => r.count), 1);
            return (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hourly breakdown · {teamActual > 0 ? \`Target = \${teamActual} leads\` : 'Target not set'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '4px' }}>
                  {hourRows.map(({ hour, count, cumLeads: cum, cumPct }) => {
                    const barColor = count > 0 ? '#F4631E' : 'rgba(255,255,255,0.06)';
                    const barH = count > 0 ? Math.max(6, Math.round((count / maxCount) * 52)) : 3;
                    return (
                      <div key={hour} className={styles.tooltipContainer} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', display: 'flex', height: '60px', position: 'relative' }}>
                        <div style={{ width: '100%', background: barColor, height: \`\${barH}px\`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', position: 'relative' }}>
                          {count > 0 && barH >= 12 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.5rem', fontWeight: 800, color: '#fff' }}>{count}</div>
                          )}
                        </div>
                        <div className={styles.tooltip}>
                          <div className={styles.tooltipTime}>{hour}</div>
                          <div className={styles.tooltipText}>{count} lead{count !== 1 ? 's' : ''}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: '2px' }}>Running: {cum} ({cumPct}%{teamActual > 0 ? \` of \${teamActual}\` : ''})</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {HOUR_SLOTS.map(h => {
                    const num = parseInt(h.replace(/[AP]M/, ''), 10);
                    const nextNum = num === 12 ? 1 : num + 1;
                    return (
                      <div key={h} style={{ flex: 1, fontSize: '0.42rem', color: '#4A4642', textAlign: 'center', overflow: 'hidden', lineHeight: 1.3 }}>
                        {num}–{nextNum}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* RTG Breakdown */}
        <div className={styles.kpiTile}>
          <div className={styles.kpiLabel}>RTG Breakdown</div>
          <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Count</div>
              <div className={styles.kpiValue} style={{ color: '#33C2C9' }}>
                {totalRtg}
              </div>
            </div>
            <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Percent</div>
              <div className={styles.kpiValue} style={{ color: '#F0EDE8' }}>
                {teamRtgPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Sellers No Leads */}
        <div className={styles.kpiTile} style={{ cursor: noLeadsCount > 0 ? 'pointer' : 'default' }} onClick={() => { if (noLeadsCount > 0) setShowNoLeadsModal(true); }}>
          <div className={styles.kpiLabel}>Sellers No Leads {noLeadsCount > 0 && <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span>}</div>
          <div className={\`\${styles.kpiValue} \${noLeadsCount > 0 ? styles.kpiValueRed : styles.kpiValueMuted}\`}>{noLeadsCount}</div>
        </div>

        {/* MHE Trend */}
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}>
          <div className={styles.kpiLabel}>MHE Trend <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          {(() => {
            const dayMap = {}
            enrichedMembers.forEach((m) => {
              (m.monthly_lta_logs || []).forEach((r) => {
                const d = r.log_date
                if (!d) return
                const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
                dayMap[d].sum += pct
                dayMap[d].count += 1
              })
            })
            const targetDay = date || todayStr();
            const latestAvg = dayMap[targetDay] ? parseFloat((dayMap[targetDay].sum / dayMap[targetDay].count).toFixed(1)) : 0;
            const isGood = latestAvg <= 20
            return (
              <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Current</div>
                  <div className={styles.kpiValue} style={{ color: isGood ? '#22C55E' : '#EF4444' }}>
                    {latestAvg}%
                  </div>
                </div>
                <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Target</div>
                  <div className={styles.kpiValue} style={{ color: '#22C55E' }}>
                    20%
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Goal vs SHB */}
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}>
          <div className={styles.kpiLabel}>Goal vs SHB <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          {(() => {
            const targetDay = date || todayStr();
            const dayMap = {}
            enrichedMembers.forEach((m) => {
              (m.monthly_goal_shb || []).forEach((r) => {
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
            const latestAvgGoal = dayMap[targetDay] && dayMap[targetDay].count > 0 ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0
            const latestAvgShb = dayMap[targetDay] && dayMap[targetDay].count > 0 ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0
            const goalColor = latestAvgGoal >= latestAvgShb ? '#22C55E' : (latestAvgShb - latestAvgGoal <= 10) ? '#EAB308' : '#EF4444';
            return (
              <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Goal</div>
                  <div className={styles.kpiValue} style={{ color: goalColor }}>
                    {latestAvgGoal}%
                  </div>
                </div>
                <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>SHB</div>
                  <div className={styles.kpiValue} style={{ color: '#F0EDE8' }}>
                    {latestAvgShb}%
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>\n\n`;

let l2code = fs.readFileSync('components/pages/L2SellerViewPage.tsx', 'utf8');

const l2Start = l2code.indexOf('<div className={styles.summaryStrip}');
const l2End = l2code.indexOf('{/* S1: Login & Availability */}');

if (l2Start !== -1 && l2End !== -1) {
  l2code = l2code.slice(0, l2Start) + newKpiBlockL2 + l2code.slice(l2End);

  if (!l2code.includes('const [showHourlyView, setShowHourlyView] = useState(false)')) {
    l2code = l2code.replace(
      'const [showMheTrendModal, setShowMheTrendModal] = useState(false)',
      'const [showMheTrendModal, setShowMheTrendModal] = useState(false)\n  const [showHourlyView, setShowHourlyView] = useState(false)'
    );
  }

  if (!l2code.includes('const hourlyMap = useMemo(() => {')) {
    l2code = l2code.replace(
      'const noLeadsCount = enrichedMembers.filter((m: any) => m.hasRtg && !m.isOnLeave && m.seller_leads === 0).length',
      `const noLeadsCount = enrichedMembers.filter((m: any) => m.hasRtg && !m.isOnLeave && m.seller_leads === 0).length

  const hourlyMap = useMemo(() => {
    const map = {}
    enrichedMembers.forEach((m) => {
      (m.hourly_allotment_summary || []).forEach((h) => {
        let bucket = h.hour_bucket?.toString()?.toUpperCase() || ''
        if (bucket.includes(':')) {
          const parts = extractTimeParts(bucket)
          if (parts) {
            const ampm = parts.h >= 12 ? 'PM' : 'AM'
            let h12 = parts.h % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        } else {
          const match = bucket.match(/^(\\d+)/)
          if (match) {
            const hr = parseInt(match[1], 10)
            const ampm = hr >= 12 ? 'PM' : 'AM'
            let h12 = hr % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        }
        const numLeads = (h.auto_allotted || 0) + (h.manual_allotted || 0)
        map[bucket] = (map[bucket] || 0) + numLeads
      })
    })
    return map
  }, [enrichedMembers])`
    );
  }
  fs.writeFileSync('components/pages/L2SellerViewPage.tsx', l2code);
  console.log("Patched L2");
}

const newKpiBlockL1 = `
      {/* KPI Grid */}
      <div className={styles.sectionHeader}><span className={styles.sectionTitle}>Global Metrics</span></div>
      <div className={styles.kpiGrid}>
        {/* Leads Allotted */}
        <div className={styles.kpiTile} style={{ gridColumn: showHourlyView ? '1 / -1' : undefined, transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div className={styles.kpiLabel}>Leads Allotted</div>
              <div className={\`\${styles.kpiValue} \${globalLeads > 0 ? styles.kpiValueOrange : styles.kpiValueMuted}\`}>
                {globalLeads} <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 500 }}>/ {globalFinalLta}</span>
              </div>
              <div className={styles.kpiSub}>Auto: {globalAuto} · Manual: {globalManual}</div>
            </div>
            {globalLeads > 0 && (
              <button
                onClick={() => setShowHourlyView(!showHourlyView)}
                style={{
                  background: showHourlyView ? 'rgba(244,99,30,0.15)' : 'rgba(255,255,255,0.06)',
                  border: \`1px solid \${showHourlyView ? 'rgba(244,99,30,0.4)' : 'rgba(255,255,255,0.1)'}\`,
                  color: showHourlyView ? '#F4631E' : '#6B7280',
                  borderRadius: '6px', padding: '3px 8px', fontSize: '0.6rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', marginTop: '2px', whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {showHourlyView ? '↑ hide' : '↓ hourly'}
              </button>
            )}
          </div>
          {showHourlyView && (() => {
            let cumLeads = 0;
            const hourRows = HOUR_SLOTS.map(hour => {
              const count = hourlyMap[hour] || 0;
              cumLeads += count;
              const cumPct = globalFinalLta > 0 ? Math.min(100, Math.round((cumLeads / globalFinalLta) * 100)) : 0;
              return { hour, count, cumLeads, cumPct };
            });
            const maxCount = Math.max(...hourRows.map(r => r.count), 1);
            return (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hourly breakdown · {globalFinalLta > 0 ? \`Target = \${globalFinalLta} leads\` : 'Target not set'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '4px' }}>
                  {hourRows.map(({ hour, count, cumLeads: cum, cumPct }) => {
                    const barColor = count > 0 ? '#F4631E' : 'rgba(255,255,255,0.06)';
                    const barH = count > 0 ? Math.max(6, Math.round((count / maxCount) * 52)) : 3;
                    return (
                      <div key={hour} className={styles.tooltipContainer} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', display: 'flex', height: '60px', position: 'relative' }}>
                        <div style={{ width: '100%', background: barColor, height: \`\${barH}px\`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', position: 'relative' }}>
                          {count > 0 && barH >= 12 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.5rem', fontWeight: 800, color: '#fff' }}>{count}</div>
                          )}
                        </div>
                        <div className={styles.tooltip}>
                          <div className={styles.tooltipTime}>{hour}</div>
                          <div className={styles.tooltipText}>{count} lead{count !== 1 ? 's' : ''}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: '2px' }}>Running: {cum} ({cumPct}%{globalFinalLta > 0 ? \` of \${globalFinalLta}\` : ''})</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {HOUR_SLOTS.map(h => {
                    const num = parseInt(h.replace(/[AP]M/, ''), 10);
                    const nextNum = num === 12 ? 1 : num + 1;
                    return (
                      <div key={h} style={{ flex: 1, fontSize: '0.42rem', color: '#4A4642', textAlign: 'center', overflow: 'hidden', lineHeight: 1.3 }}>
                        {num}–{nextNum}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* RTG Breakdown */}
        <div className={styles.kpiTile}>
          <div className={styles.kpiLabel}>RTG Breakdown</div>
          <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Count</div>
              <div className={styles.kpiValue} style={{ color: '#33C2C9' }}>
                {globalRtg}
              </div>
            </div>
            <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
            <div className={styles.kpiSplitSide}>
              <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Percent</div>
              <div className={styles.kpiValue} style={{ color: '#F0EDE8' }}>
                {globalRtgPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Sellers No Leads */}
        <div className={styles.kpiTile} style={{ cursor: globalNoLeads > 0 ? 'pointer' : 'default' }} onClick={() => { if (globalNoLeads > 0) setShowNoLeadsModal(true); }}>
          <div className={styles.kpiLabel}>Sellers No Leads {globalNoLeads > 0 && <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span>}</div>
          <div className={\`\${styles.kpiValue} \${globalNoLeads > 0 ? styles.kpiValueRed : styles.kpiValueMuted}\`}>{globalNoLeads}</div>
        </div>

        {/* MHE Trend */}
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => { setMheDrillSeller(null); setMheExpandedTl(null); setShowMheTrendModal(true); }}>
          <div className={styles.kpiLabel}>MHE Trend <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          {(() => {
            const dayMap = {}
            allMembers.forEach((m) => {
              (m.monthly_lta_rows || []).forEach((r) => {
                const d = r.log_date
                if (!d) return
                const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
                dayMap[d].sum += pct
                dayMap[d].count += 1
              })
            })
            const targetDay = date || todayStr();
            const latestAvg = dayMap[targetDay] ? parseFloat((dayMap[targetDay].sum / dayMap[targetDay].count).toFixed(1)) : 0;
            const isGood = latestAvg <= 20
            return (
              <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Current</div>
                  <div className={styles.kpiValue} style={{ color: isGood ? '#22C55E' : '#EF4444' }}>
                    {latestAvg}%
                  </div>
                </div>
                <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Target</div>
                  <div className={styles.kpiValue} style={{ color: '#22C55E' }}>
                    20%
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Goal vs SHB */}
        <div className={styles.kpiTile} style={{ cursor: 'pointer' }} onClick={() => { setGoalShbDrillSeller(null); setGoalShbExpandedTl(null); setShowGoalShbTrendModal(true); }}>
          <div className={styles.kpiLabel}>Goal vs SHB <span style={{ textTransform: 'none', fontStyle: 'italic', fontWeight: 400, color: '#6B7280' }}>· tap</span></div>
          {(() => {
            const targetDay = date || todayStr();
            const dayMap = {}
            allMembers.forEach((m) => {
              (m.monthly_goal_shb || []).forEach((r) => {
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
            const latestAvgGoal = dayMap[targetDay] && dayMap[targetDay].count > 0 ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0
            const latestAvgShb = dayMap[targetDay] && dayMap[targetDay].count > 0 ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0
            const goalColor = latestAvgGoal >= latestAvgShb ? '#22C55E' : (latestAvgShb - latestAvgGoal <= 10) ? '#EAB308' : '#EF4444';
            return (
              <div className={styles.kpiSplitFlex} style={{ marginTop: '2px' }}>
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>Goal</div>
                  <div className={styles.kpiValue} style={{ color: goalColor }}>
                    {latestAvgGoal}%
                  </div>
                </div>
                <div className={styles.kpiSplitDivider} style={{ margin: '8px 0' }} />
                <div className={styles.kpiSplitSide}>
                  <div style={{ fontSize: '0.65rem', color: '#6B7280', marginBottom: '2px' }}>SHB</div>
                  <div className={styles.kpiValue} style={{ color: '#F0EDE8' }}>
                    {latestAvgShb}%
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>\n\n`;

let l1code = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
const l1Start = l1code.indexOf('<div className={styles.summaryStrip}');
const l1End = l1code.indexOf('{/* S1: Login & Availability */}');

if (l1Start !== -1 && l1End !== -1) {
  l1code = l1code.slice(0, l1Start) + newKpiBlockL1 + l1code.slice(l1End);
  
  if (!l1code.includes('const [showHourlyView, setShowHourlyView] = useState(false)')) {
    l1code = l1code.replace(
      'const [showMheTrendModal, setShowMheTrendModal] = useState(false)',
      'const [showMheTrendModal, setShowMheTrendModal] = useState(false)\n  const [showHourlyView, setShowHourlyView] = useState(false)'
    );
  }

  if (!l1code.includes('const hourlyMap = useMemo(() => {')) {
    l1code = l1code.replace(
      'const globalNoLeads = allMembers.filter((m: any) => m.hasRtg && !m.isOnLeave && m.seller_leads === 0).length',
      `const globalNoLeads = allMembers.filter((m: any) => m.hasRtg && !m.isOnLeave && m.seller_leads === 0).length

  const hourlyMap = useMemo(() => {
    const map = {}
    allMembers.forEach((m) => {
      (m.hourly_allotment_summary || []).forEach((h) => {
        let bucket = h.hour_bucket?.toString()?.toUpperCase() || ''
        if (bucket.includes(':')) {
          const parts = extractTimeParts(bucket)
          if (parts) {
            const ampm = parts.h >= 12 ? 'PM' : 'AM'
            let h12 = parts.h % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        } else {
          const match = bucket.match(/^(\\d+)/)
          if (match) {
            const hr = parseInt(match[1], 10)
            const ampm = hr >= 12 ? 'PM' : 'AM'
            let h12 = hr % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        }
        const numLeads = (h.auto_allotted || 0) + (h.manual_allotted || 0)
        map[bucket] = (map[bucket] || 0) + numLeads
      })
    })
    return map
  }, [allMembers])`
    );
  }
  fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1code);
  console.log("Patched L1");
}
