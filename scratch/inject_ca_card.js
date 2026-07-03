const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

// 1. Add variables
if (!l1.includes('cmMonthlyAppetite')) {
    const varInjection = `
    const cmMonthlyAppetite = allMembers.reduce((s:number, m:any) => s + (m.monthly_lta_rows || []).reduce((s2:number, r:any) => s2 + (r.final_lta || 0), 0), 0);
    const cmMonthlyFulfPct = cmMonthlyAppetite > 0 ? pct(cmMonthlyTotalLeads, cmMonthlyAppetite) : 0;
    const allCAMonthlyRows = allMembers.flatMap((m:any) => m.monthly_rows || []).filter((r:any) => r.total_leads_allotted > 0 && r.avg_cta_minutes != null);
    const sumCta = allCAMonthlyRows.reduce((s:number, r:any) => s + (r.avg_cta_minutes * r.total_leads_allotted), 0);
    const sumCtaLeads = allCAMonthlyRows.reduce((s:number, r:any) => s + r.total_leads_allotted, 0);
    const cmMonthlyAvgCA = sumCtaLeads > 0 ? Math.round(sumCta / sumCtaLeads) : null;
    const cmMonthlyCaRows = [
      { label: 'Leads Allotted', value: cmMonthlyTotalLeads, color: '#E5E7EB' },
      { label: 'Appetite (LTA)', value: cmMonthlyAppetite, color: '#F4631E' },
    ];
`;
    l1 = l1.replace(
        /const cmAllotmentRows = \[/,
        varInjection + '\n    const cmAllotmentRows = ['
    );
}

// 2. Change grid
l1 = l1.replace(
    /<div style=\{\{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' \}\}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>`
);

// 3. Add the card
if (!l1.includes('Appetite & C→A Time')) {
    const cardInjection = `
          {/* ✨ Appetite & C->A Time (Monthly) ✨ */}
          <div 
            style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onClick={() => {setActiveBreakdownCard(activeBreakdownCard === 'ca' ? null : 'ca'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null);}}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appetite & C→A Time</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {cmMonthlyCaRows.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: row.color }} />
                    <span style={{ fontSize: '0.75rem', color: '#8A8278' }}>{row.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F0EDE8' }}>{row.value}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8A8278' }}>Fulfillment %</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cmMonthlyFulfPct >= 90 ? '#22C55E' : cmMonthlyFulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>{cmMonthlyFulfPct}%</span>
                  </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8A8278' }}>Avg C→A Time</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F0EDE8' }}>{cmMonthlyAvgCA != null ? \`\${cmMonthlyAvgCA}m\` : '—'}</span>
                  </div>
              </div>
            </div>
          </div>
`;
    // Insert after PAX Distribution card end div
    l1 = l1.replace(
        /\{cmMonthlyTotalPax > 0 \? Math\.round\(\(p\.value \/ cmMonthlyTotalPax\) \* 100\) : 0\}%\n                  <\/span>\n                <\/div>\n              \)\)}\n            <\/div>\n          <\/div>/,
        `{cmMonthlyTotalPax > 0 ? Math.round((p.value / cmMonthlyTotalPax) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>\n` + cardInjection
    );
}

// 4. Drilldown headers
if (!l1.includes("activeBreakdownCard === 'ca'")) {
    l1 = l1.replace(
        /\{activeBreakdownCard === 'dot' \? 'DOT Distribution' : activeBreakdownCard === 'allotment' \? 'Allotment Breakdown' : 'Leads by Group Size'\}/,
        `{activeBreakdownCard === 'dot' ? 'DOT Distribution' : activeBreakdownCard === 'allotment' ? 'Allotment Breakdown' : activeBreakdownCard === 'ca' ? 'Appetite & C→A Time' : 'Leads by Group Size'}`
    );
    l1 = l1.replace(
        /\) : activeBreakdownCard === 'allotment' \? \(\n                          <><\th>Auto<\/\th><\th>Manual<\/\th><\th>RTG<\/\th><\th>Non-RTG<\/\th><\/>\n                        \) : \(/,
        `) : activeBreakdownCard === 'allotment' ? (
                          <><th>Auto</th><th>Manual</th><th>RTG</th><th>Non-RTG</th></>
                        ) : activeBreakdownCard === 'ca' ? (
                          <><th>Leads Allotted</th><th>Appetite (LTA)</th><th>Fulfillment %</th><th>Avg C→A</th></>
                        ) : (`
    );
}

