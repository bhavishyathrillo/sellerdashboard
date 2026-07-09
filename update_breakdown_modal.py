import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# First, let's fix the `activeCard` state to allow expanding Category Managers too.
# Find: const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)
# Add: const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)
if 'const [expandedCatKey, setExpandedCatKey]' not in text:
    text = text.replace(
        "const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)",
        "const [expandedCatKey, setExpandedCatKey] = useState<string | null>(null)\n  const [expandedTlKey, setExpandedTlKey] = useState<string | null>(null)"
    )

# Fix the onClose to reset expandedCatKey as well
text = text.replace("setExpandedTlKey(null) }}>✕</button>", "setExpandedCatKey(null); setExpandedTlKey(null) }}>✕</button>")
text = text.replace("setActiveCard(null); setExpandedTlKey(null)", "setActiveCard(null); setExpandedCatKey(null); setExpandedTlKey(null)")
text = text.replace("setActiveCard(activeCard === 'ca' ? null : 'ca'); setExpandedTlKey(null)", "setActiveCard(activeCard === 'ca' ? null : 'ca'); setExpandedCatKey(null); setExpandedTlKey(null)")

# Replace the table header "Team (TL)" with "Category Manager"
text = text.replace("<th>Team (TL)</th>", "<th>Team</th>")

old_tbody_start = """                <tbody>
                  {flatTls.map(tl => {"""

