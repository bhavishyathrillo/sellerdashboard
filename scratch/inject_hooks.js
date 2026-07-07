const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx'
];

files.forEach(path => {
  let code = fs.readFileSync(path, 'utf8');
  
  const isL1 = path.includes('L1');
  const dotVar = isL1 ? 'cmDotChartData' : 'teamDotChartData';
  const allotmentVar = isL1 ? 'cmAllotmentRows' : 'teamAllotmentRows';
  const paxVar = isL1 ? 'cmPaxRows' : 'teamPaxRows';

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

  const returnTarget = '  return (\n    <div className={styles.page}>';
  if (code.includes(returnTarget)) {
    code = code.replace(returnTarget, hooks + '\n' + returnTarget);
  } else {
    console.log('Return target not found in', path);
  }

  fs.writeFileSync(path, code);
  console.log('Patched hooks in', path);
});
