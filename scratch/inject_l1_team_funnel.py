import re

file_path = 'components/pages/L1SellerViewPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new LTA Team Funnel Modal for L1
new_modal = """      {/* Team Funnel Modal */}
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
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradTeamL1)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradTeamL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const mList = activeFunnelTl.members || [];
                  const tfPlanned = mList.reduce((sum: number, m: any) => sum + m.lta.planned, 0);
                  const tfDynLta = mList.reduce((sum: number, m: any) => sum + m.lta.dynLta, 0);
                  const tfHygLta = mList.reduce((sum: number, m: any) => sum + m.lta.hygLta, 0);
                  const tfRev1Lta = mList.reduce((sum: number, m: any) => sum + m.lta.rev1Lta, 0);
                  const tfActual = mList.reduce((sum: number, m: any) => sum + m.lta.actual, 0);
                  
                  const tfDynLost = mList.reduce((sum: number, m: any) => sum + m.lta.dynLost, 0);
                  const tfHygLost = mList.reduce((sum: number, m: any) => sum + m.lta.hygLost, 0);
                  const tfRev1Lost = mList.reduce((sum: number, m: any) => sum + m.lta.rev1Lost, 0);
                  const tfRev2Lost = mList.reduce((sum: number, m: any) => sum + m.lta.rev2Lost, 0);

                  const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
                  const stages = [
                    { id: 'planned', label: 'TEAM PLANNED', value: tfPlanned, color: '#3B82F6', dropText: getFunnelDropText(tfDynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'TEAM DYNAMIC', value: tfDynLta, color: '#EAB308', dropText: getFunnelDropText(tfHygLost, 'Hygiene'), width: '85%' },
                    { id: 'hygiene', label: 'TEAM HYGIENE', value: tfHygLta, color: '#F97316', dropText: getFunnelDropText(tfRev1Lost, 'Goal Complete'), width: '70%' },
                    { id: 'goalComplete', label: 'TEAM GOAL COMPLETE', value: tfRev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(tfRev2Lost, 'Final'), width: '60%' },
                    { id: 'final', label: 'TEAM FINAL', value: tfActual, color: '#22C55E', dropText: null, width: '50%' },
                  ]
                  return stages.map((step, idx) => (
                    <div key={step.id} className={sellerStyles.ltaFunnelStepWrap} style={{ animationDelay: `${idx * 0.15}s` } as any}>
                      <div className={sellerStyles.ltaFunnelCard} style={{ '--card-color': step.color, borderColor: step.color, width: step.width } as any}>
                        <div className={sellerStyles.ltaFunnelCardHeader}>
                          <span className={sellerStyles.ltaFunnelCardTitle} style={{ color: step.color }}>{step.label}</span>
                          {step.id === 'planned' && <span className={sellerStyles.ltaFunnelBadge} style={{ background: `${step.color}20`, color: step.color }}>Planned</span>}
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
      )}"""

# Replace the Team Funnel Modal Block using Regex
pattern = r"\{\/\* Team Funnel Modal \*\/\}.*?showTeamFunnel && activeFunnelTl.*?\}\)\(\)\}\s*<\/div>\s*<\/div>\s*\)\}"

new_content = re.sub(pattern, new_modal, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated Team Funnel Modal")
