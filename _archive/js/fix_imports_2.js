const fs = require('fs');
['src/features/tl/L1SellerViewPage.tsx', 'src/features/cm/L2SellerViewPage.tsx'].forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/from '\.\/SellerViewPage'/g, "from '../seller/SellerViewPage'");
  content = content.replace(/from '\.\/SellerTimelineModal'/g, "from '../seller/SellerTimelineModal'"); // Just in case
  fs.writeFileSync(p, content, 'utf8');
});
