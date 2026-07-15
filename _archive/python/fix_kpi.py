with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# I will find the exact lines to replace.
import re
text = re.sub(
    r"  const computedOrgGoal = .*?const computedOrgShb = .*?\n",
    "",
    text,
    flags=re.DOTALL
)

insertion = """
  const allSellersForMhe = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => t.sellers || []))
  const mheCount = allSellersForMhe.length
  let omheSum = 0
  allSellersForMhe.forEach((s: any) => {
    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
    if (r && typeof r.mishandled_pct === 'number') omheSum += r.mishandled_pct * 100
  })
  const computedOrgMhe = mheCount > 0 ? parseFloat((omheSum / mheCount).toFixed(1)) : 0

  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => t.sellers || []))
  const gsCount = allGoalShbSellers.length
  let ogSum = 0, osSum = 0
  allGoalShbSellers.forEach((s: any) => {
    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
    if (r) {
      ogSum += (r.goal_completion || 0) * 100
      osSum += (r.shb_percent || 0) * 100
    }
  })
  const computedOrgGoal = gsCount > 0 ? parseFloat((ogSum / gsCount).toFixed(1)) : (org.avgGoalPct || 0)
  const computedOrgShb = gsCount > 0 ? parseFloat((osSum / gsCount).toFixed(1)) : (org.avgShbPct || 0)

"""

# Insert before 'return ('
text = text.replace("return (", insertion + "  return (")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
