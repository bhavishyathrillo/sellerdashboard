const fs = require('fs');

let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

// Add state
if (!l1.includes('activeSellerFunnel')) {
  l1 = l1.replace(
    /const \[showTeamFunnel, setShowTeamFunnel\] = useState\(false\)/,
    "const [showTeamFunnel, setShowTeamFunnel] = useState(false)\n  const [activeSellerFunnel, setActiveSellerFunnel] = useState<any>(null)"
  );
}

// Replace onClick in LTA row (line 1835-ish)
l1 = l1.replace(
  /onClick=\{\(\) => setDrillSellerTimeline\(m\)\} style=\{\{ cursor: 'pointer' \}\}/g,
  "onClick={() => setActiveSellerFunnel(m)} style={{ cursor: 'pointer' }}"
);

// We need to replace the Team Funnel Modal and add the Seller Funnel Modal
// The old Team Funnel Modal starts at: `{/* Team Funnel Modal */}`
// and ends after the `)}` for `showTeamFunnel`

const newModals = `
      {/* Team Funnel Modal */}
      {showTeamFunnel && activeFunnelTl && (
        <div className={sellerStyles.modalOverlay} onClick={() => setShowTeamFunnel(false)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '500px', width: '540px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setShowTeamFunnel(false)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{activeFunnelTl.l2_name} — LTA Funnel</span>
            </div>
            
            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradTeam)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradTeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const getFunnelDropText = (diff, stage) => diff < 0 ? \`↑ Gained \${Math.abs(diff)} in \${stage}\` : \`↓ Lost \${diff} in \${stage}\`
                  
                  const teamPlanned = activeFunnelTl.members.reduce((sum, m) => sum + (m.isAbsent ? 0 : m.lta.planned), 0)
                  const teamDynLta = activeFunnelTl.members.reduce((sum, m) => sum + (m.isAbsent ? 0 : (m.daily_lta?.real_dynamic_lta || 0)), 0)
                  const teamHygLta = activeFunnelTl.members.reduce((sum, m) => sum + (m.isAbsent ? 0 : (m.daily_lta?.hygiene_lta || 0)), 0)
                  const teamRev1Lta = activeFunnelTl.members.reduce((sum, m) => sum + (m.isAbsent ? 0 : (m.daily_lta?.goal_completion_logic_lta || 0)), 0)
                  const teamActual = activeFunnelTl.members.reduce((sum, m) => sum + (m.isAbsent ? 0 : m.lta.actual), 0)

                  const teamDynLost = teamPlanned - teamDynLta
                  const teamHygLost = teamDynLta - teamHygLta
                  const teamRev1Lost = teamHygLta - teamRev1Lta
                  const teamRev2Lost = teamRev1Lta - teamActual

                  const stages = [
                    { id: 'planned', label: 'TEAM PLANNED', value: teamPlanned, color: '#3B82F6', dropText: getFunnelDropText(teamDynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'TEAM DYNAMIC', value: teamDynLta, color: '#EAB308', dropText: getFunnelDropText(teamHygLost, 'Hygiene'), width: '85%' },
                    { id: 'hygiene', label: 'TEAM HYGIENE', value: teamHygLta, color: '#F97316', dropText: getFunnelDropText(teamRev1Lost, 'Goal Complete'), width: '70%' },
                    { id: 'goalComplete', label: 'TEAM GOAL COMPLETE', value: teamRev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(teamRev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'TEAM FINAL', value: teamActual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: \`\${idx * 0.15}s\` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: \`\${step.color}20\`, color: step.color }}>Planned</span>}
                        </div>
                        <div className={sellerStyles.ltaFunnelCardBody}>
                          <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                          <span className={sellerStyles.ltaFunnelCardLabel}>Leads</span>
                        </div>
                      </div>
                      {step.dropText && (
                        <div className={sellerStyles.ltaFunnelDrop}>
                          <div className={sellerStyles.ltaFunnelLine} />
                          <div className={sellerStyles.ltaFunnelDropText}>{step.dropText}</div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller Funnel Modal */}
      {activeSellerFunnel && (
        <div className={sellerStyles.modalOverlay} onClick={() => setActiveSellerFunnel(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '500px', width: '540px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setActiveSellerFunnel(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{activeSellerFunnel.seller_name} — LTA Funnel</span>
            </div>
            
            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradSeller)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradSeller" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const getFunnelDropText = (diff, stage) => diff < 0 ? \`↑ Gained \${Math.abs(diff)} in \${stage}\` : \`↓ Lost \${diff} in \${stage}\`
                  
                  const planned = activeSellerFunnel.lta.planned;
                  const dynamic = activeSellerFunnel.daily_lta?.real_dynamic_lta || 0;
                  const hygiene = activeSellerFunnel.daily_lta?.hygiene_lta || 0;
                  const rev1 = activeSellerFunnel.daily_lta?.goal_completion_logic_lta || 0;
                  const actual = activeSellerFunnel.lta.actual;

                  const dynLost = planned - dynamic;
                  const hygLost = dynamic - hygiene;
                  const rev1Lost = hygiene - rev1;
                  const rev2Lost = rev1 - actual;

                  const stages = [
                    { id: 'planned', label: 'PLANNED LTA', value: planned, color: '#3B82F6', dropText: getFunnelDropText(dynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'DYNAMIC LTA', value: dynamic, color: '#EAB308', dropText: getFunnelDropText(hygLost, 'Hygiene'), width: '85%' },
                    { id: 'hygiene', label: 'HYGIENE LTA', value: hygiene, color: '#F97316', dropText: getFunnelDropText(rev1Lost, 'Goal Complete'), width: '70%' },
                    { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: rev1, color: '#8B5CF6', dropText: getFunnelDropText(rev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'FINAL LTA', value: actual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: \`\${idx * 0.15}s\` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: \`\${step.color}20\`, color: step.color }}>Planned</span>}
                        </div>
                        <div className={sellerStyles.ltaFunnelCardBody}>
                          <span className={sellerStyles.ltaFunnelCardValue}>{step.value}</span>
                          <span className={sellerStyles.ltaFunnelCardLabel}>Leads</span>
                        </div>
                      </div>
                      {step.dropText && (
                        <div className={sellerStyles.ltaFunnelDrop}>
                          <div className={sellerStyles.ltaFunnelLine} />
                          <div className={sellerStyles.ltaFunnelDropText}>{step.dropText}</div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
`;

const oldTeamFunnelStart = l1.indexOf('{/* Team Funnel Modal */}');
const split1 = l1.slice(0, oldTeamFunnelStart);
const remainder = l1.slice(oldTeamFunnelStart);

const endSearchStr = `            </div>\n          )\n        })()}`;
const endIdx = remainder.indexOf(endSearchStr);
if (endIdx !== -1) {
    // we need to include the rest of the block (the trailing '\n\n      </div>' part)
    const endBlockStr = remainder.slice(endIdx).indexOf('</div>');
    const finalL1 = split1 + newModals + "\n" + remainder.slice(endIdx + endSearchStr.length + 20); // rough slice to skip past old modal
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', finalL1);
    console.log("Replaced modals successfully");
} else {
    console.log("Could not find end of modal block");
}
