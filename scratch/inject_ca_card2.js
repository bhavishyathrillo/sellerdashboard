const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

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
    // Find the end of PAX Distribution by looking for the S1 header immediately following the grid.
    const splitKey = `        <div className={styles.sectionHeaderCollapsible} onClick={() => setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')}>`;
    const index = l1.indexOf(splitKey);
    if (index > -1) {
        // We need to inject it before the last </div> that closes the grid.
        // The grid structure is:
        //   <div grid>
        //     <div dot/>
        //     <div allotment/>
        //     <div pax/>
        //   </div>
        //   <div S1 header>
        
        // Let's find the `</div>` just before S1 header.
        const beforeS1 = l1.substring(0, index);
        const lastDivIndex = beforeS1.lastIndexOf('</div>');
        if (lastDivIndex > -1) {
            l1 = beforeS1.substring(0, lastDivIndex) + cardInjection + '\n        </div>\n\n' + l1.substring(index);
        }
    }
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
console.log('Injected CA Monthly UI Card');
