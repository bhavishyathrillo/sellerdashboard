const fs = require('fs');
let content = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
content = content.replace(/\\\$/g, '$').replace(/\\`/g, '`');
fs.writeFileSync('components/pages/L1SellerViewPage.tsx', content);
console.log('Fixed escaping in L1SellerViewPage.tsx');
