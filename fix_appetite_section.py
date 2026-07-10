import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to replace the AppetiteSection function
old_section = re.search(r'function AppetiteSection\(.*?\n\}', text, re.DOTALL | re.MULTILINE)

new_section = """function AppetiteSection({ hierarchy }: { hierarchy: any[] }) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedTl, setExpandedTl] = useState<string | null>(null)

  return (
    <div className="la-table-wrap">
      <table className="la-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Leads Allotted</th>
            <th>Appetite (LTA)</th>
            <th>Fulfillment %</th>
            <th>Avg C→A Time</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.map(cat => {
            const allSellers = cat.tls.flatMap((t: any) => t.sellers).filter((s: any) => !s.isAbsent)
            const allotted = allSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const appetite = allSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
            const pct = appetite > 0 ? Math.round((allotted / appetite) * 100) : 0
            
            const caSellers = allSellers.filter((s: any) => s.totalLeads > 0 && s.medianCA != null)
            const sumCta = caSellers.reduce((s: number, e: any) => s + (e.medianCA * e.totalLeads), 0)
            const sumLeads = caSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
            const avgCa = sumLeads > 0 ? Math.round(sumCta / sumLeads) : null
            
            const catKey = cat.category_name

            return (
              <React.Fragment key={catKey}>
                <tr className="la-cat-row" onClick={() => setExpandedCat(expandedCat === catKey ? null : catKey)}>
                  <td>{catKey}</td>
                  <td>{allotted}</td>
                  <td>{appetite}</td>
                  <td style={{ color: pct >= 90 ? '#22C55E' : pct >= 70 ? '#F59E0B' : '#EF4444' }}>{pct}%</td>
                  <td>{avgCa != null ? `${avgCa}m` : '—'}</td>
                </tr>
                {expandedCat === catKey && cat.tls.map((tl: any) => {
                  const tlSellers = tl.sellers.filter((s: any) => !s.isAbsent)
                  const tlAllotted = tlSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  const tlAppetite = tlSellers.reduce((s: number, e: any) => s + (e.ltaActual || 0), 0)
                  const tlPct = tlAppetite > 0 ? Math.round((tlAllotted / tlAppetite) * 100) : 0
                  
                  const tlCaSellers = tlSellers.filter((s: any) => s.totalLeads > 0 && s.medianCA != null)
                  const tlSumCta = tlCaSellers.reduce((s: number, e: any) => s + (e.medianCA * e.totalLeads), 0)
                  const tlSumLeads = tlCaSellers.reduce((s: number, e: any) => s + e.totalLeads, 0)
                  const tlAvgCa = tlSumLeads > 0 ? Math.round(tlSumCta / tlSumLeads) : null

                  const tlKey = `${catKey}-${tl.tl_name}`

                  return (
                    <React.Fragment key={tlKey}>
                      <tr className="la-tl-row" onClick={() => setExpandedTl(expandedTl === tlKey ? null : tlKey)}>
                        <td style={{ paddingLeft: '24px' }}>
                          <span style={{ fontSize: '10px', marginRight: '6px', opacity: 0.5 }}>▼</span>
                          {tl.tl_name}
                        </td>
                        <td>{tlAllotted}</td>
                        <td>{tlAppetite}</td>
                        <td style={{ color: tlPct >= 90 ? '#22C55E' : tlPct >= 70 ? '#F59E0B' : '#EF4444' }}>{tlPct}%</td>
                        <td>{tlAvgCa != null ? `${tlAvgCa}m` : '—'}</td>
                      </tr>
                      {expandedTl === tlKey && tl.sellers.filter((s: any) => !s.isAbsent).map((s: any) => {
                        const sPct = s.ltaActual > 0 ? Math.round((s.totalLeads / s.ltaActual) * 100) : 0
                        return (
                          <tr key={s.seller_email} className="la-seller-row">
                            <td style={{ paddingLeft: '48px' }}>{s.seller_name}</td>
                            <td>{s.totalLeads}</td>
                            <td>{s.ltaActual || 0}</td>
                            <td style={{ color: sPct >= 90 ? '#22C55E' : sPct >= 70 ? '#F59E0B' : '#EF4444' }}>{sPct}%</td>
                            <td>{s.medianCA != null ? `${s.medianCA}m` : '—'}</td>
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

if old_section:
    text = text.replace(old_section.group(0), new_section)
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced AppetiteSection")
else:
    print("Could not find AppetiteSection")
