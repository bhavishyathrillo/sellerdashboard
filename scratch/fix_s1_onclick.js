const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

l1 = l1.replace(
    /<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\} style=\{late \? \{ backgroundColor: 'rgba\\(239,68,68,0\.05\\)' \} : \{\}\}>/g,
    '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} onClick={() => setDrillSellerTimeline(m)} style={late ? { backgroundColor: \'rgba(239,68,68,0.05)\', cursor: \'pointer\' } : { cursor: \'pointer\' }}>'
);

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
