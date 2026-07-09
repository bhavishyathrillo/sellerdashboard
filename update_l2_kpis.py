import re

with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the first 3 KPI cards (Total, RTG, Sellers w/ no leads)
old_cards = """      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>
              {totalLeads}
              <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 500, marginLeft: '6px' }}>
                of {teamActual}
              </span>
            </p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Total</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#E5E7EB', margin: '0 0 2px 0' }}>{totalAuto}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Auto</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#9CA3AF', margin: '0 0 2px 0' }}>{totalManual}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>Manual</p>
          </div>
        </div>
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E', margin: '0 0 2px 0' }}>{teamRtgPct}%</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.7rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG %</p>
          </div>
          <div style={{ width: '1px', alignSelf: 'stretch', background: 'linear-gradient(180deg, rgba(255,255,255,0), rgba(244,99,30,0.5), rgba(255,255,255,0))', margin: '0 12px' }} />
          <div style={{ flex: 1 }}>
            <p className={styles.summaryValue} style={{ fontSize: '1.3rem', fontWeight: 600, color: '#378ADD', margin: '0 0 2px 0' }}>{totalRtg}</p>
            <p className={styles.summaryLabel} style={{ fontSize: '0.65rem', color: '#8A8278', margin: 0, textTransform: 'uppercase' }}>RTG Count</p>
          </div>
        </div>
        <div 
          className={styles.summaryCard} 
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: noLeadsCount > 0 ? 'pointer' : 'default' }}
          onClick={() => {
            if (noLeadsCount > 0) {
              setShowNoLeadsModal(true);
            }
          }}
        >
          <p className={styles.summaryValue} style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F4631E' }}>{noLeadsCount}</p>
          <p className={styles.summaryLabel} style={{ fontSize: '0.8rem', color: '#8A8278', marginTop: '4px', textTransform: 'uppercase' }}>Sellers with no leads yet</p>
        </div>"""

new_cards = """      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        
        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.5, border: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#F4631E' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Leads Allotted</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Total</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{totalLeads} <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of {teamActual}</span></span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Auto</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#E5E7EB', lineHeight: 1 }}>{totalAuto}</span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Manual</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#9CA3AF', lineHeight: 1 }}>{totalManual}</span>
            </div>
          </div>
        </div>

        <div className={styles.summaryCard} style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#378ADD' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>RTG Breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>RTG %</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{teamRtgPct}%</span>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Count</div>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#378ADD', lineHeight: 1 }}>{totalRtg}</span>
            </div>
          </div>
        </div>

        <div
          className={styles.summaryCard}
          style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1, border: '1px solid #333', cursor: noLeadsCount > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}
          onClick={() => {
            if (noLeadsCount > 0) setShowNoLeadsModal(true);
          }}
          onMouseEnter={e => { if(noLeadsCount > 0) e.currentTarget.style.borderColor = '#444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#EF4444' }} />
          <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Sellers w/ No Leads</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#F4631E', lineHeight: 1 }}>{noLeadsCount}</span>
          </div>
        </div>"""
text = text.replace(old_cards, new_cards)

# Fix MHE formatting and Today logic
old_mhe = """          const sortedDays = Object.keys(dayMap).sort()
          const teamAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const latestDay = sortedDays[sortedDays.length - 1]
          const latestAvg = latestDay ? parseFloat((dayMap[latestDay].sum / dayMap[latestDay].count).toFixed(1)) : 0
          const isGood = teamAvgMhePct <= 20

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isGood ? '#22C55E' : '#EF4444' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Monthly MHE Trend</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{teamAvgMhePct}%</span>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>avg</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Latest day: </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: latestAvg <= 20 ? '#22C55E' : '#EF4444' }}>{latestAvg}%</span>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )"""
new_mhe = """          const sortedDays = Object.keys(dayMap).sort()
          const teamAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const targetDay = date || todayStr();
          const latestAvg = dayMap[targetDay] ? parseFloat((dayMap[targetDay].sum / dayMap[targetDay].count).toFixed(1)) : 0;
          const isGood = teamAvgMhePct <= 20

          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isGood ? '#22C55E' : '#EF4444' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>MHE Trend</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Current</div>
                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{latestAvg}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto', marginTop: '-12px' }}>tap to view ▶</span>
              </div>
            </div>
          )"""
text = text.replace(old_mhe, new_mhe)


# Fix Goal vs SHB formatting and Today logic
old_goal = """          let latestDay = sortedDays[sortedDays.length - 1]
          if (date && dayMap[date]) {
            latestDay = date
          }
          
          const latestAvgGoal = latestDay ? parseFloat((dayMap[latestDay].goalSum / dayMap[latestDay].count).toFixed(0)) : 0
          const latestAvgShb = latestDay ? parseFloat((dayMap[latestDay].shbSum / dayMap[latestDay].count).toFixed(0)) : 0
          
          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid #333`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3B82F6' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Team Goal vs SHB</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Goal</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto' }}>tap to view ▶</span>
              </div>
            </div>
          )"""
new_goal = """          const targetDay = date || todayStr();
          const latestAvgGoal = dayMap[targetDay] ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0
          const latestAvgShb = dayMap[targetDay] ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0
          
          return (
            <div
              className={styles.summaryCard}
              style={{
                background: '#1A1A1A', padding: '16px', borderRadius: '8px', flex: 1.2,
                border: `1px solid #333`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#3B82F6' }} />
              <div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Team Goal vs SHB (Today)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>Goal</div>
                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#3B82F6', lineHeight: 1 }}>{latestAvgGoal}%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                   <div style={{ fontSize: '0.6rem', color: '#8A8278', marginBottom: '2px' }}>SHB</div>
                   <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EAB308', lineHeight: 1 }}>{latestAvgShb}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.6rem', color: '#555', marginLeft: 'auto', marginTop: '-12px' }}>tap to view ▶</span>
              </div>
            </div>
          )"""
text = text.replace(old_goal, new_goal)


with open('components/pages/L2SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated L2 KPI cards formatting and logic!")
