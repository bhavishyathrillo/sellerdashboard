const fs = require('fs');

['components/pages/L1SellerViewPage.tsx', 'components/pages/L2SellerViewPage.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');

  // Fix 1: hourly_allotment_summary -> hourly
  code = code.replace(/m\.hourly_allotment_summary/g, 'm.hourly');

  // Fix 2: Add flexShrink: 0 to funnel wrapper
  // In L1/L2 we have: style={{ display: 'flex', alignItems: 'stretch', minWidth: 0, opacity: isNotUsed ? 0.6 : 1 }}
  code = code.replace(
    /style=\{\{ display: 'flex', alignItems: 'stretch', minWidth: 0, opacity/g,
    "style={{ display: 'flex', alignItems: 'stretch', minWidth: 0, flexShrink: 0, opacity"
  );
  
  fs.writeFileSync(file, code);
  console.log('Fixed hourly and funnel shrink in', file);
});
