const fs = require('fs');
const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const hookStart = `  // DOT Chart\n  useEffect(() => {`;
const hookEnd = `  }, [JSON.stringify(paxRows)])\n`;

const s1 = content.indexOf(hookStart);
const e1 = content.indexOf(hookEnd) + hookEnd.length;

const hooksCode = content.substring(s1, e1);

// Remove from the top
content = content.substring(0, s1) + content.substring(e1);

// Insert before the return
const targetInsert = `  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']`;
const insertIdx = content.indexOf(targetInsert);

content = content.substring(0, insertIdx) + hooksCode + "\n" + content.substring(insertIdx);

fs.writeFileSync(file, content);
console.log("Hooks moved successfully.");