# We need to replace from old_tbody_start to the end of the tbody.
# Let's extract the entire tbody block using regex.
tbody_match = re.search(r'<tbody>\s*\{flatTls\.map\(tl => \{.*?\)\s*\}\)\s*\}\s*</tbody>', text, re.DOTALL)
if tbody_match:
    old_tbody = tbody_match.group(0)

    new_tbody = """                <tbody>
                  {hierarchy.map(cat => {
                    const catKey = cat.category_name
                    const catSellers = cat.tls.flatMap((t: any) => t.sellers)
                    
                    const getCatDot = (key: string) => { let v = 0; Object.entries(catSellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (k.endsWith('-' + key)) v += val }); return v }
                    const getCatFuture = () => { let v = 0; Object.entries(catSellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) v += val }); return v }
                    
                    return (
                      <React.Fragment key={catKey}>
                        <tr className="la-cat-row" onClick={() => setExpandedCatKey(expandedCatKey === catKey ? null : catKey)} style={{ cursor: 'pointer', background: expandedCatKey === catKey ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                          <td style={{ fontWeight: 600, color: '#F0EDE8' }}>{catKey}</td>
                          {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <td key={mo.key}>{getCatDot(mo.key)}</td>)}<td>{getCatFuture()}</td></>)
                            : activeCard === 'allotment' ? (<><td>{sumField(catSellers, 'auto_allotted')}</td><td>{sumField(catSellers, 'manual_allotted')}</td><td>{sumField(catSellers, 'rtg_leads')}</td><td>{sumField(catSellers, 'non_rtg_leads')}</td></>)
                            : activeCard === 'ca' ? (() => {
                                const cAllotted = sumField(catSellers, 'total_leads_allotted')
                                const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.ltaActual || 0), 0)
                                const cFulf = cAppetite > 0 ? Math.round((cAllotted / cAppetite) * 100) : 0
                                const cCaRows = catSellers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                const cSumCta = cCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                const cSumLeads = cCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
                                const cAvgCa = cSumLeads > 0 ? Math.round(cSumCta / cSumLeads) : null
                                return (<><td>{cAllotted}</td><td>{cAppetite}</td><td style={{ color: cFulf >= 90 ? '#22C55E' : cFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{cFulf}%</td><td>{cAvgCa != null ? `${cAvgCa}m` : '—'}</td></>)
                              })()
                            : (<><td>{sumField(catSellers, 'pax_1')}</td><td>{sumField(catSellers, 'pax_2')}</td><td>{sumField(catSellers, 'pax_3')}</td><td>{sumField(catSellers, 'pax_4')}</td><td>{sumField(catSellers, 'pax_4_plus')}</td></>)}
                        </tr>
                        {expandedCatKey === catKey && cat.tls.map((tl: any) => {
                          const tlKey = `${catKey}-${tl.tl_name}`
                          const getTlDot = (key: string) => { let v = 0; Object.entries(tl.sellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (k.endsWith('-' + key)) v += val }); return v }
                          const getTlFuture = () => { let v = 0; Object.entries(tl.sellers.reduce((acc: Record<string, number>, m: any) => { (m.dot_rows || []).forEach((d: any) => { acc[d.dot_month] = (acc[d.dot_month] || 0) + (d.total_leads_allotted || 0) }); return acc }, {})).forEach(([k, val]: [string, any]) => { if (!dotMonthsConfig.some(mo => k.endsWith('-' + mo.key))) v += val }); return v }
                          
                          return (
                            <React.Fragment key={tlKey}>
                              <tr className="la-tl-row" onClick={() => setExpandedTlKey(expandedTlKey === tlKey ? null : tlKey)} style={{ cursor: 'pointer' }}>
                                <td style={{ paddingLeft: '28px', color: '#D4D4D8' }}>↳ {tl.tl_name}</td>
                                {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => <td key={mo.key}>{getTlDot(mo.key)}</td>)}<td>{getTlFuture()}</td></>)
                                  : activeCard === 'allotment' ? (<><td>{sumField(tl.sellers, 'auto_allotted')}</td><td>{sumField(tl.sellers, 'manual_allotted')}</td><td>{sumField(tl.sellers, 'rtg_leads')}</td><td>{sumField(tl.sellers, 'non_rtg_leads')}</td></>)
                                  : activeCard === 'ca' ? (() => {
                                      const tAllotted = sumField(tl.sellers, 'total_leads_allotted')
                                      const tAppetite = tl.sellers.reduce((s: number, m: any) => s + (m.ltaActual || 0), 0)
                                      const tFulf = tAppetite > 0 ? Math.round((tAllotted / tAppetite) * 100) : 0
                                      const tCaRows = tl.sellers.flatMap((m: any) => m.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                      const tSumCta = tCaRows.reduce((s: number, r: any) => s + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                      const tSumLeads = tCaRows.reduce((s: number, r: any) => s + r.total_leads_allotted, 0)
                                      const tAvgCa = tSumLeads > 0 ? Math.round(tSumCta / tSumLeads) : null
                                      return (<><td>{tAllotted}</td><td>{tAppetite}</td><td style={{ color: tFulf >= 90 ? '#22C55E' : tFulf >= 70 ? '#F59E0B' : '#EF4444' }}>{tFulf}%</td><td>{tAvgCa != null ? `${tAvgCa}m` : '—'}</td></>)
                                    })()
                                  : (<><td>{sumField(tl.sellers, 'pax_1')}</td><td>{sumField(tl.sellers, 'pax_2')}</td><td>{sumField(tl.sellers, 'pax_3')}</td><td>{sumField(tl.sellers, 'pax_4')}</td><td>{sumField(tl.sellers, 'pax_4_plus')}</td></>)}
                              </tr>
                              {expandedTlKey === tlKey && tl.sellers.map((s: any) => {
                                const getSellerFuture = () => { let v = 0; (s.dot_rows || []).forEach((d: any) => { if (!dotMonthsConfig.some(mo => d.dot_month.endsWith('-' + mo.key))) v += d.total_leads_allotted || 0 }); return v }
                                return (
                                  <tr key={s.seller_email} className="la-seller-row" onClick={() => onSellerClick(s)} style={{ cursor: 'pointer' }}>
                                    <td style={{ paddingLeft: '48px', color: '#A1A1AA' }}>{s.seller_name}{s.isAbsent && <span className="la-flag la-flag-absent" style={{ marginLeft: '6px' }}>Absent</span>}</td>
                                    {activeCard === 'dot' ? (<>{dotMonthsConfig.map(mo => { let v = 0; (s.dot_rows || []).forEach((d: any) => { if (d.dot_month.endsWith('-' + mo.key)) v += d.total_leads_allotted || 0 }); return <td key={mo.key}>{s.isAbsent ? '—' : v}</td> })}<td>{s.isAbsent ? '—' : getSellerFuture()}</td></>)
                                      : activeCard === 'allotment' ? (<><td>{s.isAbsent ? '—' : sumField([s], 'auto_allotted')}</td><td>{s.isAbsent ? '—' : sumField([s], 'manual_allotted')}</td><td>{s.isAbsent ? '—' : sumField([s], 'rtg_leads')}</td><td>{s.isAbsent ? '—' : sumField([s], 'non_rtg_leads')}</td></>)
                                      : activeCard === 'ca' ? (() => {
                                          const sAllotted = sumField([s], 'total_leads_allotted')
                                          const sAppetite = s.ltaActual || 0
                                          const sFulf = sAppetite > 0 ? Math.round((sAllotted / sAppetite) * 100) : 0
                                          const sCaRows = (s.monthly_rows || []).filter((r: any) => r.total_leads_allotted > 0 && r.median_creation_to_allotment_mins != null)
                                          const sSumCta = sCaRows.reduce((s2: number, r: any) => s2 + (r.median_creation_to_allotment_mins * r.total_leads_allotted), 0)
                                          const sSumLeads = sCaRows.reduce((s2: number, r: any) => s2 + r.total_leads_allotted, 0)
                                          const sAvgCa = sSumLeads > 0 ? Math.round(sSumCta / sSumLeads) : null
                                          return (<><td>{s.isAbsent ? '—' : sAllotted}</td><td>{s.isAbsent ? '—' : sAppetite}</td><td>{s.isAbsent ? '—' : `${sFulf}%`}</td><td>{s.isAbsent ? '—' : (sAvgCa != null ? `${sAvgCa}m` : '—')}</td></>)
                                        })()
                                      : (<><td>{s.isAbsent ? '—' : sumField([s], 'pax_1')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_2')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_3')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_4')}</td><td>{s.isAbsent ? '—' : sumField([s], 'pax_4_plus')}</td></>)}
                                  </tr>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>"""

    text = text.replace(old_tbody, new_tbody)
else:
    print("WARNING: Could not match tbody!")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
