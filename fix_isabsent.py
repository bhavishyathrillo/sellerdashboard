import os

files = [
    'components/pages/L1SellerViewPage.tsx',
    'components/pages/L2SellerViewPage.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # In tables, remove `m.isAbsent ? '—' : `
    text = text.replace("{m.isAbsent ? '—' : formatTime(m.attendance?.first_login)}", "{formatTime(m.attendance?.first_login)}")
    text = text.replace("{m.isAbsent ? '—' : formatTime(m.cti?.logged_in_at)}", "{formatTime(m.cti?.logged_in_at)}")
    text = text.replace("{m.isAbsent ? '—' : delta !== null ? `${delta}m` : '—'}", "{delta !== null ? `${delta}m` : '—'}")
    text = text.replace("{m.isAbsent ? '—' : formatTime(m.allotment?.first_lead_allotted_at_ist)}", "{formatTime(m.allotment?.first_lead_allotted_at_ist)}")
    text = text.replace("{m.isAbsent ? '—' : `${b.totalMinutes}m`}", "{b.totalMinutes > 0 ? `${b.totalMinutes}m` : '—'}")
    text = text.replace("{m.isAbsent ? '—' : `${Math.round((b.totalMinutes / (9*60))*100)}%`}", "{b.totalMinutes > 0 ? `${Math.round((b.totalMinutes / (9*60))*100)}%` : '—'}")
    text = text.replace("{m.isAbsent ? '—' : `${m.b.totalMinutes}m`}", "{m.b.totalMinutes > 0 ? `${m.b.totalMinutes}m` : '—'}")
    text = text.replace("{m.isAbsent ? '—' : m.b.count}", "{m.b.count > 0 ? m.b.count : '—'}")
    text = text.replace("{m.isAbsent ? '—' : `${m.b.longestMinutes}m`}", "{m.b.longestMinutes > 0 ? `${m.b.longestMinutes}m` : '—'}")

    # Remove `m.isAbsent ? 0 : ` from reducers
    text = text.replace("(m.isAbsent ? 0 : (m.allotment?.rtg_leads || 0))", "(m.allotment?.rtg_leads || 0)")
    text = text.replace("(m.isAbsent ? 0 : (m.allotment?.non_rtg_leads || 0))", "(m.allotment?.non_rtg_leads || 0)")
    text = text.replace("(m.isAbsent ? 0 : (m.daily_lta?.final_lta || 0))", "(m.daily_lta?.final_lta || 0)")

    # RTG vs Non-RTG list filter overrides `if (m.isAbsent) return null`
    # We should change it to filter if they have no allotment leads at all
    text = text.replace("if (m.isAbsent) return null\n                      const rtg = m.allotment?.rtg_leads || 0\n                      const non = m.allotment?.non_rtg_leads || 0",
                        "const rtg = m.allotment?.rtg_leads || 0\n                      const non = m.allotment?.non_rtg_leads || 0\n                      if (rtg + non === 0 && m.isAbsent) return null")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print("Removed isAbsent overrides in tables and aggregations!")
