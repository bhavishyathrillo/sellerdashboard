const fs = require('fs');

let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

// 1. Fix S1: Remove the extra dash column
l1 = l1.replace(/<td>\{m\.isAbsent \? '—' : \`\$\{m\.b\.totalMinutes\}m\`\}<\/td>[\s\n]*<td>—<\/td>/g, "<td>{m.isAbsent ? '—' : `${m.b.totalMinutes}m`}</td>");

// 2. Add useRef and import Chart.js dynamically
if (!l1.includes('useRef')) {
    l1 = l1.replace(/import React, \{ useState, useEffect \} from 'react'/, "import React, { useState, useEffect, useRef } from 'react'");
}

// 3. Add MheTrendChart
const mheTrendChartCode = `// ── MHE Trend Chart (Chart.js line) ─────────────────────────────────────────
function MheTrendChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
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
      instance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'MHE %',
            data: values,
            borderColor: color,
            backgroundColor: \`\${color}18\`,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => \` \${ctx.parsed.y}% MHE\` } } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { max: 100, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => \`\${v}%\` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels.join(','), values.join(','), color])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
`;
if (!l1.includes('function MheTrendChart')) {
    l1 = l1.replace(/export default function L1SellerViewPage/, mheTrendChartCode + '\nexport default function L1SellerViewPage');
}

// 4. Add Modals States
const stateAdditions = `
  // Modals and drill-downs
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [showMheTrendModal, setShowMheTrendModal] = useState(false)
  const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)
  
  const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)
  const [breakdownDrillSeller, setBreakdownDrillSeller] = useState<any>(null)
  const [breakdownExpandedTl, setBreakdownExpandedTl] = useState<string | null>(null)

  const [drillSellerS7, setDrillSellerS7] = useState<any>(null)
  const [showTeamFunnel, setShowTeamFunnel] = useState(false)
  const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)
`;
if (!l1.includes('showNoLeadsModal')) {
    l1 = l1.replace(/const \[expandedTlS10, setExpandedTlS10\] = useState<string \| null>\(null\)/, `const [expandedTlS10, setExpandedTlS10] = useState<string | null>(null)\n${stateAdditions}`);
}

// 5. Add Breakdown Variables after globalNoLeads
const breakdownAggs = `
  // ── CM Monthly Breakdown Aggregation ──
  // Monthly allotment aggregation
  let allMembers: any[] = []
  processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })

  const cmMonthlySum = (key: string) => allMembers.reduce((sum: number, m: any) => {
    return sum + (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
  }, 0)

  const cmMonthlyTotalLeads = cmMonthlySum('total_leads_allotted')
  const cmMonthlyAutoAllotted = cmMonthlySum('auto_allotted')
  const cmMonthlyManualAllotted = cmMonthlySum('manual_allotted')
  const cmMonthlyRtgLeads = cmMonthlySum('rtg_leads')
  const cmMonthlyNonRtgLeads = cmMonthlySum('non_rtg_leads')
  const cmMonthlyPax1 = cmMonthlySum('pax_1')
  const cmMonthlyPax2 = cmMonthlySum('pax_2')
  const cmMonthlyPax3 = cmMonthlySum('pax_3')
  const cmMonthlyPax4 = cmMonthlySum('pax_4')
  const cmMonthlyPax4Plus = cmMonthlySum('pax_4_plus')
  const cmMonthlyTotalPax = cmMonthlyPax1 + cmMonthlyPax2 + cmMonthlyPax3 + cmMonthlyPax4 + cmMonthlyPax4Plus

  const cmAllotmentRows = [
    { label: 'Auto Allotted', value: cmMonthlyAutoAllotted, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: cmMonthlyManualAllotted, color: '#9CA3AF' },
    { label: 'RTG Leads', value: cmMonthlyRtgLeads, color: '#F4631E' },
    { label: 'Non-RTG', value: cmMonthlyNonRtgLeads, color: '#4B5563' },
  ]

  const cmPaxRows = [
    { label: '1-pax', value: cmMonthlyPax1, color: '#F3F4F6' },
    { label: '2-pax', value: cmMonthlyPax2, color: '#E5E7EB' },
    { label: '3-pax', value: cmMonthlyPax3, color: '#D1D5DB' },
    { label: '4-pax', value: cmMonthlyPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: cmMonthlyPax4Plus, color: '#6B7280' },
  ]

  const dotMonthsConfig = [
    { label: 'July', key: '07' },
    { label: 'August', key: '08' },
    { label: 'Sept', key: '09' },
    { label: 'Oct', key: '10' },
    { label: 'Nov', key: '11' },
    { label: 'Dec', key: '12' }
  ];
  
  const cmDotMap: Record<string, number> = {}
  allMembers.forEach((m: any) => {
    ;(m.dot_rows || []).forEach((row: any) => {
      cmDotMap[row.dot_month] = (cmDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
    })
  })

  const cmDotChartData: { label: string; value: number; color: string }[] = []
  dotMonthsConfig.forEach(mo => {
    let val = 0;
    Object.entries(cmDotMap).forEach(([k, v]) => {
      if (k.endsWith('-' + mo.key)) val += v;
    });
    cmDotChartData.push({ label: mo.label, value: val, color: '#F4631E' })
  });

  let futureSum = 0
  Object.entries(cmDotMap).forEach(([k, v]) => {
    const isMainMonth = dotMonthsConfig.some(mo => k.endsWith('-' + mo.key));
    if (!isMainMonth) futureSum += v;
  });
  cmDotChartData.push({ label: '6+ Months', value: futureSum, color: '#5A5650' })
  
  const maxCmDotValue = Math.max(...cmDotChartData.map(d => d.value), 1)
  
  const currentMonthIndex = new Date().getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthStr = \`\${monthNames[currentMonthIndex]} \${new Date().getFullYear()}\`
`;
if (!l1.includes('cmMonthlyTotalLeads')) {
    l1 = l1.replace(/const globalNoLeads = [^\n]+\n/, `$&${breakdownAggs}\n`);
}

// 6. Update the No Leads KPI and Add MHE Trend
const newSummarySection = `
        <div 
          className={styles.summaryCard} 
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: globalNoLeads > 0 ? 'pointer' : 'default' }}
          onClick={() => {
            if (globalNoLeads > 0) setShowNoLeadsModal(true);
          }}
        >
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>{globalNoLeads}</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Sellers with no leads yet</p>
        </div>

        {/* Monthly MHE Trend KPI Card */}
        {(() => {
          const dayMap: Record<string, { sum: number; count: number }> = {}
          let allMembers: any[] = []
          processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })
          allMembers.forEach((m: any) => {
            ;(m.monthly_lta_logs || []).forEach((r: any) => {
              const d = r.log_date
              if (!d) return
              const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
              if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
              dayMap[d].sum += pct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          const cmAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const latestDay = sortedDays[sortedDays.length - 1]
          const latestAvg = latestDay ? parseFloat((dayMap[latestDay].sum / dayMap[latestDay].count).toFixed(1)) : 0
          const isGood = cmAvgMhePct <= 20

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: \`1px solid \${isGood ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}\`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isGood ? '#22C55E' : '#EF4444' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Monthly MHE Trend</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{cmAvgMhePct}%</span>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>CM avg</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Latest day: </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: latestAvg <= 20 ? '#22C55E' : '#EF4444' }}>{latestAvg}%</span>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )
        })()}
`;
// Replace the old no-leads card with the clickable one + MHE
if (!l1.includes('Monthly MHE Trend KPI Card')) {
    l1 = l1.replace(
        /<div className=\{styles\.summaryCard\} style=\{\{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: globalNoLeads > 0 \? 'pointer' : 'default' \}\}>[\s\S]*?<\/div>/,
        newSummarySection
    );
}

// 7. Add 3 cards section
const threeCardsSection = `
      {/* ═══════════════ 3 CARDS: DOT | ALLOTMENT | PAX ═══════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', marginBottom: '16px' }}>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: '#F4631E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Breakdown · {monthStr}</span>
        <span style={{ fontSize: '0.7rem', color: '#8A8278' }}>CM Combined</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => {setActiveBreakdownCard(activeBreakdownCard === 'dot' ? null : 'dot'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null);}}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cmDotChartData.map((bar, i) => {
              const totalDOT = cmDotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = totalDOT > 0 ? Math.round((bar.value / totalDOT) * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '52px', fontSize: '0.6rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                  <div style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: \`\${(bar.value / maxCmDotValue) * 100}%\`,
                      height: '100%',
                      background: \`linear-gradient(90deg, \${bar.color}40, \${bar.color}90)\`,
                      borderRadius: '6px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      minWidth: bar.value > 0 ? '4px' : '0',
                    }} />
                  </div>
                  <div style={{ width: '30px', fontSize: '0.7rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 600, color: bar.value > 0 ? bar.color : '#5A5650',
                    background: bar.value > 0 ? \`\${bar.color}15\` : 'rgba(255,255,255,0.03)',
                    padding: '2px 8px', borderRadius: '100px', minWidth: '38px', textAlign: 'center',
                  }}>
                    {barPct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Allotment Breakdown ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => {setActiveBreakdownCard(activeBreakdownCard === 'allotment' ? null : 'allotment'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null);}}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cmAllotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: \`\${item.color}15\`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {cmMonthlyTotalLeads > 0 ? Math.round((item.value / cmMonthlyTotalLeads) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => {setActiveBreakdownCard(activeBreakdownCard === 'pax' ? null : 'pax'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null);}}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cmPaxRows.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{p.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.value > 0 ? p.color : '#5A5650' }}>{p.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: p.color,
                  background: \`\${p.color}15\`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {cmMonthlyTotalPax > 0 ? Math.round((p.value / cmMonthlyTotalPax) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
`;
if (!l1.includes('3 CARDS: DOT')) {
    l1 = l1.replace(/(<div className=\{styles\.sectionHeaderCollapsible\} onClick=\{.*'s1'\)}>)/, `${threeCardsSection}\n      $1`);
}

// 8. Fix S6 DOT Distribution columns
if (!l1.includes('dotMonthsConfig.map')) {
    l1 = l1.replace(
        /\{expandedTlS6 === g\.l2_email && g\.members\.map\(\(m: any\) => \{[\s\n]*const sellerDot: Record<string, number> = \{\}[\s\n]*;\(m\.dot_rows \|\| \[\]\)\.forEach\(\(d: any\) => \{[\s\n]*sellerDot\[d\.dot_month \|\| 'Unknown'\] = \(sellerDot\[d\.dot_month \|\| 'Unknown'\] \|\| 0\) \+ \(d\.total_leads_allotted \|\| 0\)[\s\n]*\}\)[\s\n]*return \([\s\n]*<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\}>[\s\n]*<td style=\{\{ paddingLeft: '32px' \}\}>[\s\n]*\{m\.seller_name\}[\s\n]*\{m\.isAbsent && <span className=\{styles\.absentPill\}>Absent<\/span>\}[\s\n]*<\/td>[\s\n]*\{sortedMonths\.map\(mo => \([\s\n]*<td key=\{mo\}>\{m\.isAbsent \? '—' : \(sellerDot\[mo\] \|\| 0\)\}<\/td>[\s\n]*\)\)\}[\s\n]*<\/tr>[\s\n]*\)[\s\n]*\}\)\}/,
        `{expandedTlS6 === g.l2_email && g.members.map((m: any) => {
                          const sellerDot: Record<string, number> = {}
                          ;(m.dot_rows || []).forEach((d: any) => {
                            sellerDot[d.dot_month || 'Unknown'] = (sellerDot[d.dot_month || 'Unknown'] || 0) + (d.total_leads_allotted || 0)
                          })
                          const getVal = (keyStr: string) => {
                            let v = 0; Object.entries(sellerDot).forEach(([k,val])=> { if(k.endsWith('-'+keyStr)) v+=val; }); return v;
                          }
                          return (
                            <tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`}>
                              <td style={{ paddingLeft: '32px' }}>
                                {m.seller_name}
                                {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                              </td>
                              {dotMonthsConfig.map(mo => (
                                <td key={mo.key}>{m.isAbsent ? '—' : getVal(mo.key)}</td>
                              ))}
                              <td>{m.isAbsent ? '—' : Object.entries(sellerDot).reduce((sum, [k,v]) => {
                                 if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
                                 return sum;
                              }, 0)}</td>
                            </tr>
                          )
                        })}`
    );

    l1 = l1.replace(
        /\{sortedMonths\.map\(mo => \([\s\n]*<td key=\{mo\} style=\{\{ color: '#F4631E', fontWeight: 600 \}\}>\{g\.agg\.dotMap\[mo\] \|\| 0\}<\/td>[\s\n]*\)\)\}/,
        `{dotMonthsConfig.map(mo => {
                            let v = 0; Object.entries(g.agg.dotMap).forEach(([k,val]:[string,any])=> { if(k.endsWith('-'+mo.key)) v+=val; });
                            return <td key={mo.key} style={{ color: '#F4631E', fontWeight: 600 }}>{v}</td>
                          })}
                          <td style={{ color: '#F4631E', fontWeight: 600 }}>
                            {Object.entries(g.agg.dotMap).reduce((sum, [k,v]:[string,any]) => {
                                 if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
                                 return sum;
                            }, 0)}
                          </td>`
    );

    l1 = l1.replace(
        /\{sortedMonths\.map\(mo => <th key=\{mo\}>\{mo\}<\/th>\)\}/,
        `{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}
                       <th>6+ Months</th>`
    );

    l1 = l1.replace(
        /\{\(\(\) => \{[\s\n]*const allMonths = new Set<string>\(\)[\s\n]*processedGroups\.forEach\(\(g: any\) => Object\.keys\(g\.agg\.dotMap\)\.forEach\(k => allMonths\.add\(k\)\)\)[\s\n]*return Array\.from\(allMonths\)\.sort\(\)\.map\(m => <th key=\{m\}>\{m\}<\/th>\)[\s\n]*\}\)\(\)\}/,
        `{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}
                       <th>6+ Months</th>`
    );

    l1 = l1.replace(
        /const allMonths = new Set<string>\(\)[\s\n]*processedGroups\.forEach\(\(g: any\) => Object\.keys\(g\.agg\.dotMap\)\.forEach\(k => allMonths\.add\(k\)\)\)[\s\n]*const sortedMonths = Array\.from\(allMonths\)\.sort\(\)/,
        ""
    );
}

// 9. S9 Team Funnel Button and drill down 
if (!l1.includes('setActiveFunnelTl(g)')) {
    l1 = l1.replace(
        /\{expandedTlS9 === g\.l2_email && g\.members\.map\(\(m: any\) => \{/,
        `{expandedTlS9 === g.l2_email && (
                        <tr className={styles.sellerRow}>
                          <td colSpan={3} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveFunnelTl(g); setShowTeamFunnel(true); }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              📊 View Team Funnel
                            </button>
                          </td>
                        </tr>
                      )}
                      {expandedTlS9 === g.l2_email && g.members.map((m: any) => {`
    );

    // Make seller row clickable in S7 & S1
    l1 = l1.replace(
        /<div className=\{sellerStyles\.sectionContent\}>[\s\n]*<div className=\{styles\.tableWrap\}>[\s\n]*<table className=\{styles\.table\}>[\s\n]*<thead>[\s\n]*<tr>[\s\n]*<th>Team \(TL\)<\/th>[\s\n]*<th>Active<\/th>[\s\n]*<th>Warm<\/th>[\s\n]*<th>Cold<\/th>[\s\n]*<th>Future<\/th>[\s\n]*<\/tr>[\s\n]*<\/thead>[\s\n]*<tbody>[\s\n]*\{processedGroups\.map\(\(g: any\) => \([\s\n]*<React\.Fragment key=\{g\.l2_email\}>[\s\n]*<tr className=\{styles\.tlRow\} onClick=\{\(\) => toggleTl\(g\.l2_email, setExpandedTlS7, expandedTlS7\)\} style=\{\{ cursor: 'pointer', background: 'rgba\(255,255,255,0\.02\)' \}\}>[\s\n]*<td style=\{\{ fontWeight: 600, color: '#C9A84C' \}\}>[\s\n]*<span style=\{\{ display: 'inline-block', width: '16px', transition: 'transform 0\.2s', transform: expandedTlS7 === g\.l2_email \? 'rotate\(90deg\)' : 'none' \}\}>▶<\/span>[\s\n]*\{g\.l2_name\}[\s\n]*<\/td>[\s\n]*<td>\{g\.members\.reduce\(\(s: number, m: any\) => s \+ \(m\.pipeline\?\.active \|\| 0\), 0\)\}<\/td>[\s\n]*<td>\{g\.members\.reduce\(\(s: number, m: any\) => s \+ \(m\.pipeline\?\.warm \|\| 0\), 0\)\}<\/td>[\s\n]*<td>\{g\.members\.reduce\(\(s: number, m: any\) => s \+ \(m\.pipeline\?\.cold \|\| 0\), 0\)\}<\/td>[\s\n]*<td>\{g\.members\.reduce\(\(s: number, m: any\) => s \+ \(m\.pipeline\?\.future \|\| 0\), 0\)\}<\/td>[\s\n]*<\/tr>[\s\n]*\{expandedTlS7 === g\.l2_email && g\.members\.map\(\(m: any\) => \([\s\n]*<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\}>/,
        `<div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Active</th>
                  <th>Warm</th>
                  <th>Cold</th>
                  <th>Future</th>
                </tr>
              </thead>
              <tbody>
                {processedGroups.map((g: any) => (
                  <React.Fragment key={g.l2_email}>
                    <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS7, expandedTlS7)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                        <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS7 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                        {g.l2_name}
                      </td>
                      <td>{g.members.reduce((s: number, m: any) => s + (m.pipeline?.active || 0), 0)}</td>
                      <td>{g.members.reduce((s: number, m: any) => s + (m.pipeline?.warm || 0), 0)}</td>
                      <td>{g.members.reduce((s: number, m: any) => s + (m.pipeline?.cold || 0), 0)}</td>
                      <td>{g.members.reduce((s: number, m: any) => s + (m.pipeline?.future || 0), 0)}</td>
                    </tr>
                    {expandedTlS7 === g.l2_email && g.members.map((m: any) => (
                      <tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`} onClick={() => setDrillSellerS7(m)} style={{cursor: 'pointer'}}>`
    );
    
    l1 = l1.replace(
        /<div className=\{sellerStyles\.sectionContent\}>[\s\n]*<div className=\{styles\.tableWrap\}>[\s\n]*<table className=\{styles\.table\}>[\s\n]*<thead>[\s\n]*<tr>[\s\n]*<th>Team \(TL\)<\/th>[\s\n]*<th>Avg Login Time<\/th>[\s\n]*<th>Avg Break<\/th>[\s\n]*<\/tr>[\s\n]*<\/thead>[\s\n]*<tbody>[\s\n]*\{processedGroups\.map\(\(g: any\) => \([\s\n]*<React\.Fragment key=\{g\.l2_email\}>[\s\n]*<tr className=\{styles\.tlRow\} onClick=\{\(\) => toggleTl\(g\.l2_email, setExpandedTlS1, expandedTlS1\)\} style=\{\{ cursor: 'pointer', background: 'rgba\(255,255,255,0\.02\)' \}\}>[\s\n]*<td style=\{\{ fontWeight: 600, color: '#C9A84C' \}\}>[\s\n]*<span style=\{\{ display: 'inline-block', width: '16px', transition: 'transform 0\.2s', transform: expandedTlS1 === g\.l2_email \? 'rotate\(90deg\)' : 'none' \}\}>▶<\/span>[\s\n]*\{g\.l2_name\}[\s\n]*<\/td>[\s\n]*<td>\{g\.agg\.avgLoginStr\}<\/td>[\s\n]*<td>\{g\.agg\.tlAvgBreak\}m<\/td>[\s\n]*<\/tr>[\s\n]*\{expandedTlS1 === g\.l2_email && g\.members\.map\(\(m: any\) => \([\s\n]*<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\}>/,
        `<div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team (TL)</th>
                  <th>Avg Login Time</th>
                  <th>Avg Break</th>
                </tr>
              </thead>
              <tbody>
                {processedGroups.map((g: any) => (
                  <React.Fragment key={g.l2_email}>
                    <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS1, expandedTlS1)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                        <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS1 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                        {g.l2_name}
                      </td>
                      <td>{g.agg.avgLoginStr}</td>
                      <td>{g.agg.tlAvgBreak}m</td>
                    </tr>
                    {expandedTlS1 === g.l2_email && g.members.map((m: any) => (
                      <tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`} onClick={() => setDrillSellerS7(m)} style={{cursor: 'pointer'}}>`
    );
}

// 10. Funnel and Modals content at the end
const modalsContent = `
      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Breakdown Modal */}
      {activeBreakdownCard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setActiveBreakdownCard(null); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: breakdownDrillSeller ? '500px' : '700px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative', transition: 'width 0.3s' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { setActiveBreakdownCard(null); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
            >×</button>

            {breakdownDrillSeller ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => setBreakdownDrillSeller(null)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#E5E5E5', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s' }}
                  >← Back</button>
                  <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>
                    {breakdownDrillSeller.seller_name}
                    <span style={{ fontSize: '0.75rem', color: '#8A8278', marginLeft: '8px' }}>Monthly Breakdown · {monthStr}</span>
                  </h3>
                </div>

                {(() => {
                  const sm = breakdownDrillSeller
                  // DOT
                  const sDotMap: Record<string, number> = {}
                  ;(sm.dot_rows || []).forEach((row: any) => {
                    sDotMap[row.dot_month] = (sDotMap[row.dot_month] || 0) + (row.total_leads_allotted || 0)
                  })
                  const sDotData: { label: string; value: number; color: string }[] = []
                  dotMonthsConfig.forEach(mo => {
                    let val = 0;
                    Object.entries(sDotMap).forEach(([k, v]) => {
                      if (k.endsWith('-' + mo.key)) val += v;
                    });
                    sDotData.push({ label: mo.label, value: val, color: '#F4631E' })
                  });
                  let sFs = 0
                  Object.entries(sDotMap).forEach(([k, v]) => {
                    const isMainMonth = dotMonthsConfig.some(mo => k.endsWith('-' + mo.key));
                    if (!isMainMonth) sFs += v;
                  });
                  sDotData.push({ label: '6+ Months', value: sFs, color: '#5A5650' })
                  const sMaxDot = Math.max(...sDotData.map(d => d.value), 1)

                  // Allotment
                  const memberMonthlySum = (mem: any, key: string) => (mem.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
                  const sTotalLeads = memberMonthlySum(sm, 'total_leads_allotted')
                  const sAllotRows = [
                    { label: 'Auto Allotted', value: memberMonthlySum(sm, 'auto_allotted'), color: '#E5E7EB' },
                    { label: 'Manual Allotted', value: memberMonthlySum(sm, 'manual_allotted'), color: '#9CA3AF' },
                    { label: 'RTG Leads', value: memberMonthlySum(sm, 'rtg_leads'), color: '#F4631E' },
                    { label: 'Non-RTG', value: memberMonthlySum(sm, 'non_rtg_leads'), color: '#4B5563' },
                  ]

                  // PAX
                  const sp1 = memberMonthlySum(sm, 'pax_1'), sp2 = memberMonthlySum(sm, 'pax_2'), sp3 = memberMonthlySum(sm, 'pax_3'), sp4 = memberMonthlySum(sm, 'pax_4'), sp5 = memberMonthlySum(sm, 'pax_4_plus')
                  const sTotalPax = sp1 + sp2 + sp3 + sp4 + sp5
                  const sPaxRows = [
                    { label: '1-pax', value: sp1, color: '#F3F4F6' },
                    { label: '2-pax', value: sp2, color: '#E5E7EB' },
                    { label: '3-pax', value: sp3, color: '#D1D5DB' },
                    { label: '4-pax', value: sp4, color: '#9CA3AF' },
                    { label: '4+ pax', value: sp5, color: '#6B7280' },
                  ]

                  if (activeBreakdownCard === 'dot') {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {sDotData.map((bar, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '60px', fontSize: '0.75rem', color: '#8A8278', textAlign: 'right', fontWeight: 500 }}>{bar.label}</div>
                            <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden' }}>
                              <div style={{ width: \`\${(bar.value / sMaxDot) * 100}%\`, height: '100%', background: \`linear-gradient(90deg, \${bar.color}40, \${bar.color}90)\`, borderRadius: '6px' }} />
                            </div>
                            <div style={{ width: '40px', fontSize: '0.8rem', fontWeight: 700, color: bar.value > 0 ? bar.color : '#5A5650', textAlign: 'right' }}>{bar.value}</div>
                          </div>
                        ))}
                      </div>
                    )
                  } else if (activeBreakdownCard === 'allotment') {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        {sAllotRows.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color }} />
                            <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>{item.label}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: item.color, background: \`\${item.color}15\`, padding: '4px 10px', borderRadius: '100px' }}>
                              {sTotalLeads > 0 ? Math.round((item.value / sTotalLeads) * 100) : 0}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  } else if (activeBreakdownCard === 'pax') {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        {sPaxRows.map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color }} />
                            <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>{item.label}</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: item.color, background: \`\${item.color}15\`, padding: '4px 10px', borderRadius: '100px' }}>
                              {sTotalPax > 0 ? Math.round((item.value / sTotalPax) * 100) : 0}%
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                })()}
              </>
            ) : (
              <>
                <h3 style={{ color: '#fff', margin: '0 0 24px 0', fontSize: '1.1rem' }}>
                  {activeBreakdownCard === 'dot' ? 'DOT Distribution' : activeBreakdownCard === 'allotment' ? 'Allotment Breakdown' : 'Leads by Group Size'}
                  <span style={{ fontSize: '0.75rem', color: '#8A8278', marginLeft: '8px', fontWeight: 400 }}>· Team Drill-down</span>
                </h3>
                
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Team (TL)</th>
                      {activeBreakdownCard === 'dot' ? (
                        <>
                          {dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}
                          <th>6+ Months</th>
                        </>
                      ) : activeBreakdownCard === 'allotment' ? (
                        <><th>Auto</th><th>Manual</th><th>RTG</th><th>Non-RTG</th></>
                      ) : (
                        <><th>1-pax</th><th>2-pax</th><th>3-pax</th><th>4-pax</th><th>4+ pax</th></>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {processedGroups.map((g: any) => {
                      const getTlVal = (keyStr: string) => {
                         let v = 0; Object.entries(g.agg.dotMap).forEach(([k,val]:[string,any])=> { if(k.endsWith('-'+keyStr)) v+=val; }); return v;
                      }
                      
                      const tMemberMonthlySum = (key: string) => g.members.reduce((sum: number, m: any) => sum + (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0), 0)
                      
                      return (
                        <React.Fragment key={g.l2_email}>
                          <tr className={styles.tlRow} onClick={() => setBreakdownExpandedTl(breakdownExpandedTl === g.l2_email ? null : g.l2_email)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                            <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                              <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: breakdownExpandedTl === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> 
                              {g.l2_name}
                            </td>
                            {activeBreakdownCard === 'dot' ? (
                              <>
                                {dotMonthsConfig.map(mo => <td key={mo.key} style={{color: '#F4631E'}}>{getTlVal(mo.key)}</td>)}
                                <td style={{color: '#F4631E'}}>{Object.entries(g.agg.dotMap).reduce((sum, [k,v]:[string,any]) => {
                                   if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
                                   return sum;
                                }, 0)}</td>
                              </>
                            ) : activeBreakdownCard === 'allotment' ? (
                              <>
                                <td>{tMemberMonthlySum('auto_allotted')}</td>
                                <td>{tMemberMonthlySum('manual_allotted')}</td>
                                <td>{tMemberMonthlySum('rtg_leads')}</td>
                                <td>{tMemberMonthlySum('non_rtg_leads')}</td>
                              </>
                            ) : (
                              <>
                                <td>{tMemberMonthlySum('pax_1')}</td>
                                <td>{tMemberMonthlySum('pax_2')}</td>
                                <td>{tMemberMonthlySum('pax_3')}</td>
                                <td>{tMemberMonthlySum('pax_4')}</td>
                                <td>{tMemberMonthlySum('pax_4_plus')}</td>
                              </>
                            )}
                          </tr>
                          
                          {breakdownExpandedTl === g.l2_email && g.members.map((m: any) => {
                            const sellerDot: Record<string, number> = {}
                            ;(m.dot_rows || []).forEach((d: any) => { sellerDot[d.dot_month || 'Unknown'] = (sellerDot[d.dot_month || 'Unknown'] || 0) + (d.total_leads_allotted || 0) })
                            const getSVal = (keyStr: string) => { let v=0; Object.entries(sellerDot).forEach(([k,val])=> { if(k.endsWith('-'+keyStr)) v+=val; }); return v; }
                            
                            const sMemberMonthlySum = (key: string) => (m.monthly_rows || []).reduce((s: number, r: any) => s + (r[key] || 0), 0)
                            
                            return (
                              <tr key={m.seller_email} className={styles.sellerRow} onClick={() => setBreakdownDrillSeller(m)} style={{ cursor: 'pointer' }}>
                                <td style={{ paddingLeft: '32px' }}>{m.seller_name} {m.isAbsent && <span className={styles.absentPill}>Absent</span>}</td>
                                {activeBreakdownCard === 'dot' ? (
                                  <>
                                    {dotMonthsConfig.map(mo => <td key={mo.key}>{m.isAbsent ? '—' : getSVal(mo.key)}</td>)}
                                    <td>{m.isAbsent ? '—' : Object.entries(sellerDot).reduce((sum, [k,v]) => {
                                       if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
                                       return sum;
                                    }, 0)}</td>
                                  </>
                                ) : activeBreakdownCard === 'allotment' ? (
                                  <>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('auto_allotted')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('manual_allotted')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('rtg_leads')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('non_rtg_leads')}</td>
                                  </>
                                ) : (
                                  <>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('pax_1')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('pax_2')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('pax_3')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('pax_4')}</td>
                                    <td>{m.isAbsent ? '—' : sMemberMonthlySum('pax_4_plus')}</td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* No Leads Modal */}
      {showNoLeadsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }} onClick={() => setShowNoLeadsModal(false)}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#fff', margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between' }}>
              Sellers without leads
              <button onClick={() => setShowNoLeadsModal(false)} style={{ background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </h3>
            <table className={styles.table}>
              <thead><tr><th>Team (TL) / Seller</th><th>Status</th></tr></thead>
              <tbody>
                {processedGroups.map((g: any) => {
                   const noLeadsSellers = g.members.filter((m: any) => !m.isAbsent && !m.isOnBreak && (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0) === 0);
                   if (noLeadsSellers.length === 0) return null;
                   return (
                     <React.Fragment key={g.l2_email}>
                       <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                         <td style={{ fontWeight: 600, color: '#C9A84C' }} colSpan={2}>{g.l2_name}</td>
                       </tr>
                       {noLeadsSellers.map((m: any) => (
                         <tr key={m.seller_email} style={{ borderBottom: '1px solid #333' }}>
                           <td style={{ paddingLeft: '32px' }}>{m.seller_name}</td>
                           <td>
                             {!m.attendance?.first_login ? 'Not Logged In' : 
                              !m.cti?.logged_in_at ? 'Not on Ozontell' : 'Waiting for leads'}
                           </td>
                         </tr>
                       ))}
                     </React.Fragment>
                   )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MHE Trend Modal */}
      {showMheTrendModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowMheTrendModal(false); setMheDrillSeller(null); setBreakdownExpandedTl(null); }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: mheDrillSeller ? '600px' : '800px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => { setShowMheTrendModal(false); setMheDrillSeller(null); setBreakdownExpandedTl(null); }}
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
                {mheDrillSeller ? \`\${mheDrillSeller.seller_name} — MHE Trend\` : 'Monthly MHE Trend · CM Avg'}
              </h3>
            </div>

            {(() => {
              const dayMap: Record<string, { sum: number; count: number }> = {}
              if (mheDrillSeller) {
                ;(mheDrillSeller.monthly_lta_logs || []).forEach((r: any) => {
                  const d = r.log_date
                  if (!d) return
                  const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                  if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
                  dayMap[d].sum += pct
                  dayMap[d].count += 1
                })
              } else {
                let allMembers: any[] = []
                processedGroups.forEach((g: any) => { allMembers = allMembers.concat(g.members) })
                allMembers.forEach((m: any) => {
                  ;(m.monthly_lta_logs || []).forEach((r: any) => {
                    const d = r.log_date
                    if (!d) return
                    const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
                    if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
                    dayMap[d].sum += pct
                    dayMap[d].count += 1
                  })
                })
              }
              const sortedDays = Object.keys(dayMap).sort()
              const labels = sortedDays.map(d => {
                const dt = new Date(d);
                return \`\${dt.getDate()} \${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}\`;
              })
              const values = sortedDays.map(d => parseFloat((dayMap[d].sum / dayMap[d].count).toFixed(1)))
              
              const mheAvg = sortedDays.length > 0 ? parseFloat((values.reduce((s,v)=>s+v,0)/values.length).toFixed(1)) : 0
              const isGood = mheAvg <= 20

              return (
                <div style={{ display: 'flex', gap: '24px', flexDirection: mheDrillSeller ? 'column' : 'row' }}>
                  <div style={{ flex: 1, minWidth: '400px' }}>
                    <div style={{ height: '240px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #333' }}>
                      <MheTrendChart labels={labels} values={values} color={isGood ? '#22C55E' : '#EF4444'} />
                    </div>
                  </div>
                  {!mheDrillSeller && (
                    <div style={{ width: '250px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>Team Drill-down</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto', paddingRight: '8px' }}>
                        {processedGroups.map((g: any) => {
                          const tMheMap: Record<string, {s:number; c:number}> = {}
                          g.members.forEach((m: any) => {
                            ;(m.monthly_lta_logs || []).forEach((r: any) => {
                              const d = r.log_date; if(!d)return;
                              if(!tMheMap[d]) tMheMap[d] = {s:0, c:0};
                              tMheMap[d].s += typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0
                              tMheMap[d].c += 1
                            })
                          })
                          let tSum = 0; let tDays = 0;
                          Object.values(tMheMap).forEach(v => { tSum += v.s / v.c; tDays++; })
                          const tAvg = tDays > 0 ? parseFloat((tSum / tDays).toFixed(1)) : 0
                          
                          return (
                            <React.Fragment key={g.l2_email}>
                              <div onClick={() => setBreakdownExpandedTl(breakdownExpandedTl === g.l2_email ? null : g.l2_email)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#C9A84C' }}>
                                <span><span style={{ display: 'inline-block', width: '12px', transition: 'transform 0.2s', transform: breakdownExpandedTl === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span> {g.l2_name}</span>
                                <span style={{ color: tAvg <= 20 ? '#22C55E' : '#EF4444' }}>{tAvg}%</span>
                              </div>
                              {breakdownExpandedTl === g.l2_email && g.members.map((m: any) => {
                                let mSum = 0; let mDays = 0;
                                ;(m.monthly_lta_logs || []).forEach((r: any) => {
                                  if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++; }
                                })
                                const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0
                                return (
                                  <div key={m.seller_email} onClick={() => setMheDrillSeller(m)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px 6px 24px', cursor: 'pointer', fontSize: '0.8rem', color: '#E5E5E5', borderLeft: '1px solid #333', marginLeft: '6px' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <span>{m.seller_name} {m.isAbsent && <span className={styles.absentPill}>Absent</span>}</span>
                                    <span style={{ color: mAvg <= 20 ? '#22C55E' : '#EF4444' }}>{m.isAbsent ? '—' : \`\${mAvg}%\`}</span>
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
              )
            })()}
          </div>
        </div>
      )}

      {/* Seller Funnel Modal (S7) or Timeline */}
      {drillSellerS7 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDrillSellerS7(null)}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '95%', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setDrillSellerS7(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
            >×</button>

            <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '1.2rem' }}>{drillSellerS7.seller_name}</h3>
            <div style={{ fontSize: '0.8rem', color: '#8A8278', marginBottom: '24px' }}>Seller Activity & Funnel</div>

            {(() => {
              const logs = drillSellerS7.cti?.logs || []
              let lastLog = ''
              if (logs.length > 0) {
                const s = logs[0]
                const t = s.time || ''
                if (s.state === 'Login') lastLog = \`Logged in at \${t}\`
                else if (s.state === 'Logout') lastLog = \`Logged out at \${t}\`
                else if (s.state === 'Break') lastLog = \`Went on break at \${t}\`
                else if (s.state === 'Available') lastLog = \`Became available at \${t}\`
              }
              
              const p = drillSellerS7.pipeline || {}
              const funnelTotal = (p.active||0) + (p.warm||0) + (p.cold||0) + (p.future||0)
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Status Box */}
                  <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8A8278', textTransform: 'uppercase', marginBottom: '8px' }}>Current Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: drillSellerS7.isAbsent ? '#EF4444' : drillSellerS7.isOnBreak ? '#EAB308' : '#22C55E' }} />
                      <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 500 }}>
                        {drillSellerS7.isAbsent ? 'Absent' : drillSellerS7.isOnBreak ? 'On Break' : 'Active'}
                      </span>
                    </div>
                    {lastLog && <div style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '8px' }}>{lastLog}</div>}
                  </div>
                  
                  {/* Funnel Box */}
                  <div style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8A8278', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Pipeline Funnel</span>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{funnelTotal} Leads</span>
                    </div>
                    <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ width: \`\${funnelTotal ? (p.active||0)/funnelTotal*100 : 0}%\`, background: '#22C55E' }} title={\`Active: \${p.active||0}\`} />
                      <div style={{ width: \`\${funnelTotal ? (p.warm||0)/funnelTotal*100 : 0}%\`, background: '#EAB308' }} title={\`Warm: \${p.warm||0}\`} />
                      <div style={{ width: \`\${funnelTotal ? (p.cold||0)/funnelTotal*100 : 0}%\`, background: '#3B82F6' }} title={\`Cold: \${p.cold||0}\`} />
                      <div style={{ width: \`\${funnelTotal ? (p.future||0)/funnelTotal*100 : 0}%\`, background: '#8B5CF6' }} title={\`Future: \${p.future||0}\`} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#22C55E' }}>● Active</span><span style={{ color: '#fff', fontWeight: 500 }}>{p.active||0}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#EAB308' }}>● Warm</span><span style={{ color: '#fff', fontWeight: 500 }}>{p.warm||0}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#3B82F6' }}>● Cold</span><span style={{ color: '#fff', fontWeight: 500 }}>{p.cold||0}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}><span style={{ color: '#8B5CF6' }}>● Future</span><span style={{ color: '#fff', fontWeight: 500 }}>{p.future||0}</span></div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Team Funnel Modal */}
      {showTeamFunnel && activeFunnelTl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTeamFunnel(false)}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '95%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowTeamFunnel(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
            >×</button>

            <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '1.2rem' }}>{activeFunnelTl.l2_name} — Team Funnel</h3>
            <div style={{ fontSize: '0.8rem', color: '#8A8278', marginBottom: '24px' }}>Combined Pipeline Distribution</div>

            {(() => {
              const pRows = [
                { stage: 'M0 - Warm', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m0_warm||0),0), color: '#F4631E' },
                { stage: 'M1 - Active', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m1_active||0),0), color: '#F97316' },
                { stage: 'M2 - Evaluation', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m2_evaluation||0),0), color: '#FB923C' },
                { stage: 'M3 - Negotiation', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m3_negotiation||0),0), color: '#FDBA74' },
                { stage: 'M4 - Closing', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m4_closing||0),0), color: '#FED7AA' },
                { stage: 'M5 - Won', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.m5_won||0),0), color: '#22C55E' },
                { stage: 'Lost', count: activeFunnelTl.members.reduce((s:number,m:any)=>s+(m.funnel?.lost||0),0), color: '#EF4444' }
              ]
              const maxC = Math.max(...pRows.map(r => r.count), 1)
              const tot = pRows.reduce((s,r)=>s+r.count,0)

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pRows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '120px', fontSize: '0.85rem', color: '#E5E5E5', textAlign: 'right' }}>{r.stage}</div>
                      <div style={{ flex: 1, height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: \`\${(r.count / maxC) * 100}%\`, height: '100%', background: r.count > 0 ? \`linear-gradient(90deg, \${r.color}40, \${r.color})\` : 'transparent', borderRadius: '6px', transition: 'width 0.5s' }} />
                        <span style={{ position: 'absolute', left: '12px', fontSize: '0.8rem', fontWeight: 600, color: r.count > 0 ? '#fff' : '#555' }}>
                          {r.count} <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px', fontWeight: 400 }}>({tot > 0 ? Math.round((r.count/tot)*100) : 0}%)</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}
`;
if (!l1.includes('showNoLeadsModal &&')) {
    l1 = l1.replace(/(\s*<\/div>\s*\)\s*\})/, '\n' + modalsContent + '$1');
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
console.log('Successfully updated L1SellerViewPage.tsx');
