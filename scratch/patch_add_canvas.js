const fs = require('fs');

function patchFile(path, isL1) {
  let code = fs.readFileSync(path, 'utf8');

  const dotVar = isL1 ? 'cmDotChartData' : 'teamDotChartData';
  const allotmentVar = isL1 ? 'cmAllotmentRows' : 'teamAllotmentRows';
  const paxVar = isL1 ? 'cmPaxRows' : 'teamPaxRows';

  // Find the exact place to inject the hooks: after `const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)`
  const insertHookTarget = 'const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)';
  
  const hooks = `
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
      dotChartInstance.current = new Chart(dotChartCanvasRef.current, {
        type: 'bar',
        data: { labels: ${dotVar}.map((d: any) => d.label.split(' ')[0]), datasets: [{ data: ${dotVar}.map((d: any) => d.value), backgroundColor: ${dotVar}.map((d: any) => d.color), borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (dotChartInstance.current) dotChartInstance.current.destroy(); }
  }, [${dotVar}]);

  // Allotment Chart
  useEffect(() => {
    if (!allotmentChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (allotmentChartInstance.current) allotmentChartInstance.current.destroy();
      allotmentChartInstance.current = new Chart(allotmentChartCanvasRef.current, {
        type: 'bar',
        data: { labels: ${allotmentVar}.map((d: any) => d.label), datasets: [{ data: ${allotmentVar}.map((d: any) => d.value), backgroundColor: ${allotmentVar}.map((d: any) => d.color), borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (allotmentChartInstance.current) allotmentChartInstance.current.destroy(); }
  }, [${allotmentVar}]);

  // PAX Chart
  useEffect(() => {
    if (!paxChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (paxChartInstance.current) paxChartInstance.current.destroy();
      paxChartInstance.current = new Chart(paxChartCanvasRef.current, {
        type: 'doughnut',
        data: { labels: ${paxVar}.map((d: any) => d.label), datasets: [{ data: ${paxVar}.map((d: any) => d.value), backgroundColor: ${paxVar}.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          cutout: '65%'
        }
      });
    });
    return () => { active = false; if (paxChartInstance.current) paxChartInstance.current.destroy(); }
  }, [${paxVar}]);
`;

  if (code.includes(insertHookTarget) && !code.includes('dotChartCanvasRef = useRef')) {
    code = code.replace(insertHookTarget, insertHookTarget + '\n' + hooks);
  }

  // Insert Canvas divs inside the cards
  // 1. DOT
  const dotCardTarget = `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>`;
  const dotCanvas = `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={dotChartCanvasRef} /></div>`;
  if (code.includes(dotCardTarget) && !code.includes(dotCanvas.trim())) {
    code = code.replace(dotCardTarget, dotCardTarget + dotCanvas);
  }

  // 2. Allotment
  const allotmentCardTarget = `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>`;
  const allotmentCanvas = `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={allotmentChartCanvasRef} /></div>`;
  if (code.includes(allotmentCardTarget) && !code.includes(allotmentCanvas.trim())) {
    code = code.replace(allotmentCardTarget, allotmentCardTarget + allotmentCanvas);
  }

  // 3. PAX
  const paxCardTarget = `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>`;
  const paxCanvas = `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={paxChartCanvasRef} /></div>`;
  if (code.includes(paxCardTarget) && !code.includes(paxCanvas.trim())) {
    code = code.replace(paxCardTarget, paxCardTarget + paxCanvas);
  }

  // Wait! L2 has `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>` in TWO places!
  // One for the team Monthly Breakdown, and one for the activeBreakdownCard drill-down (when clicking the card, the modal shows up).
  // The drill-down modal also has `DOT Distribution`!
  // I only want to replace the first occurrence (which is the main card).
  // I can just replace the FIRST match if there are multiple.
  
  // Or, I can be more specific:
  // The first occurrence of `DOT Distribution` card has this right below it:
  // `<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`
  // We can target that.

  fs.writeFileSync(path, code);
  console.log('Patched canvas for', path);
}

