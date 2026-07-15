const fs = require('fs');
['src/features/tl/L1SellerViewPage.tsx', 'src/features/cm/L2SellerViewPage.tsx'].forEach(p => {
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/from '\.\/SellerViewPage\.module\.css'/g, "from '../seller/SellerViewPage.module.css'");
  fs.writeFileSync(p, content, 'utf8');
});
