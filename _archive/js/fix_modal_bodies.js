const fs = require('fs');

function fixModal(fileName) {
  let content = fs.readFileSync(`src/features/tl/components/${fileName}.tsx`, 'utf8');
  
  // Remove IIFE wrapping
  // Look for `return (\n    () => {\n` or similar
  content = content.replace(/return \(\s*\(\) => \{\s*([\s\S]*?)return \(\s*([\s\S]*?)\s*\);\s*\}\s*\);/g, 'return (\n$2\n);');
  
  // Actually, wait, there might be state variables inside the IIFE!
  // e.g. const mgAvg = ...
  // It's safer to just replace `return (\n () => {\n` with empty, and keep the inner return
  let match = content.match(/return \(\s*(?:async )?\(\) => \{([\s\S]*?)\s*\}\s*\);/);
  if (match) {
    let innerBody = match[1];
    // innerBody contains declarations and then `return (...)`
    content = content.replace(/return \(\s*(?:async )?\(\) => \{[\s\S]*?\s*\}\s*\);/, innerBody);
  } else {
    // maybe it wasn't an IIFE?
    // Let's just blindly remove the outer return ( ) if it wraps an IIFE
    match = content.match(/return \(\s*\(\s*\) => \{([\s\S]*?)\}\s*\(\)\s*\);/);
    if (match) {
      content = content.replace(/return \(\s*\(\s*\) => \{([\s\S]*?)\}\s*\(\)\s*\);/, match[1]);
    }
  }

  // Also import recharts
  if (!content.includes('import { AreaChart')) {
    content = `import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';\n` + content;
  }
  
  // Add CSS styles import if needed
  if (fileName === 'HourlyViewModal' || fileName === 'NoLeadsModal') {
    content = `import styles from '../L1SellerViewPage.module.css';\n` + content;
  }

  fs.writeFileSync(`src/features/tl/components/${fileName}.tsx`, content, 'utf8');
}

['NoLeadsModal', 'MheTrendModal', 'GoalShbTrendModal', 'HourlyViewModal'].forEach(fixModal);
console.log('Fixed modal bodies');
