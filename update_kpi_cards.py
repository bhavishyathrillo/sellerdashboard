import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Card 1, 2, 3
old_cards = """      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{globalLeads} <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of</span> {globalFinalLta}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Leads Allotted</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#E5E7EB', margin: '0 0 2px 0' }}>{globalAuto}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Auto</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#9CA3AF', margin: '0 0 2px 0' }}>{globalManual}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Manual</p>
          </div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{globalRtgPct}%</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG %</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#378ADD', margin: '0 0 2px 0' }}>{globalRtg}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG Count</p>
          </div>
        </div>

        <div
          className={styles.summaryCard}
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: globalNoLeads > 0 ? 'pointer' : 'default' }}
          onClick={() => {
            if (globalNoLeads > 0) setShowNoLeadsModal(true);
          }}
        >
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>{globalNoLeads}</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Sellers with no leads yet</p>
        </div>"""

new_cards = """      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#F4631E' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Leads Allotted</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Total</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{globalLeads} <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of {globalFinalLta}</span></span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Auto</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#E5E7EB', lineHeight: 1 }}>{globalAuto}</span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Manual</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#9CA3AF', lineHeight: 1 }}>{globalManual}</span>
            </div>
          </div>
        </div>

        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#378ADD' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>RTG Breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>RTG %</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{globalRtgPct}%</span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Count</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#378ADD', lineHeight: 1 }}>{globalRtg}</span>
            </div>
          </div>
        </div>

        <div
          className={styles.summaryCard}
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: globalNoLeads > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}
          onClick={() => {
            if (globalNoLeads > 0) setShowNoLeadsModal(true);
          }}
          onMouseEnter={e => { if(globalNoLeads > 0) e.currentTarget.style.borderColor = '#444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#EF4444' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Sellers w/ No Leads</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{globalNoLeads}</span>
          </div>
        </div>"""
text = text.replace(old_cards, new_cards)

# Fix MHE font size and layout (lines ~634)
old_mhe = """              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{latestAvg}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>"""
new_mhe = """              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Current</div>
                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{latestAvg}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto', marginTop: '-12px' }}>tap to view ▶</span>
              </div>"""
text = text.replace(old_mhe, new_mhe)

# Fix Goal vs SHB font size (lines ~1424, 1429)
old_goal_shb = """                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>"""
new_goal_shb = """                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>"""
text = text.replace(old_goal_shb, new_goal_shb)


with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated KPI cards formatting!")
