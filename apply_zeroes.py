import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. MHE Modal Drill Down - Category Avg
mhe_cat_old = """                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  const catDayMap = buildDayMap(catSellers)
                  const catDays = Object.keys(catDayMap)
                  const catAvg = catDays.length > 0 ? parseFloat((catDays.reduce((s, d) => s + (catDayMap[d].sum / catDayMap[d].count), 0) / catDays.length).toFixed(1)) : 0"""

mhe_cat_new = """                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  const cCount = catSellers.length
                  let cmSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                    if (r && typeof r.mishandled_pct === 'number') cmSum += r.mishandled_pct * 100
                  })
                  const catAvg = cCount > 0 ? parseFloat((cmSum / cCount).toFixed(1)) : 0"""
text = text.replace(mhe_cat_old, mhe_cat_new)

# 2. MHE Modal Drill Down - TL Avg
mhe_tl_old = """                        const tlDayMap = buildDayMap(tl.sellers)
                        const tlDays = Object.keys(tlDayMap)
                        const tlAvg = tlDays.length > 0 ? parseFloat((tlDays.reduce((s, d) => s + (tlDayMap[d].sum / tlDayMap[d].count), 0) / tlDays.length).toFixed(1)) : 0"""

mhe_tl_new = """                        const tlSellers = tl.sellers || []
                        const tCount = tlSellers.length
                        let tmSum = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                          if (r && typeof r.mishandled_pct === 'number') tmSum += r.mishandled_pct * 100
                        })
                        const tlAvg = tCount > 0 ? parseFloat((tmSum / tCount).toFixed(1)) : 0"""
text = text.replace(mhe_tl_old, mhe_tl_new)

# 3. MHE Modal Drill Down - Seller Avg
mhe_seller_old = """                              let mSum = 0, mDays = 0
                              ;(s.monthly_lta_rows || []).forEach((r: any) => { if (typeof r.mishandled_pct === 'number') { mSum += r.mishandled_pct * 100; mDays++ } })
                              const mAvg = mDays > 0 ? parseFloat((mSum / mDays).toFixed(1)) : 0"""

mhe_seller_new = """                              const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                              const mAvg = r && typeof r.mishandled_pct === 'number' ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0"""
text = text.replace(mhe_seller_old, mhe_seller_new)


# 4. Goal vs SHB Modal Drill Down - Category Avg
gs_cat_old = """                  let cGSum = 0, cSSum = 0, cCnt = 0
                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  catSellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { cGSum += (r.goal_completion || 0) * 100; cSSum += (r.shb_percent || 0) * 100; cCnt++ }))
                  const cgAvg = cCnt > 0 ? Math.round(cGSum / cCnt) : 0
                  const csAvg = cCnt > 0 ? Math.round(cSSum / cCnt) : 0"""

gs_cat_new = """                  const catSellers = cat.tls.flatMap((t: any) => (t.sellers || []))
                  const cCount = catSellers.length
                  let cGSum = 0, cSSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                    if (r) {
                      cGSum += (r.goal_completion || 0) * 100
                      cSSum += (r.shb_percent || 0) * 100
                    }
                  })
                  const cgAvg = cCount > 0 ? parseFloat((cGSum / cCount).toFixed(1)) : 0
                  const csAvg = cCount > 0 ? parseFloat((cSSum / cCount).toFixed(1)) : 0"""
text = text.replace(gs_cat_old, gs_cat_new)


# 5. Goal vs SHB Modal Drill Down - TL Avg
gs_tl_old = """                        let gSum = 0, sSum = 0, cnt = 0
                        tl.sellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { gSum += (r.goal_completion || 0) * 100; sSum += (r.shb_percent || 0) * 100; cnt++ }))
                        const gAvg = cnt > 0 ? Math.round(gSum / cnt) : 0
                        const sAvg = cnt > 0 ? Math.round(sSum / cnt) : 0"""

