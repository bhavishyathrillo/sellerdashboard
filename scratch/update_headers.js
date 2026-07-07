const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components/pages/L1SellerViewPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove prefixes S1 · through S10 ·
content = content.replace(/S\d+\s*·\s*/g, '');
// Wait, C→A time had "C A Time" in the console, but let's see. The replace should be fine.

// 2. Remove " (CM View Exclusive)"
content = content.replace(/\s*\(CM View Exclusive\)/g, '');

// 3. Add pill to the right corner
// We'll search for <div className={styles.headerLeft}>...</div> and append the pill after it, before the closing </div> of sectionHeaderCollapsible.
// The pill: <div className={styles.headerRight} style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', color: '#8A8278', fontWeight: 600 }}>{date}</div>

const headerRegex = /(<div className=\{styles\.sectionHeaderCollapsible\}[\s\S]*?<div className=\{styles\.headerLeft\}>[\s\S]*?<\/div>)\n\s*(<\/div>)/g;

content = content.replace(headerRegex, (match, p1, p2) => {
  return p1 + `\n        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>\n      ` + p2;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated headers successfully.");
