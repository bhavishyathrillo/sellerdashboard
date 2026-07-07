const fs = require('fs');
const file = 'components/pages/L1SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)",
  `const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)
  const [s1View, setS1View] = useState<'cards'|'table'>('cards')`
);

const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px', marginLeft: '12px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

const s1HeaderStr = `<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>\n        <div className={styles.headerLeft}>\n          <span className={styles.chevron} style={{ transform: activeSectionModal === 's1' ? 'rotate(90deg)' : 'none' }}>▶</span>\n          <h2 className={styles.sectionTitle}>Login & Availability</h2>\n        </div>\n        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>\n      </div>`;

const s1HeaderRepl = `<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>\n        <div className={styles.headerLeft}>\n          <span className={styles.chevron} style={{ transform: activeSectionModal === 's1' ? 'rotate(90deg)' : 'none' }}>▶</span>\n          <h2 className={styles.sectionTitle}>Login & Availability</h2>\n        </div>\n        <div style={{ display: 'flex', alignItems: 'center' }}>\n          <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>\n${toggleUI('S1View')}\n        </div>\n      </div>`;

code = code.replace(s1HeaderStr, s1HeaderRepl);

const s1TableWrapStr = `{activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>`;
          
const s1CardsStr = `{activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
          {s1View === 'table' ? (
          <div className={styles.tableWrap}>`;

code = code.replace(s1TableWrapStr, s1CardsStr);

const s1EndStr = `                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}`;

const s1CardsEndStr = `                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processedGroups.map((g: any) => (
                <div key={g.l2_email} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div onClick={() => toggleTl(g.l2_email, setExpandedTlS1, expandedTlS1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ transform: expandedTlS1 === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#C9A84C', fontSize: '0.8rem' }}>▶</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' }}>{g.l2_name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8A8278', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{g.members.length} sellers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#8A8278' }}>Avg Login:</span> <span style={{ fontWeight: 700, color: '#E5E7EB' }}>{g.agg.avgLoginStr}</span></div>
                      <div><span style={{ color: '#8A8278' }}>Avg Break:</span> <span style={{ fontWeight: 700, color: '#E5E7EB' }}>{g.agg.tlAvgBreak}m</span></div>
                    </div>
                  </div>
                  
                  {expandedTlS1 === g.l2_email && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                      {g.members.map((m: any) => {
                        const late = isLate(m);
                        const b = parseBreaks(m.attendance?.break_timestamps);
                        const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at);
                        return (
                          <div key={m.seller_email} onClick={() => setDrillSellerTimeline(m)} style={{ background: '#0A0A0A', border: \`1px solid \${late ? 'rgba(239,68,68,0.3)' : '#1A1A1A'}\`, borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.seller_name}
                              </div>
                              {m.isAbsent && <span style={{ fontSize: '0.5rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ABSENT</span>}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Orbit Login</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E5E7EB' }}>{formatTime(m.attendance?.first_login) || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Ozonetel Ready</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E5E7EB' }}>{formatTime(m.cti?.logged_in_at) || '—'}</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Delta</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: late ? '#EF4444' : '#22C55E' }}>{delta !== null ? \`\${delta}m\` : '—'}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Break</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{b.totalMinutes > 0 ? \`\${b.totalMinutes}m\` : '—'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}`;

code = code.replace(s1EndStr, s1CardsEndStr);

fs.writeFileSync(file, code);
