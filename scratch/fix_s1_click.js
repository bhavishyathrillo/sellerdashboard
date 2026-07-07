const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

const s1Start = l1.indexOf('{/* S1: Login & Availability */}');
const s2Start = l1.indexOf('{/* S2: Break / Unavailability */}');

if (s1Start > -1 && s2Start > -1) {
    let s1Chunk = l1.substring(s1Start, s2Start);
    s1Chunk = s1Chunk.replace(
        /<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\} style=\{late \? \{ backgroundColor: 'rgba\(239,68,68,0\.05\)' \} : \{\}\}>/,
        `<tr key={m.seller_email} className={\`\${styles.sellerRow} \${m.isAbsent ? styles.absentRow : ''}\`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: 'pointer', ...(late ? { backgroundColor: 'rgba(239,68,68,0.05)' } : {}) }}>`
    );
    l1 = l1.substring(0, s1Start) + s1Chunk + l1.substring(s2Start);
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
    console.log('Fixed S1 onClick');
} else {
    console.log('Could not find S1 or S2 start');
}
