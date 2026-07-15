import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_func_regex = r'function LTASection\(\{.*?<tbody>.*?</tbody>\s*</table>\s*</div>\s*\)'

new_func = """function LTASection({ hierarchy, onTlFunnelClick, onSellerFunnelClick }: { hierarchy: any[], onTlFunnelClick: (tl: any, catName: string) => void, onSellerFunnelClick: (seller: any) => void }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Allotted</th>
            <th>Planned</th>
            <th>Actual</th>
            <th>Appetite</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const allotted = allSellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
            const planned = allSellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
            const actual = allSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
            const appetite = allSellers.reduce((s: number, e: any) => s + (e.monthly_lta_rows || []).reduce((sum: number, r: any) => sum + (r.final_lta || 0), 0), 0)
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allotted}</td>
                  <td>{planned}</td>
                  <td>{actual}</td>
                  <td>{appetite}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlAllotted = tl.sellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
                  const tlPlanned = tl.sellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
                  const tlActual = tl.sellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
                  const tlAppetite = tl.sellers.reduce((s: number, e: any) => s + (e.monthly_lta_rows || []).reduce((sum: number, r: any) => sum + (r.final_lta || 0), 0), 0)
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlAllotted}</td>
                        <td>{tlPlanned}</td>
                        <td>{tlActual}</td>
                        <td>{tlAppetite}</td>
                      </tr>
                      {expandedTl === tlKey && (
                        <tr>
                          <td colSpan={5} style={{ padding: '8px 16px 8px 28px', background: 'rgba(0,0,0,0.2)' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onTlFunnelClick(tl, catKey) }}
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              📊 View Team Funnel
                            </button>
                          </td>
                        </tr>
                      )}
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sAppetite = (s.monthly_lta_rows || []).reduce((sum: number, r: any) => sum + (r.final_lta || 0), 0)
                        return (
                          <tr key={s.seller_email} className="la-seller-row" onClick={() => onSellerFunnelClick(s)} style={{ cursor: 'pointer' }}>
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.totalLeads || 0}</td>
                            <td>{s.ltaPlanned || 0}</td>
                            <td>{s.ltaActual || 0}</td>
                            <td>{sAppetite}</td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}"""

match = re.search(old_func_regex, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), new_func)
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced LTASection")
else:
    print("Did not find LTASection to replace")
