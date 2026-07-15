import React from 'react';


export default function GoalShbTrendModal(props: any) {
  const { setShowGoalShbTrendModal, date, todayStr, goalShbDrillSeller, setGoalShbDrillSeller, allMembers, processedGroups, goalShbExpandedTl, setGoalShbExpandedTl, GoalShbTrendChart } = props;

  // Render logic extracted from L1SellerViewPage
  const targetDay = date || todayStr();
          const dayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
          const targetDateObj = new Date(targetDay);
          const endDate = targetDateObj.getDate();
          const activeSellers = goalShbDrillSeller ? (goalShbDrillSeller.isGroup ? goalShbDrillSeller.members : [goalShbDrillSeller]) : allMembers
          activeSellers.forEach((m: any) => {
            ;(m.monthly_goal_shb || []).forEach((r: any) => {
              const d = r.date
              if (!d) return
              if (!dayMap[d]) dayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
              dayMap[d].goalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
              dayMap[d].shbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
              dayMap[d].count += 1
            })
          })
          const sortedDaysRaw = Object.keys(dayMap).sort();
          const maxAvailableDate = sortedDaysRaw.length > 0 ? new Date(sortedDaysRaw[sortedDaysRaw.length - 1]).getDate() : 0;
          const targetEndDate = Math.min(endDate + 1, maxAvailableDate);

          for (let i = 1; i <= targetEndDate; i++) {
            const dStr = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (!dayMap[dStr]) dayMap[dStr] = { goalSum: 0, shbSum: 0, count: 0 };
          }

          const sortedDays = Object.keys(dayMap).sort()
          const labels = sortedDays.map(d => {
            const dt = new Date(d)
            dt.setDate(dt.getDate() - 1)
            return `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`
          })
          const goalValues = sortedDays.map(d => dayMap[d].count > 0 ? parseFloat((dayMap[d].goalSum / dayMap[d].count).toFixed(0)) : 0)
          const shbValues = sortedDays.map(d => dayMap[d].count > 0 ? parseFloat((dayMap[d].shbSum / dayMap[d].count).toFixed(0)) : 0)
          const hasData = goalValues.some(v => v > 0) || shbValues.some(v => v > 0)
          const title = goalShbDrillSeller ? `${goalShbDrillSeller.seller_name} — Goal vs SHB` : `Team Goal vs SHB`

          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowGoalShbTrendModal(false)}>
              <div style={{ background: '#1A1A1A', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '28px', width: '820px', maxWidth: '96vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid #333', color: '#E5E7EB', cursor: 'pointer', fontSize: '1rem', padding: '4px 10px', borderRadius: '6px', lineHeight: 1 }} onClick={() => setShowGoalShbTrendModal(false)}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #262626' }}>
                  {goalShbDrillSeller && <button style={{ background: 'transparent', border: '1px solid #444', color: '#A1A1AA', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '8px' }} onClick={() => setGoalShbDrillSeller(null)}>← Back</button>}
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3B82F6', boxShadow: '0 0 10px #3B82F6' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>{title}</span>
                </div>
                <div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>
                  <div style={{ flex: 2, height: '280px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid #262626', padding: '16px' }}>
                    {hasData ? <GoalShbTrendChart labels={labels} goalValues={goalValues} shbValues={shbValues} /> : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No data for this month yet.</div>
                    )}
                  </div>
                  <div style={{ flex: 1, borderLeft: '1px solid #262626', paddingLeft: '20px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #262626' }}>Team Drill-down</div>
                    <div style={{ maxHeight: '240px', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {processedGroups.map((g: any) => {
                        let tlGoalSum = 0;
                        let tlShbSum = 0;
                        let tlMemberCount = 0;
                        g.members.forEach((s: any) => {
                          const r = (s.monthly_goal_shb || []).find((x: any) => x.date === (date || todayStr()))
                          if (r) {
                            tlGoalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
                            tlShbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
                            tlMemberCount++
                          }
                        })
                        const tlGoalAvg = tlMemberCount > 0 ? parseFloat((tlGoalSum / tlMemberCount).toFixed(1)) : 0
                        const tlShbAvg = tlMemberCount > 0 ? parseFloat((tlShbSum / tlMemberCount).toFixed(1)) : 0
                        return (
                        <div key={g.l2_email} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div 
                            onClick={() => {
                              setGoalShbExpandedTl(goalShbExpandedTl === g.l2_email ? null : g.l2_email);
                              setGoalShbDrillSeller({ ...g, isGroup: true, seller_name: `Team ${g.l2_name}` });
                            }}
                            style={{ fontSize: '0.75rem', fontWeight: 700, color: goalShbExpandedTl === g.l2_email ? '#3B82F6' : '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 8px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ transform: goalShbExpandedTl === g.l2_email ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.6rem' }}>▶</span>
                              {g.l2_name}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <span style={{ color: '#3B82F6', fontWeight: 500 }}>{tlGoalAvg}%</span>
                              <span style={{ color: '#EAB308', fontWeight: 500 }}>{tlShbAvg}%</span>
                            </div>
                          </div>
                          {goalShbExpandedTl === g.l2_email && g.members.map((s: any) => {
                            const r = (s.monthly_goal_shb || []).find((x: any) => x.date === (date || todayStr()))
                            const mgAvg = r ? parseFloat(((r.goal_completion || 0) * 100).toFixed(1)) : 0
                            const msAvg = r ? parseFloat(((r.shb_percent || 0) * 100).toFixed(1)) : 0
                            return (
                              <div key={s.seller_email} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: goalShbDrillSeller?.seller_email === s.seller_email ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setGoalShbDrillSeller(s)}>
                                <span style={{ color: '#E5E7EB' }}>{s.seller_name}</span>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <span style={{ color: '#3B82F6', fontWeight: 500 }}>{mgAvg}%</span>
                                  <span style={{ color: '#EAB308', fontWeight: 500 }}>{msAvg}%</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )})}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
}
