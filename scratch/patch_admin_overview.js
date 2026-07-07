const fs = require('fs');
const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add useRef inside MonthlyBreakdownSection
const hookInjection = `  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)
  
  // Canvas Refs for Monthly Breakdown
  const dotChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const allotmentChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paxChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotChartInstance = useRef<any>(null);
  const allotmentChartInstance = useRef<any>(null);
  const paxChartInstance = useRef<any>(null);

  // DOT Chart
  useEffect(() => {
    if (!dotChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (dotChartInstance.current) dotChartInstance.current.destroy();
      dotChartInstance.current = new Chart(dotChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: dotChartData.map((d: any) => d.label.split(' ')[0]), datasets: [{ data: dotChartData.map((d: any) => d.value), backgroundColor: dotChartData.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const sum = dotChartData.reduce((s: any, b: any) => s + b.value, 0)
                  const pctVal = sum > 0 ? ((val / sum) * 100).toFixed(0) : '0'
                  return \` \${ctx.label}: \${val} leads (\${pctVal}%)\`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (dotChartInstance.current) dotChartInstance.current.destroy(); }
  }, [JSON.stringify(dotChartData)])

  // Allotment Chart
  useEffect(() => {
    if (!allotmentChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (allotmentChartInstance.current) allotmentChartInstance.current.destroy();
      allotmentChartInstance.current = new Chart(allotmentChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: allotmentRows.map((d: any) => d.label), datasets: [{ data: allotmentRows.map((d: any) => d.value), backgroundColor: allotmentRows.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const sum = allotmentRows.reduce((s: any, b: any) => s + b.value, 0)
                  const pctVal = sum > 0 ? ((val / sum) * 100).toFixed(0) : '0'
                  return \` \${ctx.label}: \${val} leads (\${pctVal}%)\`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (allotmentChartInstance.current) allotmentChartInstance.current.destroy(); }
  }, [JSON.stringify(allotmentRows)])

  // PAX Chart
  useEffect(() => {
    if (!paxChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (paxChartInstance.current) paxChartInstance.current.destroy();
      paxChartInstance.current = new Chart(paxChartCanvasRef.current!, {
        type: 'doughnut',
        data: { labels: paxRows.map((d: any) => d.label), datasets: [{ data: paxRows.map((d: any) => d.value), backgroundColor: paxRows.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6,
              callbacks: {
                label: (ctx: any) => {
                  const val = ctx.raw || 0
                  const sum = paxRows.reduce((s: any, b: any) => s + b.value, 0)
                  const pctVal = sum > 0 ? ((val / sum) * 100).toFixed(0) : '0'
                  return \` \${ctx.label}: \${val} leads (\${pctVal}%)\`
                }
              }
            }
          }
        }
      })
    })
    return () => { active = false; if (paxChartInstance.current) paxChartInstance.current.destroy(); }
  }, [JSON.stringify(paxRows)])
`;

content = content.replace('  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)', hookInjection);

// 2. Adjust color palettes of paxRows
const paxRowsOld = `  const paxRows = [
    { label: '1-pax', value: totalPax1, color: '#F3F4F6' },
    { label: '2-pax', value: totalPax2, color: '#E5E7EB' },
    { label: '3-pax', value: totalPax3, color: '#D1D5DB' },
    { label: '4-pax', value: totalPax4, color: '#9CA3AF' },
    { label: '4+ pax', value: totalPax4Plus, color: '#6B7280' },
  ]`;
  
const paxRowsNew = `  const paxRows = [
    { label: '1-pax', value: totalPax1, color: '#E0F2FE' },
    { label: '2-pax', value: totalPax2, color: '#7DD3FC' },
    { label: '3-pax', value: totalPax3, color: '#38BDF8' },
    { label: '4-pax', value: totalPax4, color: '#0EA5E9' },
    { label: '4+ pax', value: totalPax4Plus, color: '#0369A1' },
  ]`;

content = content.replace(paxRowsOld, paxRowsNew);

