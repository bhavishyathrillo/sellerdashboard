const fs = require('fs');
const file = 'components/pages/L2SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

// S3
code = code.replace(
  `<h2 className={styles.sectionTitle}>Break / Unavailability</h2>\n        </div>\n      </div>`,
  `<h2 className={styles.sectionTitle}>Break / Unavailability</h2>\n        </div>\n${toggleUI('S3View')}\n      </div>`
);

// We need to replace the content of S3. The regex for S3 content is tricky. We'll use string replacement.
const s3Table = `<div className={sellerStyles.sectionContent}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Total Break</th>
                      <th>Break %</th>`;
                      
const s3Cards = `<div className={sellerStyles.sectionContent}>
          {s3View === 'table' ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Total Break</th>
                      <th>Break %</th>`;

code = code.replace(s3Table, s3Cards);

const s3TableEnd = `                    })}
                  </tbody>
                </table>
              </div>
        </div>`;
const s3CardsEnd = `                    })}
                  </tbody>
                </table>
              </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {enrichedMembers.slice().sort((a: any,b: any) => {
                  const bA = parseBreaks(a.attendance?.break_timestamps).totalMinutes;
                  const bB = parseBreaks(b.attendance?.break_timestamps).totalMinutes;
                  return bB - bA;
                }).map((m: any) => {
                   const b = parseBreaks(m.attendance?.break_timestamps)
                   const pct = b.totalMinutes > 0 ? Math.round((b.totalMinutes / (9*60))*100) : 0
                   const highBreak = pct > 15
                   return (
                     <div key={m.seller_email} onClick={() => setDrillSellerS3(m)} style={{ background: '#0A0A0A', border: \`1px solid \${highBreak ? 'rgba(239,68,68,0.3)' : '#1A1A1A'}\`, borderRadius: '10px', padding: '12px', cursor: 'pointer' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8' }}>
                           {m.seller_name}
                         </div>
                       </div>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                         <div>
                           <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Total Break</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: 800, color: highBreak ? '#EF4444' : '#E5E7EB' }}>{b.totalMinutes > 0 ? \`\${b.totalMinutes}m\` : '—'}</div>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Allowed 60m</div>
                           <div style={{ fontSize: '0.85rem', fontWeight: 700, color: highBreak ? '#EF4444' : '#22C55E' }}>{pct}% used</div>
                         </div>
                       </div>
                       
                       <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                         <div style={{ height: '100%', background: highBreak ? '#EF4444' : '#22C55E', width: \`\${Math.min(pct, 100)}%\` }} />
                       </div>
                     </div>
                   )
                })}
             </div>
          )}
        </div>`;
code = code.replace(s3TableEnd, s3CardsEnd);

// S5 (RTG vs Non-RTG)
code = code.replace(
  `<h2 className={styles.sectionTitle}>RTG vs Non-RTG</h2>\n        </div>\n        <div style={{ fontSize: '0.65rem', color: '#8A8278', display: 'flex', gap: '16px', alignItems: 'center' }}>`,
  `<h2 className={styles.sectionTitle}>RTG vs Non-RTG</h2>\n        </div>\n        <div style={{ fontSize: '0.65rem', color: '#8A8278', display: 'flex', gap: '16px', alignItems: 'center' }}>\n${toggleUI('S5View')}`
);

const s5Table = `<div className={sellerStyles.sectionContent}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Total Leads</th>`;
const s5Cards = `<div className={sellerStyles.sectionContent}>
          {s5View === 'table' ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Total Leads</th>`;
code = code.replace(s5Table, s5Cards);

const s5TableEnd = `                    })}
                  </tbody>
                </table>
              </div>
        </div>`;
