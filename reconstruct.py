import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Fix computedOrgMhe
mhe_old = "  const computedOrgMhe = org.mhePct || 0"
mhe_new = """  const allSellersForAllDays = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  const dayMap: Record<string, { sum: number; count: number }> = {}
  allSellersForAllDays.forEach((m: any) => {
    ;(m.monthly_lta_rows || []).forEach((r: any) => {
      const d = r.log_date
      if (!d) return
      const pct = typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0
      if (!dayMap[d]) dayMap[d] = { sum: 0, count: 0 }
      dayMap[d].sum += pct
      dayMap[d].count += 1
    })
  })
  const sortedDays = Object.keys(dayMap).sort()
  const lastDay = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : null
  const computedOrgMhe = lastDay ? parseFloat((dayMap[lastDay].sum / dayMap[lastDay].count).toFixed(1)) : 0"""
text = text.replace(mhe_old, mhe_new)

# 2. Add computedOrgGoal and computedOrgShb
goal_old = """          <div className="la-kpi-card clickable" onClick={() => setShowGoalShbModal(true)}>
            <div className="la-kpi-label">Goal vs SHB <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#3B82F6' }}>{org.avgGoalPct || 0}%</div>
            <div className="la-kpi-sub">SHB: {org.avgShbPct || 0}%</div>
          </div>"""
goal_new = """          <div className="la-kpi-card clickable" onClick={() => setShowGoalShbModal(true)}>
            <div className="la-kpi-label">Goal vs SHB <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#3B82F6' }}>{computedOrgGoal}%</div>
            <div className="la-kpi-sub">SHB: {computedOrgShb}%</div>
          </div>"""
text = text.replace(goal_old, goal_new)

# 2b. Add the definitions right after computedOrgMhe
gs_def = """  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
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
  const computedOrgGoal = gsLastDay ? parseFloat((gsDayMap[gsLastDay].goalSum / gsDayMap[gsLastDay].count).toFixed(1)) : (org.avgGoalPct || 0)
  const computedOrgShb = gsLastDay ? parseFloat((gsDayMap[gsLastDay].shbSum / gsDayMap[gsLastDay].count).toFixed(1)) : (org.avgShbPct || 0)
"""
text = text.replace(mhe_new, mhe_new + "\n\n" + gs_def)

# 3. GoalShbTrendModal graph padding
pad_old = """    const padded = []
    for (let i = 1; i <= daysInMonth; i++) {"""
pad_new = """    const sortedDays = Object.keys(dayMap).sort()
    const targetDay = parseInt(dateFrom.split('-')[2])
    const maxDay = targetDay <= daysInMonth ? targetDay : daysInMonth
    const padded = []
    for (let i = 1; i <= maxDay; i++) {"""
text = text.replace(pad_old, pad_new)

# 4. Math.round to parseFloat in GoalShbTrendModal
text = text.replace(
    "const cgAvg = cLast ? Math.round(cDayMap[cLast].g / cDayMap[cLast].c) : 0",
    "const cgAvg = cLast ? parseFloat((cDayMap[cLast].g / cDayMap[cLast].c).toFixed(1)) : 0"
)
text = text.replace(
    "const csAvg = cLast ? Math.round(cDayMap[cLast].s / cDayMap[cLast].c) : 0",
    "const csAvg = cLast ? parseFloat((cDayMap[cLast].s / cDayMap[cLast].c).toFixed(1)) : 0"
)
text = text.replace(
    "const gAvg = tLast ? Math.round(tDayMap[tLast].g / tDayMap[tLast].c) : 0",
    "const gAvg = tLast ? parseFloat((tDayMap[tLast].g / tDayMap[tLast].c).toFixed(1)) : 0"
)
text = text.replace(
    "const sAvg = tLast ? Math.round(tDayMap[tLast].s / tDayMap[tLast].c) : 0",
    "const sAvg = tLast ? parseFloat((tDayMap[tLast].s / tDayMap[tLast].c).toFixed(1)) : 0"
)
text = text.replace(
    "const mgAvg = lastRow ? Math.round((lastRow.goal_completion || 0) * 100) : 0",
    "const mgAvg = lastRow ? parseFloat(((lastRow.goal_completion || 0) * 100).toFixed(1)) : 0"
)
text = text.replace(
    "const msAvg = lastRow ? Math.round((lastRow.shb_percent || 0) * 100) : 0",
    "const msAvg = lastRow ? parseFloat(((lastRow.shb_percent || 0) * 100).toFixed(1)) : 0"
)

# 5. Remove 'Lower = better' from MHE Modal
text = text.replace(
    """<div className="la-kpi-sub">Lower = better</div>""",
    ""
)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