// 5. Drilldown body (TL rows)
if (!l1.includes("else if (activeBreakdownCard === 'ca')")) {
    // We add it to the breakdown row logic
    const bodyInjection = `
                        ) : activeBreakdownCard === 'ca' ? (
                          <>
                            <td>{g.agg.totalLeads}</td>
                            <td>{g.agg.teamAppetiteMonthly}</td>
                            <td style={{ color: g.agg.teamFulfPctMonthly >= 90 ? '#22C55E' : g.agg.teamFulfPctMonthly >= 70 ? '#F59E0B' : '#EF4444' }}>
                              {g.agg.teamFulfPctMonthly}%
                            </td>
                            <td>{g.agg.teamAvgCaMonthly != null ? \`\${g.agg.teamAvgCaMonthly}m\` : '—'}</td>
                          </>
                        ) : (
`;
    l1 = l1.replace(
        /\) : activeBreakdownCard === 'allotment' \? \(\n                          <>\n                            <td>\{g\.agg\.totalAuto\}<\/\td>\n                            <td>\{g\.agg\.totalManual\}<\/\td>\n                            <td>\{g\.agg\.totalRtg\}<\/\td>\n                            <td>\{g\.agg\.totalNonRtg\}<\/\td>\n                          <\/>\n                        \) : \(/,
        `) : activeBreakdownCard === 'allotment' ? (
                          <>
                            <td>{g.agg.totalAuto}</td>
                            <td>{g.agg.totalManual}</td>
                            <td>{g.agg.totalRtg}</td>
                            <td>{g.agg.totalNonRtg}</td>
                          </>
` + bodyInjection
    );
}

// 6. Drilldown body (Seller rows)
if (!l1.includes("else if (activeBreakdownCard === 'ca')") || true) {
    const sellerBodyInjection = `
                            ) : activeBreakdownCard === 'ca' ? (
                              <>
                                <td>{memberMonthlySum(m, 'total_leads_allotted')}</td>
                                <td>{(m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0)}</td>
                                <td style={{ color: ((m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0) > 0 ? pct(memberMonthlySum(m, 'total_leads_allotted'), (m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0)) : 0) >= 90 ? '#22C55E' : ((m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0) > 0 ? pct(memberMonthlySum(m, 'total_leads_allotted'), (m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0)) : 0) >= 70 ? '#F59E0B' : '#EF4444' }}>
                                  {(m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0) > 0 ? pct(memberMonthlySum(m, 'total_leads_allotted'), (m.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0)) : 0}%
                                </td>
                                <td>{(() => {
                                  const rws = (m.monthly_rows || []).filter((r:any) => r.total_leads_allotted > 0 && r.avg_cta_minutes != null);
                                  const s_cta = rws.reduce((s:number,r:any) => s + (r.avg_cta_minutes * r.total_leads_allotted), 0);
                                  const s_lds = rws.reduce((s:number,r:any) => s + r.total_leads_allotted, 0);
                                  return s_lds > 0 ? \`\${Math.round(s_cta / s_lds)}m\` : '—';
                                })()}</td>
                              </>
                            ) : (
`;
    l1 = l1.replace(
        /\) : activeBreakdownCard === 'allotment' \? \(\n                              <>\n                                <td>\{memberMonthlySum\(m, 'auto_allotted'\)\}<\/\td>\n                                <td>\{memberMonthlySum\(m, 'manual_allotted'\)\}<\/\td>\n                                <td>\{memberMonthlySum\(m, 'rtg_leads'\)\}<\/\td>\n                                <td>\{memberMonthlySum\(m, 'non_rtg_leads'\)\}<\/\td>\n                              <\/>\n                            \) : \(/,
        `) : activeBreakdownCard === 'allotment' ? (
                              <>
                                <td>{memberMonthlySum(m, 'auto_allotted')}</td>
                                <td>{memberMonthlySum(m, 'manual_allotted')}</td>
                                <td>{memberMonthlySum(m, 'rtg_leads')}</td>
                                <td>{memberMonthlySum(m, 'non_rtg_leads')}</td>
                              </>
` + sellerBodyInjection
    );
}

