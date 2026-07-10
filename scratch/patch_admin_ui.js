const fs = require('fs');
const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Allotment Colors
const allotmentRowsOld = `  const allotmentRows = [
    { label: 'Auto Allotted', value: totalAuto, color: '#E5E7EB' },
    { label: 'Manual Allotted', value: totalManual, color: '#9CA3AF' },
    { label: 'RTG Leads', value: totalRtg, color: '#F4631E' },
    { label: 'Non-RTG', value: totalNonRtg, color: '#4B5563' },
  ]`;
const allotmentRowsNew = `  const allotmentRows = [
    { label: 'Auto Allotted', value: totalAuto, color: '#6366F1' },
    { label: 'Manual Allotted', value: totalManual, color: '#A855F7' },
    { label: 'RTG Leads', value: totalRtg, color: '#F4631E' },
    { label: 'Non-RTG', value: totalNonRtg, color: '#10B981' },
  ]`;
content = content.replace(allotmentRowsOld, allotmentRowsNew);

// 2. Adjust Monthly Breakdown grid template columns to give the 4th section more room
content = content.replace(
  `display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '24px'`, 
  `display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.15fr', gap: '14px', marginBottom: '24px'`
);
content = content.replace(
  `display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px'`, 
  `display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.15fr', gap: '14px'`
);

// 3. Fix KPI Cards CSS
// The KPI row has 5 cards. Each card has an inline style similar to:
// style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', flex: 1.5, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}
// We need to replace these with the L1 style:
// style={{ background: '#121212', padding: '16px 20px', borderRadius: '12px', flex: 1, border: '1px solid #1E1E1E', display: 'flex', flexDirection: 'column', position: 'relative' }}
// And remove the glowing borders!

// First, find all KPI card definitions and strip the old styles
const kpiSearch = `background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', `;
const kpiReplace = `background: '#121212', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', `;
const rxOldKpi = /style=\{\{ background: 'linear-gradient[^}]*\}\}/g;

content = content.replace(rxOldKpi, (match) => {
    let flexVal = '1';
    if (match.includes('flex: 1.5')) flexVal = '1.5';
    let extras = '';
    if (match.includes('cursor:')) {
        const cMatch = match.match(/cursor:[^,]*,/);
        if (cMatch) extras += cMatch[0] + ' ';
    }
    return \`style={{ background: '#121212', border: '1px solid #1E1E1E', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', flex: \${flexVal}, \${extras} }}\`;
});

// Remove glowing borders
const rxGlow = /<div style=\{\{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient.*?\}\} \/>/g;
content = content.replace(rxGlow, '');

// Also need to clean up some of the fonts to match kpiTile
content = content.replace(/<div style=\{\{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' \}\}>/g, 
  \`<div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#6B7280' }}>\`);

// Also fix the main values
content = content.replace(/<span style=\{\{ fontSize: '1.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 \}\}>/g, 
  \`<span style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>\`);

fs.writeFileSync(file, content);
console.log("Admin UI Patched!");
