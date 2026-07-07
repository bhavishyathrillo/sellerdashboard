const fs = require('fs');
const file = 'components/pages/L1SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add states
code = code.replace(
  "const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)",
  `const [s1View, setS1View] = useState<'cards'|'table'>('cards')
  const [s2View, setS2View] = useState<'cards'|'table'>('cards')
  const [s3View, setS3View] = useState<'cards'|'table'>('cards')
  const [s5View, setS5View] = useState<'cards'|'table'>('cards')
  const [s7View, setS7View] = useState<'cards'|'table'>('cards')
  const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)`
);

const toggleUI = (stateVarLower, stateVarUpper) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px', marginLeft: '12px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVarUpper}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVarLower}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVarLower}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVarUpper}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVarLower}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVarLower}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

function patchHeader(sectionId, stateVarLower, stateVarUpper, titleMatch) {
  const matchRegex = new RegExp(`<div className=\\{styles\\.sectionHeaderCollapsible\\} onClick=\\{\\(\\) => setActiveSectionModal\\(activeSectionModal === '${sectionId}' \\? null : '${sectionId}'\\)\\}\\>[\\s\\S]*?\\<h2 className=\\{styles\\.sectionTitle\\}[\\s\\S]*?\\</h2\\>[\\s\\S]*?\\<div style=\\{\\{ fontSize: '0\\.75rem', padding: '4px 12px'[\\s\\S]*?\\</div\\>\\s*\\</div\\>`);
  
  const repl = `<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === '${sectionId}' ? null : '${sectionId}')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === '${sectionId}' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}${titleMatch.includes('style') ? ` style={{ display: 'flex', alignItems: 'center' }}` : ''}>
      ${titleMatch.replace(/<[^>]+>/g, '').trim()}
    </h2>
  </div>
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
${toggleUI(stateVarLower, stateVarUpper)}
  </div>
</div>`;
  code = code.replace(matchRegex, repl);
}

function patchSection(sectionId, stateVar, endMarkerStr, startCardsStr, endCardsRepl) {
  const startStr = `{
  activeSectionModal === '${sectionId}' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>`;
  code = code.replace(startStr, startCardsStr);
  
  const idx = code.indexOf(endMarkerStr, code.indexOf(`activeSectionModal === '${sectionId}'`));
  if (idx !== -1) {
    code = code.substring(0, idx) + endCardsRepl + code.substring(idx + endMarkerStr.length);
  }
}

// ----------------------------------------------------------------------
// S1: Login
// ----------------------------------------------------------------------
patchHeader('s1', 's1View', 'S1View', 'Login & Availability');

const s1StartStr = `{
      activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
          <div className={styles.tableWrap}>`;
const s1StartRepl = `{
      activeSectionModal === 's1' && (
        <div className={sellerStyles.sectionContent}>
          {s1View === 'table' ? (
          <div className={styles.tableWrap}>`;
code = code.replace(s1StartStr, s1StartRepl);

