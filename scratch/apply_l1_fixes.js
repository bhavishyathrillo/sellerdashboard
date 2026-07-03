const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../components/pages/L1SellerViewPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Fix Team LTA calculations to ignore isAbsent
content = content.replace(
    /const teamPlanned = members\.reduce\(\(sum: number, m: any\) => sum \+ \(m\.isAbsent \? 0 : m\.lta\.planned\), 0\)/g,
    'const teamPlanned = members.reduce((sum: number, m: any) => sum + m.lta.planned, 0)'
);
content = content.replace(
    /const teamActual = members\.reduce\(\(sum: number, m: any\) => sum \+ \(m\.isAbsent \? 0 : m\.lta\.actual\), 0\)/g,
    'const teamActual = members.reduce((sum: number, m: any) => sum + m.lta.actual, 0)'
);

// Fix DOT Distribution logic in S6 (remove isAbsent checks)
content = content.replace(
    /\{m\.isAbsent \? '—' : \(sellerDot\[mo\] \|\| 0\)\}/g,
    '{sellerDot[mo] || 0}'
);

// Fix S9 table rows to remove isAbsent from LTA values
content = content.replace(
    /<td>\{m\.isAbsent \? '—' : m\.lta\.planned\}<\/td>\s*<td style=\{\{color: m\.isAbsent \? 'inherit' : actualColor, fontWeight: 600\}\}>\s*\{m\.isAbsent \? '—' : m\.lta\.actual\}\s*<\/td>/g,
    '<td>{m.lta.planned}</td>\n                          <td style={{color: actualColor, fontWeight: 600}}>\n                            {m.lta.actual}\n                          </td>'
);

// Add onClick to S9 seller row
content = content.replace(
    /<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\}>/g,
    '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} onClick={() => setActiveSellerFunnel(m)} style={{ cursor: \'pointer\' }}>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed L1SellerViewPage (Attempt 2)');
