import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Insert computations
target_insert = "  return (\n    <>\n      <style>{CSS}</style>"
insert_logic = """  // MHE Category Average
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
  const computedOrgShb = orgGsCatCount > 0 ? parseFloat((orgShbCatSum / orgGsCatCount).toFixed(1)) : 0;

  return (
    <>
      <style>{CSS}</style>"""

if "orgMheCatSum" not in text:
    text = text.replace(target_insert, insert_logic)

# 2. Replace KPI cards JSX
kpi_old = """          <div className="la-kpi-card clickable" onClick={() => setShowMheModal(true)}>
            <div className="la-kpi-label">Org MHE % <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#22C55E' }}>{org.mhePct}%</div>
            <div className="la-kpi-sub">Lower = better</div>
          </div>

          <div className="la-kpi-card clickable" onClick={() => setShowGoalShbModal(true)}>
            <div className="la-kpi-label">Goal vs SHB <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#3B82F6' }}>{org.avgGoalPct}%</div>
            <div className="la-kpi-sub">SHB: {org.avgShbPct}%</div>
          </div>"""

kpi_new = """          <div className="la-kpi-card clickable" onClick={() => setShowMheModal(true)}>
            <div className="la-kpi-label">Org MHE % <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#22C55E' }}>{computedOrgMhe}%</div>
          </div>

          <div className="la-kpi-card clickable" onClick={() => setShowGoalShbModal(true)}>
            <div className="la-kpi-label">Goal vs SHB <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none' }}>· tap</span></div>
            <div className="la-kpi-value" style={{ color: '#3B82F6' }}>{computedOrgGoal}%</div>
            <div className="la-kpi-sub">SHB: {computedOrgShb}%</div>
          </div>"""

text = text.replace(kpi_old, kpi_new)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