const s5CardsEnd = `                    })}
                  </tbody>
                </table>
              </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {enrichedMembers.slice().sort((a: any,b: any) => {
                  const totA = (a.allotment?.rtg_leads || 0) + (a.allotment?.non_rtg_leads || 0)
                  const totB = (b.allotment?.rtg_leads || 0) + (b.allotment?.non_rtg_leads || 0)
                  return totB - totA
                }).map((m: any) => {
                  const rtg = m.allotment?.rtg_leads || 0
                  const nonRtg = m.allotment?.non_rtg_leads || 0
                  const tot = rtg + nonRtg
                  const pct = tot > 0 ? Math.round((rtg / tot) * 100) : 0
                  
                  return (
                     <div key={m.seller_email} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8' }}>
                           {m.seller_name}
                         </div>
                         <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E5E7EB' }}>
                           {tot}
                         </div>
                       </div>
                       
                       <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                         {tot > 0 ? (
                           <>
                             <div style={{ width: \`\${pct}%\`, background: '#3B82F6' }} />
                             <div style={{ width: \`\${100 - pct}%\`, background: '#6B7280' }} />
                           </>
                         ) : (
                           <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)' }} />
                         )}
                       </div>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                         <div><span style={{ color: '#3B82F6', fontWeight: 700 }}>{rtg}</span> <span style={{ color: '#8A8278' }}>RTG</span></div>
                         <div><span style={{ color: '#6B7280', fontWeight: 700 }}>{nonRtg}</span> <span style={{ color: '#8A8278' }}>Non-RTG</span></div>
                         <div style={{ fontWeight: 700, color: pct >= 50 ? '#22C55E' : '#EAB308' }}>{pct}%</div>
                       </div>
                     </div>
                  )
                })}
             </div>
          )}
        </div>`;
code = code.replace(s5TableEnd, s5CardsEnd);


// S9 (LTA)
code = code.replace(
  `<h2 className={styles.sectionTitle}>LTA (Lead Time Availability)</h2>\n        </div>\n        <div style={{ fontSize: '0.65rem', color: '#8A8278', display: 'flex', gap: '16px', alignItems: 'center' }}>`,
  `<h2 className={styles.sectionTitle}>LTA (Lead Time Availability)</h2>\n        </div>\n        <div style={{ fontSize: '0.65rem', color: '#8A8278', display: 'flex', gap: '16px', alignItems: 'center' }}>\n${toggleUI('S9View')}`
);

const s9Table = `<div className={sellerStyles.sectionContent}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Planned LTA</th>`;
const s9Cards = `<div className={sellerStyles.sectionContent}>
          {s9View === 'table' ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Planned LTA</th>`;
code = code.replace(s9Table, s9Cards);

const s9TableEnd = `                    })}
                  </tbody>
                </table>
              </div>
        </div>`;
const s9CardsEnd = `                    })}
                  </tbody>
                </table>
              </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {enrichedMembers.slice().sort((a: any,b: any) => {
                  const fA = a.lta?.actual || 0
                  const fB = b.lta?.actual || 0
                  return fB - fA
                }).map((m: any) => {
                    const leads = (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0);
                    const fulfPct = m.lta?.actual > 0 ? Math.round((leads / m.lta.actual) * 100) : 0;
                    const lostPct = m.lta?.planned > 0 ? ((m.lta.totalLost || 0) / m.lta.planned) * 100 : 0;
                    const ltaColor = lostPct < 5 ? '#22C55E' : lostPct <= 15 ? '#EAB308' : '#EF4444';
                    const fulfColor = fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#EAB308' : '#EF4444';
                  
                  return (
                     <div key={m.seller_email} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8' }}>
                           {m.seller_name}
                         </div>
                       </div>
                       
                       <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Planned</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#8A8278' }}>{m.lta?.planned || 0}</div>
                          </div>
                          <div style={{ color: '#2A2A2A', alignSelf: 'center', fontSize: '0.7rem' }}>→</div>
                          <div>
                            <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Final</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: ltaColor }}>{m.lta?.actual || 0}</div>
                          </div>
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.45rem', color: '#5A5650', marginBottom: '1px', textTransform: 'uppercase' }}>Allotted</div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F0EDE8' }}>{leads}</div>
                          </div>
                        </div>
                        
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: fulfColor, width: \`\${Math.min(fulfPct, 100)}%\` }} />
                        </div>
                     </div>
                  )
                })}
             </div>
          )}
        </div>`;
code = code.replace(s9TableEnd, s9CardsEnd);

fs.writeFileSync(file, code);
