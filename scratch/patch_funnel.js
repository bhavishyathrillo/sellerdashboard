const fs = require('fs');

const file = '/Users/thrillophilia/Documents/Seller-dashboard-test/seller-dashboard-test/components/pages/AdminLTAPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const newFunnelModal = `function FunnelModal({ title, funnel, onClose }: { title: string, funnel: ReturnType<typeof aggregateLtaFunnel>, onClose: () => void }) {
  const stages = [
    { 
      id: 'planned', label: 'Base target', sublabel: 'Planned LTA', value: funnel.planned, color: '#3B82F6', 
      drop: funnel.dynLost, dropLabel: funnel.dynLost > 0 ? 'Late login / inactive' : funnel.dynLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'dynamic', label: 'Dynamic LTA', sublabel: 'Adjusted for online time', value: funnel.dynLta, color: '#EAB308', 
      drop: funnel.hygLost, dropLabel: funnel.hygLost > 0 ? 'Hygiene penalty' : funnel.hygLost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'hygiene', label: 'After hygiene', sublabel: 'Based on mishandled', value: funnel.hygLta, color: '#F97316', 
      drop: funnel.rev1Lost, dropLabel: funnel.rev1Lost > 0 ? 'Goal correction' : funnel.rev1Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'goalComplete', label: 'After goal check', sublabel: 'Adjusted for goal completion', value: funnel.rev1Lta, color: '#8B5CF6', 
      drop: funnel.rev2Lost, dropLabel: funnel.rev2Lost > 0 ? 'Final adjustment' : funnel.rev2Lost < 0 ? 'Bonus added' : null
    },
    { 
      id: 'final', label: "Final target", sublabel: 'Actual LTA', value: funnel.actual, color: '#22C55E', 
      drop: null, dropLabel: null
    },
  ]
  return (
    <div className="la-modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '24px', width: 'auto', maxWidth: '95vw', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F0EDE8' }}>{title} — LTA Funnel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '4px' }}>
          {stages.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
              <div style={{
                background: '#0D0D0D', border: \`1px solid \${step.color}40\`,
                borderRadius: '10px', padding: '10px 14px', minWidth: '140px', flexShrink: 0,
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.58rem', color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{step.label}</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F0EDE8', lineHeight: 1 }}>{step.value}</div>
                <div style={{ fontSize: '0.55rem', color: '#5A5650', marginTop: '3px', lineHeight: 1.3 }}>{step.sublabel}</div>
              </div>

              {idx < stages.length - 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px', minWidth: '64px' }}>
                  {step.drop !== null && step.drop !== 0 && (
                    <div style={{
                      fontSize: '0.58rem', fontWeight: 700,
                      color: step.drop > 0 ? '#EF4444' : '#22C55E',
                      background: step.drop > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      padding: '2px 6px', borderRadius: '6px', marginBottom: '4px',
                      whiteSpace: 'nowrap',
                    }}>
                      {step.drop > 0 ? \`−\${step.drop}\` : \`+\${Math.abs(step.drop)}\`}
                    </div>
                  )}
                  <div style={{ fontSize: '0.55rem', color: '#4A4642', textAlign: 'center', lineHeight: 1.2, marginBottom: '4px' }}>
                    {step.dropLabel}
                  </div>
                  <span style={{ color: '#3A3A3A', fontSize: '1rem' }}>→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}`;

// Replaces from function FunnelModal to the closing brace before /* ─── MHE Trend Modal
const startToken = 'function FunnelModal({ title, funnel, onClose }: { title: string, funnel: ReturnType<typeof aggregateLtaFunnel>, onClose: () => void }) {';
const endToken = '/* ─── MHE Trend Modal (org / TL / seller drill) ─── */';
const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newFunnelModal + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log("Successfully patched FunnelModal!");
} else {
  console.log("Failed to find boundaries", { startIndex, endIndex });
}
