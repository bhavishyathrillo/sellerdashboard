const fs = require('fs');
const file = 'components/pages/L1SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add state for s9View
code = code.replace(
  "const [s7View, setS7View] = useState<'cards'|'table'>('cards')",
  `const [s7View, setS7View] = useState<'cards'|'table'>('cards')
  const [s9View, setS9View] = useState<'cards'|'table'>('cards')`
);

const toggleUI = `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px', marginLeft: '12px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => setS9View('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:s9View==='cards'?'rgba(244,99,30,0.15)':'transparent',color:s9View==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => setS9View('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:s9View==='table'?'rgba(244,99,30,0.15)':'transparent',color:s9View==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

// Patch S9 Header
const s9HeaderRegex = /<div className=\{styles\.sectionHeaderCollapsible\} onClick=\{\(\) => setActiveSectionModal\(activeSectionModal === 's9' \? null : 's9'\)\}>[\s\S]*?<h2 className=\{styles\.sectionTitle\} style=\{\{ display: 'flex', alignItems: 'center' \}\}>[\s\S]*?LTA \(Lead Time Availability\)[\s\S]*?<\/h2>[\s\S]*?<div style=\{\{ fontSize: '0\.75rem', padding: '4px 12px'[\s\S]*?<\/div>\s*<\/div>/;

const s9HeaderRepl = `<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's9' ? null : 's9')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === 's9' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center' }}>
      LTA (Lead Time Availability)
      <span style={{ fontSize: '0.8rem', marginLeft: '16px', color: '#8A8278', fontWeight: 'normal', display: 'inline-flex', gap: '12px', alignItems: 'center' }}>
        <span><span style={{ color: '#E5E5E5', fontWeight: 600 }}>{globalPlannedLta}</span> Planned</span>
        <span style={{ color: '#444' }}>|</span>
        <span><span style={{ color: '#22C55E', fontWeight: 600 }}>{globalFinalLta}</span> Final</span>
      </span>
    </h2>
  </div>
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
${toggleUI}
  </div>