// 3. Replace card Base
const cardBaseOld = `  const cardBase = { background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', cursor: 'pointer' as const }`;
const cardBaseNew = `  const cardBase = { background: '#111111', border: '1px solid #1e1e1e', borderRadius: '16px', padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '360px', cursor: 'pointer' as const }`;

content = content.replace(cardBaseOld, cardBaseNew);

// 4. Replace the 3 chart divs with the new L1 style.
const gridStart = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>`;

// Replace from gridStart to the end of the CA block.
const startIndex = content.indexOf(gridStart);
if (startIndex === -1) {
  console.log("Could not find gridStart!");
  process.exit(1);
}

const endIndex = content.indexOf(`{activeCard && (`, startIndex);
if (endIndex === -1) {
  console.log("Could not find endIndex!");
  process.exit(1);
}

const newCards = `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>

        {/* ── DOT Bar Chart (Horizontal) ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'dot' ? null : 'dot'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Date-of-travel spread</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={dotChartCanvasRef} /></div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {dotChartData.map((bar, i) => {
              const totalDOT = dotChartData.reduce((s, b) => s + b.value, 0)
              const barPct = totalDOT > 0 ? Math.round((bar.value / totalDOT) * 100) : 0
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: bar.color }} />
                    <span style={{ color: '#8A8278' }}>{bar.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: bar.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{bar.value}</span>
                    <span style={{ color: bar.value > 0 ? bar.color : '#3A3A3A', width: '32px', textAlign: 'right' }}>{barPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Allotment Breakdown ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'allotment' ? null : 'allotment'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={allotmentChartCanvasRef} /></div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            {allotmentRows.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                  <span style={{ color: '#8A8278' }}>{item.label}</span>
                </div>
                <span style={{ color: '#F0EDE8', fontWeight: 700 }}>
                  {item.value} ({totalLeads > 0 ? Math.round((item.value / totalLeads) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAX Distribution ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'pax' ? null : 'pax'); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Pax mix across leads</div>
          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={paxChartCanvasRef} /></div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
            {paxRows.map((p, i) => {
              const paxPct = totalPax > 0 ? Math.round((p.value / totalPax) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                    <span style={{ color: '#8A8278' }}>{p.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: p.value > 0 ? '#F0EDE8' : '#3A3A3A' }}>{p.value}</span>
                    <span style={{ color: p.value > 0 ? p.color : '#3A3A3A', width: '32px', textAlign: 'right' }}>{paxPct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── CA Time ── */}
        <div style={cardBase} onClick={() => { setActiveCard(activeCard === 'ca' ? null : 'ca'); setExpandedCatKey(null); setExpandedTlKey(null) }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#8A8278', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appetite & C→A Time</div>
          <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>Key process metrics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', color: '#8A8278', fontWeight: 600, textTransform: 'uppercase' }}>Fulfillment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: fulfPct >= 90 ? '#22C55E' : fulfPct >= 70 ? '#F59E0B' : '#EF4444' }}>{fulfPct}%</span>
              </div>
              <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: \`\${Math.min(fulfPct, 100)}%\`, height: '100%', background: fulfPct >= 90 ? 'linear-gradient(90deg,#22C55E40,#22C55E90)' : fulfPct >= 70 ? 'linear-gradient(90deg,#F59E0B40,#F59E0B90)' : 'linear-gradient(90deg,#EF444440,#EF444490)', borderRadius: '6px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Appetite (LTA)</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F4631E' }}>{totalAppetite}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Leads Allotted</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{totalLeads}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '0.68rem', color: '#8A8278' }}>Avg C→A Time</span><span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#E5E7EB' }}>{avgCA != null ? \`\${avgCA}m\` : '—'}</span></div>
          </div>
        </div>
      </div>
      
      `;

content = content.substring(0, startIndex) + newCards + content.substring(endIndex);

fs.writeFileSync(file, content);
console.log("Successfully patched AdminLTAPage.tsx!");
