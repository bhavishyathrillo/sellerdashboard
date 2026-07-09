import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Sellers with no leads yet - filter out absent sellers in noLeadsCount calculation
text = text.replace(
    "const noLeadsCount = members.filter((m: any) => ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0).length",
    "const noLeadsCount = members.filter((m: any) => !m.isAbsent && ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0).length"
)

# 1b. Sellers with no leads yet - filter out absent sellers in modal
text = text.replace(
    "const noLeadsSellers = g.members.filter((m: any) => (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0) === 0);",
    "const noLeadsSellers = g.members.filter((m: any) => !m.isAbsent && ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0);"
)

# 2. Monthly MHE Trend - remove CM
text = text.replace(
    "<span style={{ fontSize: '0.65rem', color: '#8A8278' }}>CM avg</span>",
    "<span style={{ fontSize: '0.65rem', color: '#8A8278' }}>Avg</span>"
)
text = text.replace(
    "Monthly MHE Trend · CM Avg",
    "Monthly MHE Trend · Avg"
)

# 3. Team Goal vs SHB - remove Team
text = text.replace(
    "<div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Team Goal vs SHB</div>",
    "<div style={{ fontSize: '0.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Goal vs SHB</div>"
)
text = text.replace(
    "Monthly Goal vs SHB Trend · CM Avg",
    "Monthly Goal vs SHB Trend · Avg"
)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated CM KPIs!")
