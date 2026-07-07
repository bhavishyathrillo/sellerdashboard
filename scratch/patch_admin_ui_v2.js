const fs = require('fs');
const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// The style to replace
const oldStyle1 = `style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', flex: 1.5, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}`;
const newStyle1 = `style={{ background: 'var(--card, #121212)', border: '1px solid var(--border, #1E1E1E)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', flex: 1.5 }}`;

const oldStyle2 = `style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}`;
const newStyle2 = `style={{ background: 'var(--card, #121212)', border: '1px solid var(--border, #1E1E1E)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', flex: 1 }}`;

const oldStyle3 = `style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', cursor: noLeadsSellers.length > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}`;
const newStyle3 = `style={{ background: 'var(--card, #121212)', border: '1px solid var(--border, #1E1E1E)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, cursor: noLeadsSellers.length > 0 ? 'pointer' : 'default' }}`;

const oldStyle4 = `style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '12px 16px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', cursor: 'pointer', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}`;
const newStyle4 = `style={{ background: 'var(--card, #121212)', border: '1px solid var(--border, #1E1E1E)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', position: 'relative', flex: 1, cursor: 'pointer' }}`;

content = content.replace(oldStyle1, newStyle1);
content = content.replace(oldStyle2, newStyle2);
content = content.replace(oldStyle3, newStyle3);
content = content.replace(oldStyle4, newStyle4);
content = content.replace(oldStyle4, newStyle4); // 5th card

// Remove glowing top borders
const rxGlow = /<div style=\{\{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient.*?\}\} \/>/g;
content = content.replace(rxGlow, '');

// Clean up fonts to match L1 kpiTile (kpiLabel, kpiValue)
// Label
content = content.replace(/<div style=\{\{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' \}\}>/g, 
  `<div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>`);
  
// Main value 
content = content.replace(/<span style=\{\{ fontSize: '1.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 \}\}>/g, 
  `<span style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#F9FAFB', lineHeight: 1 }}>`);

// RTG Percentage specific
content = content.replace(/<span style=\{\{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 300 \}\}>%/g, 
  `<span style={{ fontSize: '1.75rem', fontWeight: 600, color: '#F9FAFB', lineHeight: 1 }}>%`);

fs.writeFileSync(file, content);
console.log("Admin UI Patched V2!");
