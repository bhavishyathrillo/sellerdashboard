import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the broken definitions near the JSX
bad_defs = """  const allGoalShbSellers = hierarchy.flatMap((c: any) => c.tls.flatMap((t: any) => t.sellers))
  const gsDayMap: Record<string, { goalSum: number; shbSum: number; count: number }> = {}
  allGoalShbSellers.forEach((m: any) => {
    ;(m.monthly_goal_shb || []).forEach((r: any) => {
      const d = r.date
      if (!d) return
      if (!gsDayMap[d]) gsDayMap[d] = { goalSum: 0, shbSum: 0, count: 0 }
      gsDayMap[d].goalSum += typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
      gsDayMap[d].shbSum += typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
      gsDayMap[d].count += 1
    })
  })
  const gsSortedDays = Object.keys(gsDayMap).sort()
  const gsLastDay = gsSortedDays.length > 0 ? gsSortedDays[gsSortedDays.length - 1] : null
  const computedOrgGoal = gsLastDay ? Math.round(gsDayMap[gsLastDay].goalSum / gsDayMap[gsLastDay].count) : (org.avgGoalPct || 0)
  const computedOrgShb = gsLastDay ? parseFloat((gsDayMap[gsLastDay].shbSum / gsDayMap[gsLastDay].count).toFixed(1)) : (org.avgShbPct || 0)"""

text = text.replace(bad_defs + "\n\n", "")
text = text.replace(bad_defs + "\n", "")
text = text.replace(bad_defs, "")

# Insert right after computedOrgMhe
mhe_def = "  const computedOrgMhe = lastDay ? parseFloat((dayMap[lastDay].sum / dayMap[lastDay].count).toFixed(1)) : 0"
if mhe_def in text:
    text = text.replace(mhe_def, mhe_def + "\n\n" + bad_defs)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
