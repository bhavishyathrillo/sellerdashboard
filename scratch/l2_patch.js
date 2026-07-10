const fs = require('fs');
const file = 'components/pages/L2SellerViewPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add state variables
code = code.replace(
  "const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')",
  `const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [s1View, setS1View] = useState<'cards'|'table'>('cards')
  const [s3View, setS3View] = useState<'cards'|'table'>('cards')
  const [s5View, setS5View] = useState<'cards'|'table'>('cards')
  const [s9View, setS9View] = useState<'cards'|'table'>('cards')`
);

// Helper for toggle UI
const toggleUI = (stateVar) => `
        <div style={{display:'flex',gap:'3px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'7px',padding:'2px'}} onClick={e => e.stopPropagation()}>
          <button onClick={() => set${stateVar}('cards')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='cards'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='cards'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Cards</button>
          <button onClick={() => set${stateVar}('table')} style={{padding:'5px 10px',border:'none',borderRadius:'5px',background:${stateVar.toLowerCase()}==='table'?'rgba(244,99,30,0.15)':'transparent',color:${stateVar.toLowerCase()}==='table'?'#F4631E':'#8A8278',cursor:'pointer',fontSize:'0.65rem',fontWeight:600}}>Table</button>
        </div>
`;

// Replace S1 header
code = code.replace(
  `<h2 className={styles.sectionTitle}>Login & Availability</h2>\n        </div>\n      </div>`,
  `<h2 className={styles.sectionTitle}>Login & Availability</h2>\n        </div>\n${toggleUI('S1View')}\n      </div>`
);

// Replace S1 content
code = code.replace(
  /<div className={sellerStyles.sectionContent}>\s*<div className={styles.tableWrap}>[\s\S]*?<\/div>\s*<\/div>/,
  `<div className={sellerStyles.sectionContent}>
          {s1View === 'table' ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Orbit Login</th>
                    <th>Ozontell Ready</th>
                    <th>Delta</th>
                    <th>First Lead</th>
                    <th>Total Break</th>
                    <th>Break %</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedMembers.slice().sort((a: any,b: any) => {
                    if (a.seller_email === session.email) return -1;
                    if (b.seller_email === session.email) return 1;
                    return (parseLogin(a) || 9999) - (parseLogin(b) || 9999);
                  }).map((m: any) => {
                    const late = isLate(m)
                    const b = parseBreaks(m.attendance?.break_timestamps)
                    const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at)
                    return (
                      <tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`} style={{ ...(late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}), cursor: 'pointer' }} onClick={() => setDrillSellerS1(m)}>
                        <td>
                          {m.seller_name}
                          {m.seller_email === session.email && <span className={styles.youBadge}>(You)</span>}
                          {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
                        </td>
                        <td>{formatTime(m.attendance?.first_login)}</td>
                        <td>{formatTime(m.cti?.logged_in_at)}</td>
                        <td>{delta !== null ? \`\${delta}m\` : '—'}</td>
                        <td>{formatTime(m.allotment?.first_lead_allotted_at_ist)}</td>
                        <td>{b.totalMinutes > 0 ? \`\${b.totalMinutes}m\` : '—'}</td>
                        <td>{b.totalMinutes > 0 ? \`\${Math.round((b.totalMinutes / (9*60))*100)}%\` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {enrichedMembers.slice().sort((a: any,b: any) => {
                    if (a.seller_email === session.email) return -1;
                    if (b.seller_email === session.email) return 1;
                    return (parseLogin(a) || 9999) - (parseLogin(b) || 9999);
                }).map((m: any) => {
                   const late = isLate(m)
                   const b = parseBreaks(m.attendance?.break_timestamps)
                   const delta = minutesBetween(m.attendance?.first_login, m.cti?.logged_in_at)
                   return (
                     <div key={m.seller_email} onClick={() => setDrillSellerS1(m)} style={{ background: '#0A0A0A', border: \`1px solid \${late ? 'rgba(239,68,68,0.3)' : '#1A1A1A'}\`, borderRadius: '10px', padding: '12px', cursor: 'pointer', opacity: m.isAbsent ? 0.6 : 1 }}>
                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F0EDE8' }}>
                           {m.seller_name} {m.seller_email === session.email && <span style={{color:'#F4631E'}}>(You)</span>}
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
                   )
                })}
             </div>
          )}
        </div>`
);

fs.writeFileSync(file, code);
