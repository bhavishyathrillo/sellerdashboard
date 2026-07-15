import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target_insert = """  // MHE Category Average
  let orgMheCatSum = 0;
  let orgMheCatCount = 0;
  hierarchy.forEach((cat: any) => {
    const catSellers = (cat.tls || []).flatMap((t: any) => (t.sellers || []));
    const cCount = catSellers.length;
    let cmSum = 0;
    catSellers.forEach((s: any) => {
      const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom);
      if (r && typeof r.mishandled_pct === 'number') cmSum += r.mishandled_pct * 100;
    });
    const catAvg = cCount > 0 ? (cmSum / cCount) : 0;
    orgMheCatSum += catAvg;
    orgMheCatCount += 1;
  });
  const computedOrgMhe = orgMheCatCount > 0 ? parseFloat((orgMheCatSum / orgMheCatCount).toFixed(1)) : 0;

  // Goal vs SHB Category Average
  let orgGoalCatSum = 0;
  let orgShbCatSum = 0;
  let orgGsCatCount = 0;
  hierarchy.forEach((cat: any) => {
    const catSellers = (cat.tls || []).flatMap((t: any) => (t.sellers || []));
    const cCount = catSellers.length;
    let cgSum = 0;
    let csSum = 0;
    catSellers.forEach((s: any) => {
      const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom);
      if (r) {
        cgSum += (r.goal_completion || 0) * 100;
        csSum += (r.shb_percent || 0) * 100;
      }
    });
    const catGoalAvg = cCount > 0 ? (cgSum / cCount) : 0;
    const catShbAvg = cCount > 0 ? (csSum / cCount) : 0;
    orgGoalCatSum += catGoalAvg;
    orgShbCatSum += catShbAvg;
    orgGsCatCount += 1;
  });
  const computedOrgGoal = orgGsCatCount > 0 ? parseFloat((orgGoalCatSum / orgGsCatCount).toFixed(1)) : 0;
  const computedOrgShb = orgGsCatCount > 0 ? parseFloat((orgShbCatSum / orgGsCatCount).toFixed(1)) : 0;"""

insert_logic = """  // MHE Flat Average
  const allSellersForMhe = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  let mheCount = 0
  let omheSum = 0
  allSellersForMhe.forEach((s: any) => {
    const r = (s.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
    if (r) mheCount += 1
    if (r && typeof r.mishandled_pct === 'number') omheSum += r.mishandled_pct * 100
  })
  const computedOrgMhe = mheCount > 0 ? parseFloat((omheSum / mheCount).toFixed(1)) : 0

  // Goal vs SHB Flat Average
  const allGoalShbSellers = hierarchy.flatMap((c: any) => (c.tls || []).flatMap((t: any) => (t.sellers || [])))
  let gsCount = 0
  let ogSum = 0, osSum = 0
  allGoalShbSellers.forEach((s: any) => {
    const r = (s.monthly_goal_shb || []).find((x: any) => x.date === dateFrom)
    if (r) {
      gsCount += 1
      ogSum += (r.goal_completion || 0) * 100
      osSum += (r.shb_percent || 0) * 100
    }
  })
  const computedOrgGoal = gsCount > 0 ? parseFloat((ogSum / gsCount).toFixed(1)) : 0
  const computedOrgShb = gsCount > 0 ? parseFloat((osSum / gsCount).toFixed(1)) : 0"""

text = text.replace(target_insert, insert_logic)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
