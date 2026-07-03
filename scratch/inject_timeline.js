const fs = require('fs');

const l2 = fs.readFileSync('components/pages/L2SellerViewPage.tsx', 'utf8');
const l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

const s1ModalRegex = /{drillSellerS1 && !activeTileS1 && !activeBlockS1 && \([\s\S]*?className={sellerStyles\.timelineLabelsRow}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)}/;

const s1ModalMatch = l2.match(s1ModalRegex);

if (s1ModalMatch) {
    console.log("Successfully extracted S1 modal from L2");
    
    // Replace drillSellerS1 with drillSellerTimeline
    // Replace setActiveTileS1 with setActiveTileTimeline
    // Replace activeTileS1 with activeTileTimeline
    // Replace activeBlockS1 with activeBlockTimeline
    // Replace setActiveBlockS1 with setActiveBlockTimeline
    
    let injectedModal = s1ModalMatch[0]
        .replace(/drillSellerS1/g, 'drillSellerTimeline')
        .replace(/setActiveTileS1/g, 'setActiveTileTimeline')
        .replace(/activeTileS1/g, 'activeTileTimeline')
        .replace(/activeBlockS1/g, 'activeBlockTimeline')
        .replace(/setActiveBlockS1/g, 'setActiveBlockTimeline');

    // Add state variables to L1
    const stateVars = `
  const [drillSellerTimeline, setDrillSellerTimeline] = useState<any>(null)
  const [activeTileTimeline, setActiveTileTimeline] = useState<string | null>(null)
  const [activeBlockTimeline, setActiveBlockTimeline] = useState<any>(null)
`;

    let newL1 = l1;
    if (!newL1.includes('drillSellerTimeline')) {
        newL1 = newL1.replace(/const \[activeBreakdownCard, setActiveBreakdownCard\] = useState<string \| null>\(null\)/, `const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)\n${stateVars}`);
    }
    
    // Extract formatMinTime and other helper functions from L2 if not in L1
    const helpersMatch = l2.match(/const formatMinTime = [\s\S]*?const extractTimeParts = [\s\S]*?return \{ h: parseInt\(match\[1\]\), m: parseInt\(match\[2\]\) \}\n\s*\}/);
    if (helpersMatch && !newL1.includes('const formatMinTime')) {
        newL1 = newL1.replace(/const globalNoLeads =/, `${helpersMatch[0]}\n\n  const globalNoLeads =`);
    }

    if (!newL1.includes('{drillSellerTimeline && !activeTileTimeline && !activeBlockTimeline && (')) {
        newL1 = newL1.replace(/(\s*<\/div>\s*\)\s*\})/, '\n      ' + injectedModal + '\n$1');
    }
    
    // Finally, modify S1 rows in L1 to open the timeline
    newL1 = newL1.replace(
        /<tr key=\{m\.seller_email\} className=\{\`\$\{styles\.sellerRow\} \$\{m\.isAbsent \? styles\.absentRow : ''\}\`\}>/g,
        '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} onClick={() => setDrillSellerTimeline(m)} style={{ cursor: \'pointer\' }}>'
    );
    
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', newL1);
    console.log("Successfully injected into L1");
} else {
    console.log("Could not extract S1 modal from L2");
}
