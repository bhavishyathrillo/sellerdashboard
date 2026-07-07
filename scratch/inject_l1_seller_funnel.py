import re

file_path = 'components/pages/L1SellerViewPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add state variable
if 'const [activeSellerFunnel' not in content:
    content = content.replace(
        'const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)',
        'const [activeFunnelTl, setActiveFunnelTl] = useState<any>(null)\n  const [activeSellerFunnel, setActiveSellerFunnel] = useState<any>(null)'
    )

# Add Individual Seller Funnel Modal before final closing tag
# Find the Team Funnel Modal and insert after it
individual_funnel = """      {/* Individual Seller Funnel Modal */}
      {activeSellerFunnel && (
        <div className={sellerStyles.modalOverlay} onClick={() => setActiveSellerFunnel(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '400px' }}>
            <button className={sellerStyles.modalClose} onClick={() => setActiveSellerFunnel(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} />
              <span className={sellerStyles.modalTitle}>{activeSellerFunnel.seller_name} — LTA Funnel</span>
            </div>
            
            <div className={sellerStyles.ltaFunnel3DContainer} style={{ marginTop: '20px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
              <svg className={sellerStyles.ltaFunnelBg} preserveAspectRatio="none" viewBox="0 0 100 100">
                <polygon points="0,0 100,0 75,100 25,100" fill="url(#funnelGradL1)" opacity="0.08" />
                <defs>
                  <linearGradient id="funnelGradL1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
              <div className={sellerStyles.ltaFunnelStack}>
                {(() => {
                  const lta = activeSellerFunnel.lta;
                  const getFunnelDropText = (diff: number, stage: string) => diff < 0 ? `↑ Gained ${Math.abs(diff)} in ${stage}` : `↓ Lost ${diff} in ${stage}`
                  const stages = [
                    { id: 'planned', label: 'PLANNED LTA', value: lta.planned, color: '#3B82F6', dropText: getFunnelDropText(lta.dynLost, 'Dynamic'), width: '100%' },
                    { id: 'dynamic', label: 'DYNAMIC LTA', value: lta.dynLta, color: '#EAB308', dropText: getFunnelDropText(lta.hygLost, 'Hygiene'), width: '88%' },
                    { id: 'hygiene', label: 'HYGIENE LTA', value: lta.hygLta, color: '#F97316', dropText: getFunnelDropText(lta.rev1Lost, 'Goal Complete'), width: '74%' },
                    { id: 'goalComplete', label: 'GOAL COMPLETE LTA', value: lta.rev1Lta, color: '#8B5CF6', dropText: getFunnelDropText(lta.rev2Lost, 'Final'), width: '62%' },
                    { id: 'final', label: 'FINAL LTA', value: lta.actual, color: '#22C55E', dropText: null, width: '50%' },
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
      )}
"""

if 'Individual Seller Funnel Modal' not in content:
    # Insert right before the last </div>
    # The Team Funnel Modal is usually near the end. Let's just put it before the last </div>
    content = content.replace('      {/* S1: Login & Availability */}', individual_funnel + '\n\n      {/* S1: Login & Availability */}')


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Individual Seller Funnel Modal")
