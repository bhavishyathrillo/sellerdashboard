const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

const cardInjection = `
        {/* ✨ Appetite & C->A Time (Monthly) ✨ */}
        <div 
          style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => {setActiveBreakdownCard(activeBreakdownCard === 'ca' ? null : 'ca'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null);}}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appetite & C→A Time</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Horizontal Bar for Fulfillment % */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.64rem', color: '#8A8278', fontWeight: 600, textTransform: 'uppercase' }}>Fulfillment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cmMonthlyFulfPct >= 90 ? '#22C55E' : cmMonthlyFulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>{cmMonthlyFulfPct}%</span>
              </div>
              <div style={{ width: '100%', height: '18px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: \`\${Math.min(cmMonthlyFulfPct, 100)}%\`,
                  height: '100%',
                  background: cmMonthlyFulfPct >= 90 ? 'linear-gradient(90deg, #22C55E40, #22C55E90)' : cmMonthlyFulfPct >= 70 ? 'linear-gradient(90deg, #F59E0B40, #F59E0B90)' : 'linear-gradient(90deg, #EF444440, #EF444490)',
                  borderRadius: '6px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Appetite (LTA)</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F4631E' }}>{cmMonthlyAppetite}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Leads Allotted</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{cmMonthlyTotalLeads}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Avg C→A Time</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{cmMonthlyAvgCA != null ? \`\${cmMonthlyAvgCA}m\` : '—'}</span>
            </div>
          </div>
        </div>
`;

// Insert it right after the closing div of "Leads by Group Size"
// Look for cmMonthlyTotalPax
const anchor = '{cmMonthlyTotalPax > 0 ? Math.round((p.value / cmMonthlyTotalPax) * 100) : 0}%\n                </span>\n              </div>\n            ))}\n          </div>\n        </div>';
if (l1.includes(anchor)) {
    l1 = l1.replace(anchor, anchor + '\n\n' + cardInjection);
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
    console.log('Injected CA card');
} else {
    console.log('Anchor not found');
}
