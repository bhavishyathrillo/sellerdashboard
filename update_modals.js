const fs = require('fs');
let code = fs.readFileSync('components/pages/AdminLTAPage.tsx', 'utf8');

code = code.replace(
  /import React, { useState, useEffect } from 'react'/,
  `import React, { useState, useEffect, useRef } from 'react'`
);

const chartsCode = `
function MheTrendChart({ labels, values, color }: { labels: string[]; values: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      instance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'MHE %',
            data: values,
            borderColor: color,
            backgroundColor: \`\${color}18\`,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => \` \${ctx.parsed.y}% MHE\` } } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { max: 100, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => \`\${v}%\` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels.join(','), values.join(','), color])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}

function GoalShbTrendChart({ labels, goalValues, shbValues }: { labels: string[]; goalValues: number[]; shbValues: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return
    let instance: any = null
    let active = true
    import('chart.js/auto').then(mod => {
      if (!active || !canvasRef.current) return
      const Chart = mod.default || mod
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return
      const maxDataVal = Math.max(...goalValues, ...shbValues, 0)
      const yMax = Math.max(20, Math.ceil((maxDataVal + 5) / 10) * 10)
      instance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { type: 'line', label: 'SHB %', data: shbValues, borderColor: '#EAB308', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderWidth: 2, fill: false, tension: 0.3, pointBackgroundColor: '#EAB308', pointRadius: 4, yAxisID: 'y' },
            { type: 'bar', label: 'Goal %', data: goalValues, backgroundColor: '#3B82F6', borderRadius: 4, barPercentage: 0.6, maxBarThickness: 32, yAxisID: 'y' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: true, labels: { color: '#8A8278' } }, tooltip: { callbacks: { label: (ctx: any) => \` \${ctx.parsed.y}% \${ctx.dataset.label}\` } } },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { ticks: { color: '#8A8278', font: { size: 9 } }, grid: { display: false } },
            y: { max: yMax, beginAtZero: true, ticks: { color: '#8A8278', font: { size: 9 }, precision: 0, callback: (v: any) => \`\${v}%\` }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      })
    })
    return () => { active = false; if (instance) instance.destroy() }
  }, [labels.join(','), goalValues.join(','), shbValues.join(',')])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
`;

code = code.replace(
  /export default function AdminLTAPage/,
  chartsCode + '\nexport default function AdminLTAPage'
);

code = code.replace(
  /const \[showNoLeadsModal, setShowNoLeadsModal\] = useState\(false\)/,
  `const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
  const [mheDrillSeller, setMheDrillSeller] = useState<any>(null)
  const [breakdownExpandedTl, setBreakdownExpandedTl] = useState<string | null>(null)
  const [goalShbDrillSeller, setGoalShbDrillSeller] = useState<any>(null)
  const [goalShbExpandedTl, setGoalShbExpandedTl] = useState<string | null>(null)`
);

let l1Code = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

const mheMatch = l1Code.match(/\{\/\* MHE Trend Modal \*\/\}([\s\S]*?)\{\/\* CM Goal vs SHB Trend Modal \*\/\}/);
const goalMatch = l1Code.match(/\{\/\* CM Goal vs SHB Trend Modal \*\/\}([\s\S]*?)\{\/\* Seller Funnel Modal \(S7\) or Timeline \*\/\}/);

let mheModalCode = mheMatch[1].replace(/showMheTrendModal/g, 'showMheModal');
let goalModalCode = goalMatch[1].replace(/showGoalShbTrendModal/g, 'showGoalModal');

const processedGroupsCode = `
          const processedGroups = hierarchy.flatMap((c: any) => c.tls.map((t: any) => ({
            l2_name: \`\${c.category_name} - \${t.tl_name}\`,
            l2_email: \`\${c.category_name}-\${t.tl_name}\`,
            members: t.sellers
          })))
`;

const newModalsSection = `
              {/* MHE Modal */}` + mheModalCode + `
              {/* Goal vs SHB Modal */}` + goalModalCode + `
`;

// Replace the old simple modals with the advanced ones
code = code.replace(/\{\/\* MHE Modal \*\/\}[\s\S]*?\{\/\* Goal vs SHB Modal \*\/\}[\s\S]*?<\/>/, newModalsSection + '\n            </>');

code = code.replace(
  /const ModalOverlay = \(\{ onClose, title, children \}: any\) => \(/,
  processedGroupsCode + '\n          const ModalOverlay = ({ onClose, title, children }: any) => ('
);

fs.writeFileSync('components/pages/AdminLTAPage.tsx', code);
console.log('Successfully updated AdminLTAPage.tsx!');
