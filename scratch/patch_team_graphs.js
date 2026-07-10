const fs = require('fs');

const files = [
  { path: 'components/pages/L1SellerViewPage.tsx', membersVar: 'allMembers' },
  { path: 'components/pages/L2SellerViewPage.tsx', membersVar: 'enrichedMembers' }
];

files.forEach(({ path, membersVar }) => {
  let code = fs.readFileSync(path, 'utf8');

  const componentCode = `
function TeamBreakdownGraphs({ members, date }: { members: any[], date: string }) {
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);

  const [totalDOT, setTotalDOT] = useState(0);
  const [dotChartData, setDotChartData] = useState<any[]>([]);
  const [autoVal, setAutoVal] = useState(0);
  const [manualVal, setManualVal] = useState(0);
  const [rtgVal, setRtgVal] = useState(0);
  const [nonRtgVal, setNonRtgVal] = useState(0);
  const [paxVals, setPaxVals] = useState<number[]>([0,0,0,0,0]);

  const monthTotalLeads = autoVal + manualVal;
  const monthTotalPax = paxVals.reduce((a,b)=>a+b,0);
  
  const pct = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0;

  useEffect(() => {
    let tDOT = 0;
    const dotMap: Record<string, number> = { '0-2 days': 0, '3-7 days': 0, '8-15 days': 0, '16-30 days': 0, '31+ days': 0 };
    let aVal = 0, mVal = 0, rVal = 0, nrVal = 0;
    let pVals = [0,0,0,0,0];

    members.forEach(m => {
      (m.dot_rows || []).forEach((d: any) => {
        tDOT += (d.leads_count || 0);
        const b = d.dot_bucket || 'Unknown';
        if (dotMap[b] !== undefined) dotMap[b] += (d.leads_count || 0);
      });
      if (m.allotment) {
        aVal += (m.allotment.auto_allotted || 0);
        mVal += (m.allotment.manual_allotted || 0);
        rVal += (m.allotment.rtg_leads || 0);
        nrVal += (m.allotment.non_rtg_leads || 0);
        pVals[0] += (m.allotment.pax_1 || 0);
        pVals[1] += (m.allotment.pax_2 || 0);
        pVals[2] += (m.allotment.pax_3 || 0);
        pVals[3] += (m.allotment.pax_4 || 0);
        pVals[4] += (m.allotment.pax_4_plus || 0);
      }
    });

    setTotalDOT(tDOT);
    setDotChartData([
      { label: '0-2 days', value: dotMap['0-2 days'], color: '#EF4444' },
      { label: '3-7 days', value: dotMap['3-7 days'], color: '#F97316' },
      { label: '8-15 days', value: dotMap['8-15 days'], color: '#EAB308' },
      { label: '16-30 days', value: dotMap['16-30 days'], color: '#22C55E' },
      { label: '31+ days', value: dotMap['31+ days'], color: '#3B82F6' },
    ]);
    setAutoVal(aVal); setManualVal(mVal); setRtgVal(rVal); setNonRtgVal(nrVal);
    setPaxVals(pVals);
  }, [members]);

  useEffect(() => {
    if (!dotChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (dotChartInstance.current) dotChartInstance.current.destroy();
      dotChartInstance.current = new Chart(dotChartCanvasRef.current, {
        type: 'bar',
        data: { labels: dotChartData.map(d => d.label.split(' ')[0]), datasets: [{ data: dotChartData.map(d => d.value), backgroundColor: dotChartData.map(d => d.color), borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111', callbacks: { label: (ctx: any) => \` \${ctx.raw} leads (\${totalDOT > 0 ? ((ctx.raw / totalDOT) * 100).toFixed(0) : 0}%)\` } } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (dotChartInstance.current) dotChartInstance.current.destroy(); }
  }, [dotChartData, totalDOT]);

  useEffect(() => {
    if (!allotmentChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (allotmentChartInstance.current) allotmentChartInstance.current.destroy();
      allotmentChartInstance.current = new Chart(allotmentChartCanvasRef.current, {
        type: 'bar',
        data: { labels: ['Auto', 'Manual', 'RTG', 'Non-RTG'], datasets: [{ data: [autoVal, manualVal, rtgVal, nonRtgVal], backgroundColor: ['#3B82F6', '#6B7280', '#22C55E', '#F97316'], borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111', callbacks: { label: (ctx: any) => \` \${ctx.raw} leads (\${monthTotalLeads > 0 ? ((ctx.raw / monthTotalLeads) * 100).toFixed(0) : 0}%)\` } } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (allotmentChartInstance.current) allotmentChartInstance.current.destroy(); }
  }, [autoVal, manualVal, rtgVal, nonRtgVal, monthTotalLeads]);

  const paxColors = ['#F9FAFB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563'];
  const paxLabels = ['Solo (1)', '2 pax', '3 pax', '4 pax', '4+ pax'];
  useEffect(() => {
    if (!paxChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (paxChartInstance.current) paxChartInstance.current.destroy();
      paxChartInstance.current = new Chart(paxChartCanvasRef.current, {
        type: 'doughnut',
        data: { labels: paxLabels, datasets: [{ data: paxVals, backgroundColor: paxColors, borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111', callbacks: { label: (ctx: any) => \` \${ctx.raw} leads (\${monthTotalPax > 0 ? ((ctx.raw / monthTotalPax) * 100).toFixed(0) : 0}%)\` } } },
          cutout: '65%'
        }
      });
    });
    return () => { active = false; if (paxChartInstance.current) paxChartInstance.current.destroy(); }
  }, [paxVals, monthTotalPax]);

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Team Breakdown</h2>
        <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'rgba(201, 168, 76, 0.1)', borderRadius: '16px', color: '#C9A84C', fontWeight: 600 }}>
          {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '360px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Date-of-travel spread · {totalDOT} leads</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={dotChartCanvasRef} /></div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {dotChartData.map((bar, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bar.color }} />
                  <span style={{ color: '#8A8278' }}>{bar.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: bar.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{bar.value}</span>
                  <span style={{ color: bar.value > 0 ? bar.color : '#3A3A3A', width: '32px', textAlign: 'right' }}>{pct(bar.value, totalDOT)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '360px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned · {monthTotalLeads} total</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={allotmentChartCanvasRef} /></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}><span style={{ color: '#8A8278' }}>Auto Allotted</span><span style={{ color: '#F0EDE8', fontWeight: 700 }}>{autoVal} ({pct(autoVal, monthTotalLeads)}%)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}><span style={{ color: '#8A8278' }}>Manual Allotted</span><span style={{ color: '#F0EDE8', fontWeight: 700 }}>{manualVal} ({pct(manualVal, monthTotalLeads)}%)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}><span style={{ color: '#8A8278' }}>RTG Leads</span><span style={{ color: '#F0EDE8', fontWeight: 700 }}>{rtgVal} ({pct(rtgVal, monthTotalLeads)}%)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}><span style={{ color: '#8A8278' }}>Non-RTG Leads</span><span style={{ color: '#F0EDE8', fontWeight: 700 }}>{nonRtgVal} ({pct(nonRtgVal, monthTotalLeads)}%)</span></div>
          </div>
        </div>

        <div style={{ background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '360px' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Pax mix across {monthTotalLeads} leads</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={paxChartCanvasRef} /></div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {paxLabels.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: paxColors[i] }} />
                  <span style={{ color: '#8A8278' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: paxVals[i] > 0 ? '#F0EDE8' : '#3A3A3A' }}>{paxVals[i]}</span>
                  <span style={{ color: paxVals[i] > 0 ? paxColors[i] : '#3A3A3A', width: '32px', textAlign: 'right' }}>{pct(paxVals[i], monthTotalPax)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

  if (!code.includes('function TeamBreakdownGraphs')) {
    code += '\n' + componentCode;
  }

  // Insert usage after the KPI grid and before S1 or S2
  // Let's insert it right before `{/* S1: Login & Availability */}` in both files
  // If S1 has a comment like `{/* S1: Login & Availability */}`:
  const target = '{/* S1: Login & Availability';
  if (code.includes(target) && !code.includes('TeamBreakdownGraphs members=')) {
    code = code.replace(target, `\n      {/* NEW: Team Breakdown Graphs */}\n      <TeamBreakdownGraphs members={${membersVar}} date={date} />\n\n      ` + target);
  }

  // Hide the old S3, S4, S5 sections by commenting out their section content completely
  // We can just wrap them in `{false && (` ... `)}`
  
  // Since L1 and L2 differ slightly in their comments, we'll replace the headers:
  // S3: RTG vs Non-RTG
  // S4: Appetite Fulfillment (L1)
  // S5: Pax Bifurcation (L1/L2)
  const replaceSection = (regexPattern) => {
    // Actually regex is risky. Let's do string replacement for the headers to hide them.
  }
  
  // Instead, let's just make `processedGroups.map` in those sections empty, or add a `display: none`?
  // Adding `display: none` is safest.
  
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} onClick=\{.*?s3.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} style={{display: "none"}} onClick={() => null}>');
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} onClick=\{.*?s4.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} style={{display: "none"}} onClick={() => null}>');
  code = code.replace(/<div className=\{styles\.sectionHeaderCollapsible\} onClick=\{.*?s5.*?\}>/g, '<div className={styles.sectionHeaderCollapsible} style={{display: "none"}} onClick={() => null}>');

  fs.writeFileSync(path, code);
  console.log('Patched', path);
});