</div>`;
code = code.replace(s9HeaderRegex, s9HeaderRepl);

// Patch S9 Global summary and Cards
const s9StartStr = `{
  activeSectionModal === 's9' && (
    <div className={sellerStyles.sectionContent}>

      {/* Global summary bar */}`;
const s9StartRepl = `{
  activeSectionModal === 's9' && (
    <div className={sellerStyles.sectionContent}>
      {s9View === 'table' ? (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team (TL)</th>
              <th>Planned LTA</th>
              <th>Dynamic LTA</th>
              <th>Hygiene LTA</th>
              <th>Rev 1 LTA</th>
              <th>Final LTA</th>
              <th>Total Leads</th>
              <th>Fulfillment %</th>
            </tr>
          </thead>
          <tbody>
            {processedGroups.map((g: any) => {
              const gDynLta = g.members.reduce((s: number, m: any) => s + m.lta.dynLta, 0);
              const gHygLta = g.members.reduce((s: number, m: any) => s + m.lta.hygLta, 0);
              const gRev1Lta = g.members.reduce((s: number, m: any) => s + m.lta.rev1Lta, 0);
              const gFulfPct = g.agg.teamActual > 0 ? Math.round((g.agg.totalLeads / g.agg.teamActual) * 100) : 0;
              return (
                <React.Fragment key={g.l2_email}>
                  <tr className={styles.tlRow} onClick={() => toggleTl(g.l2_email, setExpandedTlS9, expandedTlS9)} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ fontWeight: 600, color: '#C9A84C' }}>
                      <span style={{ display: 'inline-block', width: '16px', transition: 'transform 0.2s', transform: expandedTlS9 === g.l2_email ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {g.l2_name}
                    </td>
                    <td>{g.agg.teamPlanned}</td>
                    <td>{gDynLta}</td>
                    <td>{gHygLta}</td>
                    <td>{gRev1Lta}</td>
                    <td style={{ color: '#22C55E', fontWeight: 600 }}>{g.agg.teamActual}</td>
                    <td>{g.agg.totalLeads}</td>
                    <td style={{ color: gFulfPct >= 90 ? '#22C55E' : gFulfPct >= 70 ? '#EAB308' : '#EF4444', fontWeight: 600 }}>{gFulfPct}%</td>
                  </tr>

                  {expandedTlS9 === g.l2_email && g.members.map((m: any) => {
                    const dl = m.daily_lta || {};
                    const planned = dl.wd > 0 ? Math.floor(dl.lead_goal / dl.wd) : 0;
                    const dynLta = dl.real_dynamic_lta || 0;
                    const hygLta = dl.hygiene_lta || 0;
                    const rev1Lta = dl.goal_completion_logic_lta || 0;
                    const actual = Math.floor(dl.final_lta || 0);
                    const fulfPct = actual > 0 ? Math.round(((m.allotment?.total_leads || 0) / actual) * 100) : 0;
                    return (
                      <tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer' }}>
                        <td style={{ paddingLeft: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {m.seller_name}
                          {m.isAbsent && <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absent</span>}
                        </td>
                        <td>{planned}</td>
                        <td>{dynLta}</td>
                        <td>{hygLta}</td>
                        <td>{rev1Lta}</td>
                        <td style={{ color: '#22C55E', fontWeight: 600 }}>{actual}</td>
                        <td>{m.allotment?.total_leads || 0}</td>
                        <td style={{ color: fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#EAB308' : '#EF4444' }}>{fulfPct}%</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      ) : (
      <>
      {/* Global summary bar */}`;
code = code.replace(s9StartStr, s9StartRepl);

// Fix correct % of fulfillment
code = code.replace(
  `const gFulfPct = g.agg.teamActual > 0 ? Math.min(100, Math.round((g.agg.totalLeads / g.agg.teamActual) * 100)) : 0;`,
  `const gFulfPct = g.agg.teamActual > 0 ? Math.round((g.agg.totalLeads / g.agg.teamActual) * 100) : 0;`
);

code = code.replace(
  `const fulfPct = actual > 0 ? Math.min(100, Math.round(((m.allotment?.total_leads || 0) / actual) * 100)) : 0;`,
  `const fulfPct = actual > 0 ? Math.round(((m.allotment?.total_leads || 0) / actual) * 100) : 0;`
);

// We also need to fix the global one if it exists
code = code.replace(
  `globalFinalLta > 0 ? Math.min(100, Math.round((globalLeads / globalFinalLta) * 100)) : 0`,
  `globalFinalLta > 0 ? Math.round((globalLeads / globalFinalLta) * 100) : 0`
);
code = code.replace(
  `globalFinalLta > 0 ? Math.min(100, Math.round((globalLeads / globalFinalLta) * 100)) : 0`,
  `globalFinalLta > 0 ? Math.round((globalLeads / globalFinalLta) * 100) : 0`
);
code = code.replace(
  `width: \`\${Math.min(100, gFulfPct)}%\``,
  `width: \`\${gFulfPct}%\``
);
code = code.replace(
  `width: \`\${Math.min(100, fulfPct)}%\``,
  `width: \`\${fulfPct}%\``
);

// Remove the view funnel button
const viewFunnelStr = `<button
                onClick={(e) => { e.stopPropagation(); setActiveFunnelTl(g); setShowTeamFunnel(true); }}
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3B82F6', padding: '6px 12px', borderRadius: '7px', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
              >
                View Funnel
              </button>`;
code = code.replaceAll(viewFunnelStr, ``);

// Close the <></> block after S9 end
const s9EndStr = `    </div>
  )
}

{/* S4: Appetite Fulfillment & C→A Time */ }`;
const s9EndRepl = `      </>
      )}
    </div>
  )
}

{/* S4: Appetite Fulfillment & C→A Time */ }`;
code = code.replace(s9EndStr, s9EndRepl);

fs.writeFileSync(file, code);
