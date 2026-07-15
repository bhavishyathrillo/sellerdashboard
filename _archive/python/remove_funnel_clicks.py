import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_func_regex = r'function LTASection\(\{.*?<tbody>.*?</tbody>\s*</table>\s*</div>\s*\)'

new_func = """function LTASection({ hierarchy }: { hierarchy: any[] }) {
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
            <th>Fulfillment %</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers)
            const allotted = allSellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
            const planned = allSellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
            const actual = allSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
            const catFulf = actual > 0 ? Math.round((allotted / actual) * 100) : 0
            const catColor = catFulf >= 90 ? '#22C55E' : catFulf >= 70 ? '#F59E0B' : '#EF4444'
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allotted}</td>
                  <td>{planned}</td>
                  <td>{actual}</td>
                  <td style={{ color: catColor }}>{catFulf}%</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlAllotted = tl.sellers.reduce((s: number, e: any) => s + (e.totalLeads || 0), 0)
                  const tlPlanned = tl.sellers.reduce((s: number, e: any) => s + (e.ltaPlanned || 0), 0)
                  const tlActual = tl.sellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
                  const tlFulf = tlActual > 0 ? Math.round((tlAllotted / tlActual) * 100) : 0
                  const tlColor = tlFulf >= 90 ? '#22C55E' : tlFulf >= 70 ? '#F59E0B' : '#EF4444'
                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '28px' }}>↳ {tl.tl_name}</td>
                        <td>{tlAllotted}</td>
                        <td>{tlPlanned}</td>
                        <td>{tlActual}</td>
                        <td style={{ color: tlColor }}>{tlFulf}%</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.map((s: any) => {
                        const sActual = s.ltaActual || 0
                        const sAllotted = s.totalLeads || 0
                        const sFulf = sActual > 0 ? Math.round((sAllotted / sActual) * 100) : 0
                        const sColor = sFulf >= 90 ? '#22C55E' : sFulf >= 70 ? '#F59E0B' : '#EF4444'
                        
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{sAllotted}</td>
                            <td>{s.ltaPlanned || 0}</td>
                            <td>{sActual}</td>
                            <td style={{ color: sColor }}>{sFulf}%</td>
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

# Need to update the `<LTASection ... />` call as well in AdminLTAPage.tsx
# `<LTASection hierarchy={hierarchy} onTlFunnelClick={openTlFunnel} onSellerFunnelClick={openSellerFunnel} />`
# Replace with: `<LTASection hierarchy={hierarchy} />`

text = re.sub(r'<LTASection hierarchy=\{hierarchy\} onTlFunnelClick=\{.*?\} onSellerFunnelClick=\{.*?\} />', r'<LTASection hierarchy={hierarchy} />', text)


match = re.search(old_func_regex, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), new_func)
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Removed funnel clicks from LTASection")
else:
    print("Did not find LTASection to replace")