// 7. Seller Drilldown Modal
if (!l1.includes("} else if (activeBreakdownCard === 'ca') {")) {
    const modalInjection = `
                    } else if (activeBreakdownCard === 'ca') {
                      const sTotal = memberMonthlySum(sm, 'total_leads_allotted');
                      const sAppetite = (sm.monthly_lta_rows || []).reduce((s:number,r:any)=>s+(r.final_lta||0),0);
                      const sFulf = sAppetite > 0 ? pct(sTotal, sAppetite) : 0;
                      let sAvgCa = '—';
                      const rws = (sm.monthly_rows || []).filter((r:any) => r.total_leads_allotted > 0 && r.avg_cta_minutes != null);
                      const s_cta = rws.reduce((s:number,r:any) => s + (r.avg_cta_minutes * r.total_leads_allotted), 0);
                      const s_lds = rws.reduce((s:number,r:any) => s + r.total_leads_allotted, 0);
                      if (s_lds > 0) sAvgCa = \`\${Math.round(s_cta / s_lds)}m\`;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#E5E7EB' }} />
                              <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>Leads Allotted</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: sTotal > 0 ? '#E5E7EB' : '#5A5650' }}>{sTotal}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#F4631E' }} />
                              <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>Appetite (LTA)</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: sAppetite > 0 ? '#F4631E' : '#5A5650' }}>{sAppetite}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>Fulfillment %</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: sFulf >= 90 ? '#22C55E' : sFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{sFulf}%</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <div style={{ fontSize: '0.85rem', color: '#E5E5E5', flex: 1 }}>Avg C→A Time</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#E5E5E5' }}>{sAvgCa}</div>
                          </div>
                        </div>
                      )
`;
    l1 = l1.replace(
        /\} else if \(activeBreakdownCard === 'pax'\) \{/,
        modalInjection + `                    } else if (activeBreakdownCard === 'pax') {`
    );
}

// 8. Aggregations for group
if (!l1.includes('teamAppetiteMonthly')) {
    const groupInjection = `
          const teamAppetiteMonthly = members.reduce((s:number, m:any) => s + (m.monthly_lta_rows || []).reduce((s2:number, r:any) => s2 + (r.final_lta || 0), 0), 0)
          const teamFulfPctMonthly = teamAppetiteMonthly > 0 ? pct(totalLeads, teamAppetiteMonthly) : 0
          const teamMonthlyCaRows = members.flatMap((m:any) => m.monthly_rows || []).filter((r:any) => r.total_leads_allotted > 0 && r.avg_cta_minutes != null)
          const sumTCA = teamMonthlyCaRows.reduce((s:number, r:any) => s + (r.avg_cta_minutes * r.total_leads_allotted), 0)
          const sumTLeads = teamMonthlyCaRows.reduce((s:number, r:any) => s + r.total_leads_allotted, 0)
          const teamAvgCaMonthly = sumTLeads > 0 ? Math.round(sumTCA / sumTLeads) : null
`;
    l1 = l1.replace(
        /const teamMedianCA = caVals\.length > 0 \? Math\.round\(caVals\.reduce\(\(s:number, v:number\) => s \+ v, 0\) \/ caVals\.length\) : null/,
        `const teamMedianCA = caVals.length > 0 ? Math.round(caVals.reduce((s:number, v:number) => s + v, 0) / caVals.length) : null
` + groupInjection
    );
    l1 = l1.replace(
        /teamTotalBreak, teamTotalBreakCount, teamLongestBreak,/,
        `teamTotalBreak, teamTotalBreakCount, teamLongestBreak, teamAppetiteMonthly, teamFulfPctMonthly, teamAvgCaMonthly,`
    );
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
console.log('Injected CA Monthly');