const s1EndStr = `                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}`;
const s1EndRepl = `                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
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
                        const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at);
                        const b = parseBreaks(m.attendance?.break_timestamps);
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
const idxS1 = code.indexOf(s1EndStr, code.indexOf("activeSectionModal === 's1'"));
if(idxS1 !== -1) code = code.substring(0, idxS1) + s1EndRepl + code.substring(idxS1 + s1EndStr.length);

// ----------------------------------------------------------------------
// S2: Break
// ----------------------------------------------------------------------
patchHeader('s2', 's2View', 'S2View', 'Break / Unavailability');
const s2StartRepl = `{
  activeSectionModal === 's2' && (
    <div className={sellerStyles.sectionContent}>
      {s2View === 'table' ? (
      <div className={styles.tableWrap}>`;
const s2EndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s2EndRepl = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processedGroups.map((g: any) => (
                <div key={g.l2_email} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div onClick={() => toggleTl(g.l2_email, setExpandedTlS2, expandedTlS2)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ transform: expandedTlS2 === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#C9A84C', fontSize: '0.8rem' }}>▶</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' }}>{g.l2_name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8A8278', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{g.members.length} sellers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#8A8278' }}>Team Break:</span> <span style={{ fontWeight: 700, color: '#E5E7EB' }}>{g.agg.tlTotalBreak}m</span></div>
                      <div><span style={{ color: '#8A8278' }}>Avg Break %:</span> <span style={{ fontWeight: 700, color: '#E5E7EB' }}>{g.agg.onlineCount > 0 ? Math.round((g.agg.tlTotalBreak / (g.agg.onlineCount * 9 * 60)) * 100) : 0}%</span></div>
                    </div>
                  </div>
                  
                  {expandedTlS2 === g.l2_email && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                      {g.members.map((m: any) => {
                        const b = parseBreaks(m.attendance?.break_timestamps);
                        const brkPct = m.cti?.logged_in_time > 0 ? Math.round((b.totalMinutes / m.cti.logged_in_time) * 100) : 0;
                        const isHigh = brkPct > 15;
                        return (
                          <div key={m.seller_email} onClick={() => setDrillSellerTimeline(m)} style={{ background: '#0A0A0A', border: \`1px solid \${isHigh ? 'rgba(239,68,68,0.3)' : '#1A1A1A'}\`, borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.seller_name}
                              </div>
                              {m.isAbsent && <span style={{ fontSize: '0.5rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ABSENT</span>}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Total Break</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isHigh ? '#EF4444' : '#E5E7EB' }}>{b.totalMinutes}m</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Break %</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isHigh ? '#EF4444' : '#E5E7EB' }}>{brkPct}%</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Instances</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{b.count}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Longest</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{b.longestMinutes}m</div>
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
  )
}`;
patchSection('s2', 's2View', s2EndStr, s2StartRepl, s2EndRepl);

// ----------------------------------------------------------------------
// S3: RTG vs Non-RTG (This is marked as activeSectionModal === 's3')
// ----------------------------------------------------------------------
patchHeader('s3', 's3View', 'S3View', 'RTG vs Non-RTG');
const s3StartRepl = `{
  activeSectionModal === 's3' && (
    <div className={sellerStyles.sectionContent}>
      {s3View === 'table' ? (
      <div className={styles.tableWrap}>`;
const s3EndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s3EndRepl = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processedGroups.map((g: any) => (
                <div key={g.l2_email} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div onClick={() => toggleTl(g.l2_email, setExpandedTlS3, expandedTlS3)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ transform: expandedTlS3 === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#C9A84C', fontSize: '0.8rem' }}>▶</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' }}>{g.l2_name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8A8278', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{g.members.length} sellers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#8A8278' }}>RTG:</span> <span style={{ fontWeight: 700, color: '#3B82F6' }}>{g.agg.totalRtg}</span></div>
                      <div><span style={{ color: '#8A8278' }}>Non-RTG:</span> <span style={{ fontWeight: 700, color: '#F4631E' }}>{g.agg.totalNonRtg}</span></div>
                    </div>
                  </div>
                  
                  {expandedTlS3 === g.l2_email && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                      {g.members.map((m: any) => {
                        const rtg = m.allotment?.rtg_leads || 0;
                        const nonRtg = m.allotment?.non_rtg_leads || 0;
                        const tot = rtg + nonRtg;
                        const rtgPct = tot > 0 ? Math.round((rtg / tot) * 100) : 0;
                        return (
                          <div key={m.seller_email} onClick={() => setDrillSellerTimeline(m)} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.seller_name}
                              </div>
                              {m.isAbsent && <span style={{ fontSize: '0.5rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ABSENT</span>}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>RTG Leads</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3B82F6' }}>{rtg}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Non-RTG Leads</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4631E' }}>{nonRtg}</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Total</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{tot}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>RTG %</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{rtgPct}%</div>
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
  )
}`;
patchSection('s3', 's3View', s3EndStr, s3StartRepl, s3EndRepl);

// ----------------------------------------------------------------------
// S5: Pax Bifurcation (This is marked as activeSectionModal === 's5')
// ----------------------------------------------------------------------
patchHeader('s5', 's5View', 'S5View', 'Pax Bifurcation');
const s5StartRepl = `{
  activeSectionModal === 's5' && (
    <div className={sellerStyles.sectionContent}>
      {s5View === 'table' ? (
      <div className={styles.tableWrap}>`;
const s5EndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s5EndRepl = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processedGroups.map((g: any) => (
                <div key={g.l2_email} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div onClick={() => toggleTl(g.l2_email, setExpandedTlS5, expandedTlS5)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ transform: expandedTlS5 === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#C9A84C', fontSize: '0.8rem' }}>▶</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' }}>{g.l2_name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8A8278', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{g.members.length} sellers</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
                      <div><span style={{ color: '#8A8278' }}>Total Pax:</span> <span style={{ fontWeight: 700, color: '#F4631E' }}>{g.agg.totalPax}</span></div>
                    </div>
                  </div>
                  
                  {expandedTlS5 === g.l2_email && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                      {g.members.map((m: any) => {
                        const p1 = m.allotment?.pax_1 || 0
                        const p2 = m.allotment?.pax_2 || 0
                        const p3 = m.allotment?.pax_3 || 0
                        const p4 = m.allotment?.pax_4 || 0
                        const p4plus = m.allotment?.pax_4_plus || 0
                        const tot = p1 + p2 + p3 + p4 + p4plus
                        return (
                          <div key={m.seller_email} onClick={() => setDrillSellerTimeline(m)} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.seller_name}
                              </div>
                              {m.isAbsent && <span style={{ fontSize: '0.5rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ABSENT</span>}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Total Pax</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4631E' }}>{tot}</div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                              <div style={{display:'flex',gap:'8px'}}>
                                <div><div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>1-pax</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{p1}</div></div>
                                <div><div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>2-pax</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{p2}</div></div>
                                <div><div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>3-pax</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{p3}</div></div>
                                <div><div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>4-pax</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{p4}</div></div>
                                <div><div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>4+ pax</div><div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{p4plus}</div></div>
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
  )
}`;
patchSection('s5', 's5View', s5EndStr, s5StartRepl, s5EndRepl);

// ----------------------------------------------------------------------
// S7_CM: First Lead
// ----------------------------------------------------------------------
patchHeader('s7_cm', 's7View', 'S7View', 'First Lead Received Time');
const s7StartRepl = `{
  activeSectionModal === 's7_cm' && (
    <div className={sellerStyles.sectionContent}>
      {s7View === 'table' ? (
      <div className={styles.tableWrap}>`;
const s7EndStr = `                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s7EndRepl = `                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processedGroups.map((g: any) => (
                <div key={g.l2_email} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
                  <div onClick={() => toggleTl(g.l2_email, setExpandedTlS7, expandedTlS7)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ transform: expandedTlS7 === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#C9A84C', fontSize: '0.8rem' }}>▶</span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F0EDE8' }}>{g.l2_name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#8A8278', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{g.members.length} sellers</span>
                    </div>
                  </div>
                  
                  {expandedTlS7 === g.l2_email && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                      {g.members.map((m: any) => {
                        const firstLead = m.allotment?.first_lead_time;
                        return (
                          <div key={m.seller_email} onClick={() => setDrillSellerTimeline(m)} style={{ background: '#0A0A0A', border: '1px solid #1A1A1A', borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.seller_name}
                              </div>
                              {m.isAbsent && <span style={{ fontSize: '0.5rem', color: '#EF4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ABSENT</span>}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                              <div>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>Orbit Login</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#E5E7EB' }}>{formatTime(m.attendance?.first_login) || '—'}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.5rem', color: '#8A8278', textTransform: 'uppercase' }}>First Lead</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#3B82F6' }}>{formatTime(firstLead) || '—'}</div>
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
  )
}`;
patchSection('s7_cm', 's7View', s7EndStr, s7StartRepl, s7EndRepl);

fs.writeFileSync(file, code);
