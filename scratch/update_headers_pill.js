const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components/pages/L1SellerViewPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the closing div of headerLeft with the closing div AND the new pill
content = content.replace(/(<h2 className=\{styles\.sectionTitle\}>.*?<\/h2>\s*<\/div>)/g, (match) => {
  return match + `\n        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}</div>`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated headers successfully.");