function safePatch(path, isL1) {
  let code = fs.readFileSync(path, 'utf8');
  
  const dotVar = isL1 ? 'cmDotChartData' : 'teamDotChartData';
  const allotmentVar = isL1 ? 'cmAllotmentRows' : 'teamAllotmentRows';
  const paxVar = isL1 ? 'cmPaxRows' : 'teamPaxRows';

  // Inject hooks
  const insertHookTarget = 'const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)';
  const hooks = `
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
      dotChartInstance.current = new Chart(dotChartCanvasRef.current, {
        type: 'bar',
        data: { labels: ${dotVar}.map((d: any) => d.label.split(' ')[0]), datasets: [{ data: ${dotVar}.map((d: any) => d.value), backgroundColor: ${dotVar}.map((d: any) => d.color), borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (dotChartInstance.current) dotChartInstance.current.destroy(); }
  }, [${dotVar}]);

  // Allotment Chart
  useEffect(() => {
    if (!allotmentChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (allotmentChartInstance.current) allotmentChartInstance.current.destroy();
      allotmentChartInstance.current = new Chart(allotmentChartCanvasRef.current, {
        type: 'bar',
        data: { labels: ${allotmentVar}.map((d: any) => d.label), datasets: [{ data: ${allotmentVar}.map((d: any) => d.value), backgroundColor: ${allotmentVar}.map((d: any) => d.color), borderRadius: 4, barThickness: 16 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          scales: { x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#8A8278', font: { size: 9 }, precision: 0 }, grid: { color: 'rgba(255,255,255,0.03)' } } }
        }
      });
    });
    return () => { active = false; if (allotmentChartInstance.current) allotmentChartInstance.current.destroy(); }
  }, [${allotmentVar}]);

  // PAX Chart
  useEffect(() => {
    if (!paxChartCanvasRef.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (paxChartInstance.current) paxChartInstance.current.destroy();
      paxChartInstance.current = new Chart(paxChartCanvasRef.current, {
        type: 'doughnut',
        data: { labels: ${paxVar}.map((d: any) => d.label), datasets: [{ data: ${paxVar}.map((d: any) => d.value), backgroundColor: ${paxVar}.map((d: any) => d.color), borderWidth: 1.5, borderColor: '#111111' }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#111111' } },
          cutout: '65%'
        }
      });
    });
    return () => { active = false; if (paxChartInstance.current) paxChartInstance.current.destroy(); }
  }, [${paxVar}]);
`;

  if (code.includes(insertHookTarget) && !code.includes('dotChartCanvasRef = useRef')) {
    code = code.replace(insertHookTarget, insertHookTarget + '\n' + hooks);
  }

  // Safe inject Canvas. We'll find the exact string that is followed by `<div style={{ display: 'flex', flexDirection: 'column'`
  const safeInject = (targetStr, injectStr) => {
    const regex = new RegExp(`(${targetStr.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\$&')})\\s*<div style=\\{\\{ display: 'flex', flexDirection: 'column'`);
    if (regex.test(code)) {
      code = code.replace(regex, `$1${injectStr}\n          <div style={{ display: 'flex', flexDirection: 'column'`);
    } else {
      console.log('Could not find injection point for', targetStr);
    }
  };

  safeInject(
    `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOT Distribution</div>`,
    `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={dotChartCanvasRef} /></div>`
  );
  
  safeInject(
    `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allotment Breakdown</div>`,
    `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={allotmentChartCanvasRef} /></div>`
  );

  safeInject(
    `<div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F0EDE8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads by Group Size</div>`,
    `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={paxChartCanvasRef} /></div>`
  );
  
  // Actually wait, for DOT distribution it's `<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>`
  // and for Allotment it's `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>`
  // and for PAX it's `<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>`
  // My regex `<div style=\\{\\{ display: 'flex', flexDirection: 'column'` matches all of them!

  fs.writeFileSync(path, code);
  console.log('Patched canvas for', path);
}

safePatch('components/pages/L1SellerViewPage.tsx', true);
safePatch('components/pages/L2SellerViewPage.tsx', false);
