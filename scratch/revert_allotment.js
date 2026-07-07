const fs = require('fs');

function revert(file, rowsVar, totalLeadsVar) {
  let content = fs.readFileSync(file, 'utf8');

  // Search for the section: {/* ── Allotment Breakdown ── */}
  const searchStart = '{/* ── Allotment Breakdown ── */}';
  const searchEnd = '{/* ── PAX Distribution ── */}';
  
  const idx1 = content.indexOf(searchStart);
  const idx2 = content.indexOf(searchEnd);
  
  if (idx1 === -1 || idx2 === -1) {
    console.log("Could not find sections in " + file);
    return;
  }
  
  const block = content.substring(idx1, idx2);
  let clickHandlerMatch = block.match(/onClick=\{([^\}]+)\}/);
  let clickHandler = clickHandlerMatch ? `onClick={${clickHandlerMatch[1]}}` : '';

  let styleMatch = block.match(/style=\{([^>]+)\}/);
  let style = styleMatch ? `style={${styleMatch[1]}}` : '';
  
  let newBlock = `{/* ── Allotment Breakdown ── */}
        <div ${style} ${clickHandler}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {${rowsVar}.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.64rem', color: '#8A8278', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.value > 0 ? item.color : '#5A5650' }}>{item.value}</span>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 600, color: item.color,
                  background: \`\${item.color}15\`, padding: '2px 8px', borderRadius: '100px',
                }}>
                  {${totalLeadsVar} > 0 ? Math.round((item.value / ${totalLeadsVar}) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        `;
        
  content = content.substring(0, idx1) + newBlock + content.substring(idx2);
  fs.writeFileSync(file, content);
  console.log("Reverted in " + file);
}

revert('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L1SellerViewPage.tsx', 'cmAllotmentRows', 'cmMonthlyTotalLeads');
revert('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L2SellerViewPage.tsx', 'tlAllotmentRows', 'tlTotalLeads');
revert('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx', 'allotmentRows', 'totalLeads');
