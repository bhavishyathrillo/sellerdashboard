const fs = require('fs');
const file = 'components/pages/L1SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px', marginLeft: '12px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

function patchHeader(sectionId, stateVar, titleMatch) {
  const match = new RegExp(`<div className=\\{styles\\.sectionHeaderCollapsible\\} onClick=\\{\\(\\) => setActiveSectionModal\\(activeSectionModal === '${sectionId}' \\? null : '${sectionId}'\\)\\}\\>[\\s\\S]*?\\<h2 className=\\{styles\\.sectionTitle\\}[\\s\\S]*?\\</h2\\>[\\s\\S]*?\\<div style=\\{\\{ fontSize: '0\\.75rem', padding: '4px 12px'[\\s\\S]*?\\</div\\>\\s*\\</div\\>`);
  
  const repl = `<div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === '${sectionId}' ? null : '${sectionId}')}>
  <div className={styles.headerLeft}>
    <span className={styles.chevron} style={{ transform: activeSectionModal === '${sectionId}' ? 'rotate(90deg)' : 'none' }}>▶</span>
    <h2 className={styles.sectionTitle}${titleMatch.includes('style') ? ` style={{ display: 'flex', alignItems: 'center' }}` : ''}>
      ${titleMatch.replace(/<[^>]+>/g, '').trim()}
    </h2>
  </div>
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>
${toggleUI(stateVar)}
  </div>
</div>`;
  code = code.replace(match, repl);
}

// S5 Pax
patchHeader('s5', 's5View', 'Pax Bifurcation');

const s5Start = `{
  activeSectionModal === 's5' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>`;
const s5CardsStr = `{
  activeSectionModal === 's5' && (
    <div className={sellerStyles.sectionContent}>
      {s5View === 'table' ? (
      <div className={styles.tableWrap}>`;
code = code.replace(s5Start, s5CardsStr);

const s5EndRegex = /\{\/\* S7: First Lead Received Time \(CM EXCLUSIVE\) \*\/ \}/;
const s5Code = code.substring(0, code.search(s5EndRegex));
const s5TableEndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s5TableEndRepl = `              </React.Fragment>
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
const s5Index = code.lastIndexOf(s5TableEndStr, code.search(s5EndRegex));
code = code.substring(0, s5Index) + s5TableEndRepl + code.substring(s5Index + s5TableEndStr.length);

// S7 First Lead
patchHeader('s7_cm', 's7View', 'First Lead Received Time');

const s7Start = `{
  activeSectionModal === 's7_cm' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>`;
const s7CardsStr = `{
  activeSectionModal === 's7_cm' && (
    <div className={sellerStyles.sectionContent}>
      {s7View === 'table' ? (
      <div className={styles.tableWrap}>`;
code = code.replace(s7Start, s7CardsStr);

const s7TableEndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s7TableEndRepl = `              </React.Fragment>
            ))}
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
const s7Index = code.lastIndexOf(s7TableEndStr);
code = code.substring(0, s7Index) + s7TableEndRepl + code.substring(s7Index + s7TableEndStr.length);

fs.writeFileSync(file, code);