gs_tl_new = """                        const tlSellers = tl.sellers || []
                        const tCount = tlSellers.length
                        let gSum = 0, sSum = 0
                        tlSellers.forEach((s: any) => {
                          const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                          if (r) {
                            gSum += (r.goal_completion || 0) * 100
                            sSum += (r.shb_percent || 0) * 100
                          }
                        })
                        const gAvg = tCount > 0 ? parseFloat((gSum / tCount).toFixed(1)) : 0
                        const sAvg = tCount > 0 ? parseFloat((sSum / tCount).toFixed(1)) : 0"""
text = text.replace(gs_tl_old, gs_tl_new)

# 6. Goal vs SHB Modal Drill Down - Seller Avg
gs_seller_old = """                              let mg = 0, ms = 0, mc = 0
                              ;(s.monthly_goal_shb || []).forEach((r: any) => { mg += (r.goal_completion || 0) * 100; ms += (r.shb_percent || 0) * 100; mc++ })
                              const mgAvg = mc > 0 ? Math.round(mg / mc) : 0
                              const msAvg = mc > 0 ? Math.round(ms / mc) : 0"""

gs_seller_new = """                              const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                              const mgAvg = r ? parseFloat(((r.goal_completion || 0) * 100).toFixed(1)) : 0
                              const msAvg = r ? parseFloat(((r.shb_percent || 0) * 100).toFixed(1)) : 0"""
text = text.replace(gs_seller_old, gs_seller_new)

# 7. Add dateFrom to MheTrendModal props if missing
text = text.replace(
    "function MheTrendModal({ hierarchy, onClose }: { hierarchy: any[], onClose: () => void }) {",
    "function MheTrendModal({ hierarchy, dateFrom, onClose }: { hierarchy: any[], dateFrom: string, onClose: () => void }) {"
)
text = text.replace(
    "<MheTrendModal hierarchy={hierarchy} onClose={() => setShowMheModal(false)} />",
    "<MheTrendModal hierarchy={hierarchy} dateFrom={dateFrom} onClose={() => setShowMheModal(false)} />"
)

# 8. Fix KPI Cards inside the main component
text = re.sub(
    r"  const allSellersForAllDays = hierarchy\.flatMap.*?\n  const computedOrgMhe = lastDay \? parseFloat\(\(dayMap\[lastDay\]\.sum / dayMap\[lastDay\]\.count\)\.toFixed\(1\)\) : 0",
    """  const allSellersForMhe = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => t.sellers || []))
  const mheCount = allSellersForMhe.length
  let omheSum = 0
  allSellersForMhe.forEach((s: any) => {
    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
    if (r && typeof r.mishandled_pct === 'number') omheSum += r.mishandled_pct * 100
  })
  const computedOrgMhe = mheCount > 0 ? parseFloat((omheSum / mheCount).toFixed(1)) : 0""",
    text,
    flags=re.DOTALL
)

text = re.sub(
    r"  const allGoalShbSellers = hierarchy\.flatMap.*?\n  const computedOrgShb = gsLastDay \? parseFloat\(\(gsDayMap\[gsLastDay\]\.shbSum / gsDayMap\[gsLastDay\]\.count\)\.toFixed\(1\)\) : \(org\.avgShbPct \|\| 0\)",
    """  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => t.sellers || []))
  const gsCount = allGoalShbSellers.length
  let ogSum = 0, osSum = 0
  allGoalShbSellers.forEach((s: any) => {
    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
    if (r) {
      ogSum += (r.goal_completion || 0) * 100
      osSum += (r.shb_percent || 0) * 100
    }
  })
  const computedOrgGoal = gsCount > 0 ? parseFloat((ogSum / gsCount).toFixed(1)) : 0
  const computedOrgShb = gsCount > 0 ? parseFloat((osSum / gsCount).toFixed(1)) : 0""",
    text,
    flags=re.DOTALL
)

# 9. Update GoalShb padding up to dateFrom
pad_old = """    const padded = []
    for (let i = 1; i <= daysInMonth; i++) {"""
pad_new = """    const targetDay = parseInt(dateFrom.split('-')[2])
    const maxDay = targetDay <= daysInMonth ? targetDay : daysInMonth
    const padded = []
    for (let i = 1; i <= maxDay; i++) {"""
if pad_old in text:
    text = text.replace(pad_old, pad_new)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Applied exact zeroes logic cleanly!')
