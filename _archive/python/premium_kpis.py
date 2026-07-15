def get_premium_html(is_l1=False):
    tot_leads = "{globalLeads}" if is_l1 else "{totalLeads}"
    actual = "{globalFinalLta}" if is_l1 else "{teamActual}"
    tot_auto = "{globalAuto}" if is_l1 else "{totalAuto}"
    tot_man = "{globalManual}" if is_l1 else "{totalManual}"
    
    rtg_pct = "{globalRtgPct}" if is_l1 else "{teamRtgPct}"
    tot_rtg = "{globalRtg}" if is_l1 else "{totalRtg}"
    
    no_leads = "{globalNoLeads}" if is_l1 else "{noLeadsCount}"
    
    members_var = "allMembers" if is_l1 else "enrichedMembers"

    html = """      <div className={styles.summaryStrip} style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        
        {/* LEADS ALLOTTED */}
        <div className={styles.summaryCard} style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '24px', borderRadius: '16px', flex: 1.5, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #F4631E, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #F4631E' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E', boxShadow: '0 0 10px #F4631E' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Leads Allotted</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>TOT_LEADS</span>
            <span style={{ fontSize: '1rem', color: '#71717A', fontWeight: 400 }}>/ ACTUAL</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#E5E7EB' }}>TOT_AUTO</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Manual</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#9CA3AF' }}>TOT_MAN</span>
            </div>
          </div>
        </div>

        {/* RTG BREAKDOWN */}
        <div className={styles.summaryCard} style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '24px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}>
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #378ADD, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #378ADD' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#378ADD', boxShadow: '0 0 10px #378ADD' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>RTG Breakdown</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>RTG_PCT</span>
            <span style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#378ADD' }}>TOT_RTG</span>
          </div>
        </div>

        {/* SELLERS WITH NO LEADS */}
        <div
          className={styles.summaryCard}
          style={{ background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '24px', borderRadius: '16px', flex: 1, border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', cursor: NO_LEADS > 0 ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease' }}
          onClick={() => {
            if (NO_LEADS > 0) setShowNoLeadsModal(true);
          }}
          onMouseEnter={e => { if(NO_LEADS > 0) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #EF4444, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #EF4444' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
            <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Sellers No Leads</div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>NO_LEADS</span>
          </div>
        </div>

        {/* Monthly MHE Trend KPI Card */}
        {(() => {
          const dayMap: Record<string, { sum: number; count: number }> = {}
          MEMBERS_VAR.forEach((m: any) => {
            ;(m.monthly_lta_logs || []).forEach((r: any) => {
              const d = r.log_date
              if (!d) return
              const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
              if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
              dayMap[d].sum += pct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
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
                background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '24px', borderRadius: '16px', flex: 1.2,
                border: `1px solid ${isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
              }}
              onClick={() => { setMheDrillSeller(null); setShowMheTrendModal(true); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = isGood ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isGood ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: `linear-gradient(90deg, transparent, ${isGood ? '#22C55E' : '#EF4444'}, transparent)`, opacity: 0.6, boxShadow: `0 0 20px 2px ${isGood ? '#22C55E' : '#EF4444'}` }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isGood ? '#22C55E' : '#EF4444', boxShadow: `0 0 10px ${isGood ? '#22C55E' : '#EF4444'}` }} />
                  <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>MHE Trend</div>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tap to View</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvg}</span>
                <span style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#22C55E' }}>20%</span>
              </div>
            </div>
          )
        })()}

        {/* Goal vs SHB KPI Card */}
        {(() => {
          const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
          MEMBERS_VAR.forEach((m: any) => {
            ;(m.monthly_goal_shb || []).forEach((r: any) => {
              const d = r.date
              if (!d) return
              const goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
              const shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
              if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
              dayMap[d].goalSum += goalPct
              dayMap[d].shbSum += shbPct
              dayMap[d].count += 1
            })
          })
          const sortedDays = Object.keys(dayMap).sort()
          const targetDay = date || todayStr();
          const latestAvgGoal = dayMap[targetDay] ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0
          const latestAvgShb = dayMap[targetDay] ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0
          
          return (
            <div
              className={styles.summaryCard}
              style={{
                background: 'linear-gradient(180deg, #1A1A1A 0%, #111111 100%)', padding: '24px', borderRadius: '16px', flex: 1.2,
                border: '1px solid rgba(255,255,255,0.04)', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
              }}
              onClick={() => { setGoalShbDrillSeller(null); setShowGoalShbTrendModal(true); }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg, transparent, #3B82F6, transparent)', opacity: 0.6, boxShadow: '0 0 20px 2px #3B82F6' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 10px #3B82F6' }} />
                  <div style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' }}>Goal vs SHB</div>
                </div>
                <span style={{ fontSize: '0.65rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tap to View</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvgGoal}</span>
                  <span style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
                </div>
                <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 300, color: '#FFFFFF', lineHeight: 1 }}>{latestAvgShb}</span>
                  <span style={{ fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 300 }}>%</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.65rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Goal</span>
                <span style={{ fontSize: '0.65rem', color: '#EAB308', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SHB</span>
              </div>
            </div>
          )
        })()}
      </div>"""

    return html.replace('TOT_LEADS', tot_leads)\
               .replace('ACTUAL', actual)\
               .replace('TOT_AUTO', tot_auto)\
               .replace('TOT_MAN', tot_man)\
               .replace('RTG_PCT', rtg_pct)\
               .replace('TOT_RTG', tot_rtg)\
               .replace('NO_LEADS', no_leads)\
               .replace('MEMBERS_VAR', members_var)

def replace_in_file(filepath, is_l1):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    start_tag = "<div className={styles.summaryStrip}"
    end_tag = "</div>\n\n      {/* S1: Login & Availability */}"
    
    start_idx = content.find(start_tag)
    end_idx = content.find(end_tag, start_idx)
    
    if start_idx == -1 or end_idx == -1:
        print(f"Could not find summary strip in {filepath}")
        return

    new_content = content[:start_idx] + get_premium_html(is_l1) + "\n\n      {/* S1: Login & Availability */}" + content[end_idx + len(end_tag):]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

replace_in_file('components/pages/L1SellerViewPage.tsx', True)
replace_in_file('components/pages/L2SellerViewPage.tsx', False)

print("Applied Ultra-Premium Layout")
