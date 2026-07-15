import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. MHE Drill-down TL logic
old_mhe_tl = """                                  const sortedTDays = Object.keys(tMheMap).sort()
                                  const latestTDay = sortedTDays[sortedTDays.length - 1]
                                  const tAvg = latestTDay ? parseFloat((tMheMap[latestTDay].s / tMheMap[latestTDay].c).toFixed(1)) : 0"""

new_mhe_tl = """                                  const targetDateStr = date || todayStr();
                                  const tAvg = tMheMap[targetDateStr] ? parseFloat((tMheMap[targetDateStr].s / tMheMap[targetDateStr].c).toFixed(1)) : 0;"""
text = text.replace(old_mhe_tl, new_mhe_tl)

# 2. MHE Drill-down Seller logic
old_mhe_seller = """                                        const validRows = (m.monthly_lta_rows || []).filter((r: any) => typeof r.mishandled_pct === 'number');
                                        validRows.sort((a: any, b: any) => a.log_date.localeCompare(b.log_date));
                                        const latestRow = validRows[validRows.length - 1];
                                        const mAvg = latestRow ? parseFloat((latestRow.mishandled_pct * 100).toFixed(1)) : 0;"""

new_mhe_seller = """                                        const targetDateStr = date || todayStr();
                                        const targetRow = (m.monthly_lta_rows || []).find((r: any) => r.log_date === targetDateStr && typeof r.mishandled_pct === 'number');
                                        const mAvg = targetRow ? parseFloat((targetRow.mishandled_pct * 100).toFixed(1)) : 0;"""
text = text.replace(old_mhe_seller, new_mhe_seller)

# 3. Goal vs SHB Drill-down TL logic
old_goal_tl = """                                const sortedTDays = Object.keys(tGoalMap).sort()
                                const latestTDay = sortedTDays[sortedTDays.length - 1]
                                const gGoalAvg = latestTDay ? parseFloat((tGoalMap[latestTDay].gSum / tGoalMap[latestTDay].c).toFixed(0)) : 0
                                const gShbAvg = latestTDay ? parseFloat((tGoalMap[latestTDay].sSum / tGoalMap[latestTDay].c).toFixed(0)) : 0"""

new_goal_tl = """                                const targetDateStr = date || todayStr();
                                const gGoalAvg = tGoalMap[targetDateStr] ? parseFloat((tGoalMap[targetDateStr].gSum / tGoalMap[targetDateStr].c).toFixed(0)) : 0;
                                const gShbAvg = tGoalMap[targetDateStr] ? parseFloat((tGoalMap[targetDateStr].sSum / tGoalMap[targetDateStr].c).toFixed(0)) : 0;"""
text = text.replace(old_goal_tl, new_goal_tl)

# 4. Goal vs SHB Drill-down Seller logic
old_goal_seller = """                                      const validRows = (m.monthly_goal_shb || []).filter((r: any) => typeof r.goal_completion === 'number' && typeof r.shb_percent === 'number');
                                      validRows.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));
                                      const latestRow = validRows[validRows.length - 1];
                                      const mGoalAvg = latestRow ? parseFloat(((latestRow.goal_completion || 0) * 100).toFixed(0)) : 0;
                                      const mShbAvg = latestRow ? parseFloat(((latestRow.shb_percent || 0) * 100).toFixed(0)) : 0;"""

new_goal_seller = """                                      const targetDateStr = date || todayStr();
                                      const targetRow = (m.monthly_goal_shb || []).find((r: any) => r.date === targetDateStr && typeof r.goal_completion === 'number' && typeof r.shb_percent === 'number');
                                      const mGoalAvg = targetRow ? parseFloat(((targetRow.goal_completion || 0) * 100).toFixed(0)) : 0;
                                      const mShbAvg = targetRow ? parseFloat(((targetRow.shb_percent || 0) * 100).toFixed(0)) : 0;"""
text = text.replace(old_goal_seller, new_goal_seller)


with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated drilldown to strictly use today's data!")
