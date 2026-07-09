import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. MHE KPI Card: swap big number to be latestAvg, small number to be cmAvgMhePct
text = text.replace(
    "<span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{cmAvgMhePct}%</span>",
    "<span style={{ fontSize: '1.8rem', fontWeight: 700, color: isGood ? '#22C55E' : '#EF4444', lineHeight: 1 }}>{latestAvg}%</span>"
)
text = text.replace(
    "<span style={{ fontSize: '0.72rem', fontWeight: 600, color: latestAvg <= 20 ? '#22C55E' : '#EF4444' }}>{latestAvg}%</span>",
    "<span style={{ fontSize: '0.72rem', fontWeight: 600, color: cmAvgMhePct <= 20 ? '#22C55E' : '#EF4444' }}>{cmAvgMhePct}%</span>"
)
text = text.replace(
    "<span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Latest day: </span>",
    "<span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Monthly avg: </span>"
)


# 2. MHE Modal Team Drill-down: calculate latest day avg instead of monthly avg
old_mhe_drilldown_logic = """                                  let tSum = 0; let tDays = 0;
                                  Object.values(tMheMap).forEach(v => { tSum += v.s / v.c; tDays++; })
                                  const tAvg = tDays > 0 ? parseFloat((tSum / tDays).toFixed(1)) : 0"""

new_mhe_drilldown_logic = """                                  const sortedTDays = Object.keys(tMheMap).sort()
                                  const latestTDay = sortedTDays[sortedTDays.length - 1]
                                  const tAvg = latestTDay ? parseFloat((tMheMap[latestTDay].s / tMheMap[latestTDay].c).toFixed(1)) : 0"""
text = text.replace(old_mhe_drilldown_logic, new_mhe_drilldown_logic)

# 3. Goal vs SHB Modal Team Drill-down: calculate latest day goal avg instead of monthly avg
old_goal_drilldown_logic = """                                  let tGoalSum = 0; let tShbSum = 0; let tDays = 0;
                                  Object.values(tGoalMap).forEach(v => { tGoalSum += v.g / v.c; tShbSum += v.s / v.c; tDays++; })
                                  const tGoalAvg = tDays > 0 ? parseFloat((tGoalSum / tDays).toFixed(0)) : 0
                                  const tShbAvg = tDays > 0 ? parseFloat((tShbSum / tDays).toFixed(0)) : 0"""

new_goal_drilldown_logic = """                                  const sortedTDays = Object.keys(tGoalMap).sort()
                                  const latestTDay = sortedTDays[sortedTDays.length - 1]
                                  const tGoalAvg = latestTDay ? parseFloat((tGoalMap[latestTDay].g / tGoalMap[latestTDay].c).toFixed(0)) : 0
                                  const tShbAvg = latestTDay ? parseFloat((tGoalMap[latestTDay].s / tGoalMap[latestTDay].c).toFixed(0)) : 0"""
text = text.replace(old_goal_drilldown_logic, new_goal_drilldown_logic)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated CM MHE/Goal Modals for latest day!")
