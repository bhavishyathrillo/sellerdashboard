import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove Target > 80%
text = text.replace('<div className="la-kpi-sub">Target &gt;80%</div>', '')

# 2. Remove Weighted avg across org
text = text.replace('<div className="la-kpi-sub">Weighted avg across org</div>', '')

# 3. Calculate sumFinalLta
lta_calc = """  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        const r = (seller.monthly_lta_rows || []).find((x: any) => x.log_date === dateFrom)
        return s3 + (r ? Math.floor(r.final_lta || 0) : 0)
      }, 0)
    , 0)
  , 0)

  const computedOrgMhe ="""

text = text.replace("  const computedOrgMhe =", lta_calc)

# 4. Update the "Total leads (org)" KPI card
old_leads_kpi = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Total leads (org)</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.totalLeads?.toLocaleString() || 0}</div>
            <div className="la-kpi-sub">{org.categoryCount} categories · {org.tlCount} TLs · {org.sellerCount} sellers</div>
          </div>"""

new_leads_kpi = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Leads Allotted</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.totalLeads?.toLocaleString() || 0}</div>
            <div className="la-kpi-sub">OUT OF {sumFinalLta.toLocaleString()}</div>
          </div>"""

text = text.replace(old_leads_kpi, new_leads_kpi)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
