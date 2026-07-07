const fs = require('fs');

function fix(file, activeVar, extraCode) {
  let content = fs.readFileSync(file, 'utf8');
  // I know the buggy line looks like: onClick={() => { ... null}
  // Let's just find "Allotment Breakdown</div>" and look above it.
  
  // Actually, I can just replace the whole onClick line with the correct one.
  const regex = /onClick=\{([^\}]+)\}/; // This will find the broken one! Wait, we know the exact string because it is broken!
  
  if (file.includes('AdminLTAPage')) {
    content = content.replace(/onClick=\{\(\) => \{ setActiveCard\(activeCard === 'allotment' \? null : 'allotment'\); setExpandedTlKey\(null\}/, 
      "onClick={() => { setActiveCard(activeCard === 'allotment' ? null : 'allotment'); setExpandedTlKey(null); }}");
  } else if (file.includes('L1SellerViewPage')) {
    content = content.replace(/onClick=\{\(\) => \{ setActiveBreakdownCard\(activeBreakdownCard === 'allotment' \? null : 'allotment'\); setBreakdownDrillSeller\(null\); setBreakdownExpandedTl\(null\)/,
      "onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'allotment' ? null : 'allotment'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}");
  } else if (file.includes('L2SellerViewPage')) {
    content = content.replace(/onClick=\{\(\) => \{ setActiveBreakdownCard\(activeBreakdownCard === 'allotment' \? null : 'allotment'\); setBreakdownDrillSeller\(null\); setBreakdownExpandedTl\(null\)/,
      "onClick={() => { setActiveBreakdownCard(activeBreakdownCard === 'allotment' ? null : 'allotment'); setBreakdownDrillSeller(null); setBreakdownExpandedTl(null); }}");
  }
  
  fs.writeFileSync(file, content);
  console.log("Fixed " + file);
}

fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L1SellerViewPage.tsx');
fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L2SellerViewPage.tsx');
fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx');
