const fs = require('fs');

let l1code = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

// Replace useMemo with IIFE in L1
l1code = l1code.replace(/const hourlyMap = useMemo\(\(\) => \{/g, 'const hourlyMap = (() => {');
l1code = l1code.replace(/\}, \[allMembers\]\)/g, '})()');
l1code = l1code.replace(/\}, \[enrichedMembers\]\)/g, '})()');

// Move hourlyMap down after allMembers is defined
const mapCodeStart = l1code.indexOf('const hourlyMap = (() => {');
const mapCodeEnd = l1code.indexOf('})()', mapCodeStart) + 4;
if (mapCodeStart !== -1 && mapCodeStart < l1code.indexOf('let allMembers: any[] = []')) {
  const mapCode = l1code.substring(mapCodeStart, mapCodeEnd);
  l1code = l1code.substring(0, mapCodeStart) + l1code.substring(mapCodeEnd);
  
  const insertPos = l1code.indexOf('const cmMonthlySum') - 1;
  l1code = l1code.substring(0, insertPos) + '\n  ' + mapCode + '\n' + l1code.substring(insertPos);
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1code);


let l2code = fs.readFileSync('components/pages/L2SellerViewPage.tsx', 'utf8');

// Replace useMemo with IIFE in L2
l2code = l2code.replace(/const hourlyMap = useMemo\(\(\) => \{/g, 'const hourlyMap = (() => {');
l2code = l2code.replace(/\}, \[enrichedMembers\]\)/g, '})()');
l2code = l2code.replace(/\}, \[allMembers\]\)/g, '})()');

fs.writeFileSync('components/pages/L2SellerViewPage.tsx', l2code);
