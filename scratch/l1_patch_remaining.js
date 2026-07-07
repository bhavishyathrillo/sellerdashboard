const fs = require('fs');
const file = 'components/pages/L1SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add states
code = code.replace(
  "const [s1View, setS1View] = useState<'cards'|'table'>('cards')",
  `const [s1View, setS1View] = useState<'cards'|'table'>('cards')
  const [s2View, setS2View] = useState<'cards'|'table'>('cards')
  const [s3View, setS3View] = useState<'cards'|'table'>('cards')
  const [s5View, setS5View] = useState<'cards'|'table'>('cards')
  const [s7View, setS7View] = useState<'cards'|'table'>('cards')`
);

const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px', marginLeft: '12px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

// Helper for replacing Headers
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

// S2 Header
patchHeader('s2', 'S2View', 'Break / Unavailability');

// S2 Wrap Replace
const s2Start = `{
  activeSectionModal === 's2' && (
    <div className={sellerStyles.sectionContent}>
      <div className={styles.tableWrap}>`;
const s2CardsStr = `{
  activeSectionModal === 's2' && (
    <div className={sellerStyles.sectionContent}>
      {s2View === 'table' ? (
      <div className={styles.tableWrap}>`;
code = code.replace(s2Start, s2CardsStr);

const s2EndRegex = /\{\/\* S3: RTG vs Non-RTG \*\/ \}/;
const s2Code = code.substring(0, code.search(s2EndRegex));
const s2TableEndStr = `              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}`;
const s2TableEndRepl = `              </React.Fragment>
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
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A1A1AA' }}>{b.maxMinutes}m</div>
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
const s2Index = code.lastIndexOf(s2TableEndStr, code.search(s2EndRegex));
code = code.substring(0, s2Index) + s2TableEndRepl + code.substring(s2Index + s2TableEndStr.length);

fs.writeFileSync(file, code);
