import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# MheTrendModal catAvg
mhe_cat_old = """                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  const catDayMap = buildDayMap(catSellers)
                  const catDays = Object.keys(catDayMap).sort()
                  const catLastDay = catDays.length > 0 ? catDays[catDays.length - 1] : null
                  const catAvg = catLastDay ? parseFloat((catDayMap[catLastDay].sum / catDayMap[catLastDay].count).toFixed(1)) : 0"""
mhe_cat_new = """                  const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                  const catCount = catSellers.length
                  let cmSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                    if (r && typeof r.mishandled_pct === 'number') cmSum += r.mishandled_pct * 100
                  })
                  const catAvg = catCount > 0 ? parseFloat((cmSum / catCount).toFixed(1)) : 0"""
text = text.replace(mhe_cat_old, mhe_cat_new)

# MheTrendModal tlAvg
mhe_tl_old = """                        const tlDayMap = buildDayMap(tl.sellers)
                        const tlDays = Object.keys(tlDayMap).sort()
                        const tlLastDay = tlDays.length > 0 ? tlDays[tlDays.length - 1] : null
                        const tlAvg = tlLastDay ? parseFloat((tlDayMap[tlLastDay].sum / tlDayMap[tlLastDay].count).toFixed(1)) : 0"""
mhe_tl_new = """                        const tlCount = tl.sellers.length
                        let tmSum = 0
                        tl.sellers.forEach((s: any) => {
                          const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                          if (r && typeof r.mishandled_pct === 'number') tmSum += r.mishandled_pct * 100
                        })
                        const tlAvg = tlCount > 0 ? parseFloat((tmSum / tlCount).toFixed(1)) : 0"""
text = text.replace(mhe_tl_old, mhe_tl_new)

# MheTrendModal sAvg
mhe_s_old = """                              const sRows = (s.monthly_lta_rows || []).filter((r: any) => typeof r.mishandled_pct === 'number').sort((a: any, b: any) => a.log_date.localeCompare(b.log_date))
                              const mAvg = sRows.length > 0 ? parseFloat((sRows[sRows.length - 1].mishandled_pct * 100).toFixed(1)) : 0"""
mhe_s_new = """                              const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
                              const mAvg = (r && typeof r.mishandled_pct === 'number') ? parseFloat((r.mishandled_pct * 100).toFixed(1)) : 0"""
text = text.replace(mhe_s_old, mhe_s_new)


# GoalShbTrendModal catAvg
gs_cat_old = """                  const cDayMap: any = {}
                  const catSellers = (cat.tls || []).flatMap((t: any) => t.sellers)
                  catSellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { 
                    if (!r.date) return
                    if (!cDayMap[r.date]) cDayMap[r.date] = { g: 0, s: 0, c: 0 }
                    cDayMap[r.date].g += (r.goal_completion || 0) * 100
                    cDayMap[r.date].s += (r.shb_percent || 0) * 100
                    cDayMap[r.date].c += 1
                  }))
                  const cDays = Object.keys(cDayMap).sort()
                  const cLast = cDays.length > 0 ? cDays[cDays.length - 1] : null
                  const cgAvg = cLast ? parseFloat((cDayMap[cLast].g / cDayMap[cLast].c).toFixed(1)) : 0
                  const csAvg = cLast ? parseFloat((cDayMap[cLast].s / cDayMap[cLast].c).toFixed(1)) : 0"""
gs_cat_new = """                  const catSellers = (cat.tls || []).flatMap((t: any) => t.sellers)
                  const catCount = catSellers.length
                  let cgSum = 0, csSum = 0
                  catSellers.forEach((s: any) => {
                    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                    if (r) {
                      cgSum += (r.goal_completion || 0) * 100
                      csSum += (r.shb_percent || 0) * 100
                    }
                  })
                  const cgAvg = catCount > 0 ? parseFloat((cgSum / catCount).toFixed(1)) : 0
                  const csAvg = catCount > 0 ? parseFloat((csSum / catCount).toFixed(1)) : 0"""
text = text.replace(gs_cat_old, gs_cat_new)


# GoalShbTrendModal tlAvg
gs_tl_old = """                        const tDayMap: any = {}
                        tl.sellers.forEach((m: any) => (m.monthly_goal_shb || []).forEach((r: any) => { 
                          if (!r.date) return
                          if (!tDayMap[r.date]) tDayMap[r.date] = { g: 0, s: 0, c: 0 }
                          tDayMap[r.date].g += (r.goal_completion || 0) * 100
                          tDayMap[r.date].s += (r.shb_percent || 0) * 100
                          tDayMap[r.date].c += 1
                        }))
                        const tDays = Object.keys(tDayMap).sort()
                        const tLast = tDays.length > 0 ? tDays[tDays.length - 1] : null
                        const gAvg = tLast ? parseFloat((tDayMap[tLast].g / tDayMap[tLast].c).toFixed(1)) : 0
                        const sAvg = tLast ? parseFloat((tDayMap[tLast].s / tDayMap[tLast].c).toFixed(1)) : 0"""
gs_tl_new = """                        const tlCount = (tl.sellers || []).length
                        let tgSum = 0, tsSum = 0
                        ;(tl.sellers || []).forEach((s: any) => {
                          const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                          if (r) {
                            tgSum += (r.goal_completion || 0) * 100
                            tsSum += (r.shb_percent || 0) * 100
                          }
                        })
                        const gAvg = tlCount > 0 ? parseFloat((tgSum / tlCount).toFixed(1)) : 0
                        const sAvg = tlCount > 0 ? parseFloat((tsSum / tlCount).toFixed(1)) : 0"""
text = text.replace(gs_tl_old, gs_tl_new)

# GoalShbTrendModal sAvg
gs_s_old = """                              const sRows = (s.monthly_goal_shb || []).filter((r: any) => r.date).sort((a: any, b: any) => a.date.localeCompare(b.date))
                              const lastRow = sRows.length > 0 ? sRows[sRows.length - 1] : null
                              const mgAvg = lastRow ? parseFloat(((lastRow.goal_completion || 0) * 100).toFixed(1)) : 0
                              const msAvg = lastRow ? parseFloat(((lastRow.shb_percent || 0) * 100).toFixed(1)) : 0"""
gs_s_new = """                              const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
                              const mgAvg = r ? parseFloat(((r.goal_completion || 0) * 100).toFixed(1)) : 0
                              const msAvg = r ? parseFloat(((r.shb_percent || 0) * 100).toFixed(1)) : 0"""
text = text.replace(gs_s_old, gs_s_new)


# KPI Card MHE
kpi_mhe_old = """  const allSellersForAllDays = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
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
kpi_mhe_new = """  const allSellersForAllDays = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  const mheCount = allSellersForAllDays.length
  let omheSum = 0
  allSellersForAllDays.forEach((s: any) => {
    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
    if (r && typeof r.mishandled_pct === 'number') omheSum += r.mishandled_pct * 100
  })
  const computedOrgMhe = mheCount > 0 ? parseFloat((omheSum / mheCount).toFixed(1)) : 0"""
text = text.replace(kpi_mhe_old, kpi_mhe_new)


# KPI Card Goal vs SHB
kpi_gs_old = """  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
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
  const computedOrgShb = gsLastDay ? parseFloat((gsDayMap[gsLastDay].shbSum / gsDayMap[gsLastDay].count).toFixed(1)) : (org.avgShbPct || 0)"""
kpi_gs_new = """  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
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
  const computedOrgShb = gsCount > 0 ? parseFloat((osSum / gsCount).toFixed(1)) : (org.avgShbPct || 0)"""
text = text.replace(kpi_gs_old, kpi_gs_new)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
