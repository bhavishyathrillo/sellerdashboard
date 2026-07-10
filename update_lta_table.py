import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_headers = """              <th>Team Planned LTA</th>
              <th>Team Final LTA</th>"""
new_headers = """              <th>Team Planned LTA</th>
              <th>Team Final LTA</th>
              <th>Team Leads Allotted</th>
              <th>Team Fulfillment %</th>"""
text = text.replace(old_headers, new_headers)

old_tl_cols = """                  <td>{g.agg.teamPlanned}</td>
                  <td style={{ color: '#22C55E', fontWeight: 600 }}>{g.agg.teamActual}</td>"""
new_tl_cols = """                  <td>{g.agg.teamPlanned}</td>
                  <td style={{ color: '#22C55E', fontWeight: 600 }}>{g.agg.teamActual}</td>
                  <td>{g.agg.totalLeads}</td>
                  <td>{g.agg.teamActual > 0 ? Math.round((g.agg.totalLeads / g.agg.teamActual) * 100) : 0}%</td>"""
text = text.replace(old_tl_cols, new_tl_cols)

# Note: colSpan={3} in sellerRow needs to be updated to colSpan={5}
old_colspan = """<td colSpan={3} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>"""
new_colspan = """<td colSpan={5} style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)' }}>"""
text = text.replace(old_colspan, new_colspan)

old_seller_cols = """                      <td>{m.lta.planned}</td>
                      <td style={{ color: m.isAbsent ? 'inherit' : actualColor, fontWeight: 600 }}>
                        {m.lta.actual}
                      </td>"""
new_seller_cols = """                      <td>{m.lta.planned}</td>
                      <td style={{ color: m.isAbsent ? 'inherit' : actualColor, fontWeight: 600 }}>
                        {m.lta.actual}
                      </td>
                      <td>{(m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)}</td>
                      <td>{m.lta.actual > 0 ? Math.round((((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) / m.lta.actual) * 100) : 0}%</td>"""
text = text.replace(old_seller_cols, new_seller_cols)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated LTA table with Leads Allotted and Fulfillment!")
