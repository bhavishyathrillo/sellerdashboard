import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. MHE KPI Card
old_mhe_kpi = """          const cmAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const latestDay = sortedDays[sortedDays.length - 1]
          const latestAvg = latestDay ? parseFloat((dayMap[latestDay].sum / dayMap[latestDay].count).toFixed(1)) : 0"""

new_mhe_kpi = """          const cmAvgMhePct = sortedDays.length > 0
            ? parseFloat((sortedDays.reduce((s, d) => s + dayMap[d].sum / dayMap[d].count, 0) / sortedDays.length).toFixed(1))
            : 0
          const targetDay = date || todayStr();
          const latestAvg = dayMap[targetDay] ? parseFloat((dayMap[targetDay].sum / dayMap[targetDay].count).toFixed(1)) : 0;"""
text = text.replace(old_mhe_kpi, new_mhe_kpi)

# 2. Goal vs SHB KPI Card
old_goal_kpi = """          const sortedDays = Object.keys(dayMap).sort()
          let latestDay = sortedDays[sortedDays.length - 1]
          if (date && dayMap[date]) {
            latestDay = date
          }
          
          const latestAvgGoal = latestDay ? parseFloat((dayMap[latestDay].goalSum / dayMap[latestDay].count).toFixed(0)) : 0
          const latestAvgShb = latestDay ? parseFloat((dayMap[latestDay].shbSum / dayMap[latestDay].count).toFixed(0)) : 0"""

new_goal_kpi = """          const sortedDays = Object.keys(dayMap).sort()
          const targetDay = date || todayStr();
          
          const latestAvgGoal = dayMap[targetDay] ? parseFloat((dayMap[targetDay].goalSum / dayMap[targetDay].count).toFixed(0)) : 0;
          const latestAvgShb = dayMap[targetDay] ? parseFloat((dayMap[targetDay].shbSum / dayMap[targetDay].count).toFixed(0)) : 0;"""
text = text.replace(old_goal_kpi, new_goal_kpi)

# 3. Goal vs SHB Trend Graph loop bound
old_goal_loop = """                const [y, mStr] = (date || todayStr()).split('-')
                const daysInMonth = new Date(parseInt(y), parseInt(mStr), 0).getDate()
                
                for (let i = 1; i <= daysInMonth; i++) {"""

new_goal_loop = """                const targetDateStr = date || todayStr();
                const [y, mStr, dStrLocal] = targetDateStr.split('-');
                let loopEnd = new Date(parseInt(y), parseInt(mStr), 0).getDate();
                const [currY, currM, currD] = todayStr().split('-');
                if (y === currY && mStr === currM) {
                   loopEnd = parseInt(currD);
                }
                
                for (let i = 1; i <= loopEnd; i++) {"""
text = text.replace(old_goal_loop, new_goal_loop)

# Also need to replace the loop inside `goalShbDrillSeller` and `goalShbExpandedTl`
old_goal_drill_loop = """                  for (let i = 1; i <= daysInMonth; i++) {"""
new_goal_drill_loop = """                  for (let i = 1; i <= loopEnd; i++) {"""
text = text.replace(old_goal_drill_loop, new_goal_drill_loop)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated to strictly use today's data!")
