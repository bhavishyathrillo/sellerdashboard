const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
if (!l1.includes('const [drillSellerTimeline')) {
    l1 = l1.replace(/const \[activeBreakdownCard, setActiveBreakdownCard\] = useState<string \| null>\(null\)/, `const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)\n  const [drillSellerTimeline, setDrillSellerTimeline] = useState<any>(null)\n  const [activeTileTimeline, setActiveTileTimeline] = useState<string | null>(null)\n  const [activeBlockTimeline, setActiveBlockTimeline] = useState<any>(null)\n`);
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
    console.log("Added state variables");
} else {
    console.log("Already added");
}
