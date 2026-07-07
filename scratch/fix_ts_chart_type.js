const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/type: 'bar',/g, "type: 'bar' as const,");
  fs.writeFileSync(file, content);
  console.log("Fixed " + file);
}

fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L1SellerViewPage.tsx');
fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L2SellerViewPage.tsx');
fix('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx');
