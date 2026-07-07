const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

const stateAdditions = `
  // Modals and drill-downs
  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [showMheTrendModal, setShowMheTrendModal] = useState(false)
  const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)
  
  const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)
  const [breakdownDrillSeller, setBreakdownDrillSeller] = useState<any>(null)
  const [breakdownExpandedTl, setBreakdownExpandedTl] = useState<string | null>(null)

  const [drillSellerS7, setDrillSellerS7] = useState<any>(null)
  const [showTeamFunnel, setShowTeamFunnel] = useState(false)
  const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)
`;

if (!l1.includes('showNoLeadsModal')) {
    l1 = l1.replace(/const \[expandedTlS10, setExpandedTlS10\] = useState<string \| null>\(null\)/, `const [expandedTlS10, setExpandedTlS10] = useState<string | null>(null)\n${stateAdditions}`);
}

// Extract modalsContent from apply_l1.js
const applyScript = fs.readFileSync('scratch/apply_l1.js', 'utf8');
const modalsMatch = applyScript.match(/const modalsContent = \`([\s\S]*?)\`;/);
if (modalsMatch && !l1.includes('Breakdown Modal')) {
    const modalsContent = modalsMatch[1];
    l1 = l1.replace(/(\s*<\/div>\s*\)\s*\})/, '\n' + modalsContent + '$1');
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
console.log('Fixed L1SellerViewPage.tsx missing states and modals.');
