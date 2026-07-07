const fs = require('fs');

function patch(file, rowsVar, canvasVar, instanceVar) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Update dotColors
  const oldColors1 = `const dotColors = ['#F4631E', '#EF562F', '#E06D3E', '#D17F4E', '#C28E5F', '#B39D70']`;
  const newColors = `const dotColors = ['#FB923C', '#F59E0B', '#EAB308', '#CA8A04', '#D97706', '#EA580C']`;
  
  if (content.includes(oldColors1)) {
    content = content.replace(oldColors1, newColors);
  } else if (file.includes('AdminLTAPage')) {
    // AdminLTAPage doesn't have dotColors, it hardcodes '#F4631E'
    const adminDotLoopOld = `  dotMonthsConfig.forEach(mo => {
    let val = 0
    Object.entries(dotMap).forEach(([k, v]) => { if (k.endsWith('-' + mo.key)) val += v })
    dotChartData.push({ label: mo.label, value: val, color: '#F4631E' })
  })`;
    const adminDotLoopNew = `  const dotColors = ['#FB923C', '#F59E0B', '#EAB308', '#CA8A04', '#D97706', '#EA580C'];
  dotMonthsConfig.forEach((mo, i) => {
    let val = 0
    Object.entries(dotMap).forEach(([k, v]) => { if (k.endsWith('-' + mo.key)) val += v })
    dotChartData.push({ label: mo.label, value: val, color: dotColors[i] || '#F4631E' })
  })`;
    content = content.replace(adminDotLoopOld, adminDotLoopNew);
  }
  
  // 2. Inject canvas back into Allotment Breakdown HTML
  // We look for: <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned</div>
  const searchStr = `<div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '16px' }}>How leads were assigned</div>`;
  if (content.includes(searchStr)) {
    const canvasStr = `\n          <div style={{ height: '120px', position: 'relative', marginBottom: '16px' }}><canvas ref={${canvasVar}} /></div>`;
    // Prevent double insertion
    if (!content.includes(`<canvas ref={${canvasVar}} />`)) {
      content = content.replace(searchStr, searchStr + canvasStr);
    }
  }

  // 3. Inject useEffect for Allotment Breakdown Bar Chart
  const hookTarget = `  // PAX Chart`;
  
  const useEffectBlock = `
  // Allotment Bar Chart
  useEffect(() => {
    if (!${canvasVar}.current) return;
    let active = true;
    import('chart.js/auto').then(mod => {
      if (!active) return;
      const Chart = mod.default || mod;
      if (${instanceVar}.current) ${instanceVar}.current.destroy();
      
      const config = {
        type: 'bar',
        data: {
          labels: ${rowsVar}.map((d: any) => d.label),
          datasets: [{
            data: ${rowsVar}.map((d: any) => d.value),
            backgroundColor: ${rowsVar}.map((d: any) => d.color),
            borderRadius: 4,
            barThickness: 20
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111111', titleColor: '#FFFFFF', bodyColor: '#E5E7EB', borderColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, cornerRadius: 6
            }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      };
      
      ${instanceVar}.current = new Chart(${canvasVar}.current!, config);
    });
    return () => { active = false; if (${instanceVar}.current) ${instanceVar}.current.destroy(); }
  }, [JSON.stringify(${rowsVar})])
`;
  
  // Clean up old useEffect if it was left around for allotment chart.
  // We can just rely on the existing one if we modify it, but since I don't know its exact structure, I will replace the old useEffect for Allotment if it exists.
  const oldEffectSearch = `// Allotment Chart`;
  if (content.includes(oldEffectSearch)) {
      const idxStart = content.indexOf(oldEffectSearch);
      const nextHook = content.indexOf(hookTarget, idxStart);
      if (nextHook > -1) {
          content = content.substring(0, idxStart) + useEffectBlock + content.substring(nextHook);
      }
  } else {
      // If it doesn't exist, insert before PAX Chart
      content = content.replace(hookTarget, useEffectBlock + "\n" + hookTarget);
  }

  fs.writeFileSync(file, content);
  console.log("Patched " + file);
}

patch('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L1SellerViewPage.tsx', 'cmAllotmentRows', 'allotmentChartCanvasRef', 'allotmentChartInstance');
patch('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/L2SellerViewPage.tsx', 'teamAllotmentRows', 'allotmentChartCanvasRef', 'allotmentChartInstance');
patch('/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx', 'allotmentRows', 'allotmentChartCanvasRef', 'allotmentChartInstance');

