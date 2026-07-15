import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

calc_logic = """  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        return s3 + (seller.ltaActual || 0)
      }, 0)
    , 0)
  , 0)

  let orgTotalAuto = 0
  let orgTotalManual = 0
  let orgTotalRtg = 0
  let orgTotalNonRtg = 0

  hierarchy.forEach((cat: any) => {
    (cat.tls || []).forEach((tl: any) => {
      (tl.sellers || []).forEach((seller: any) => {
        orgTotalAuto += seller.autoAllotted || 0
        orgTotalManual += seller.manualAllotted || 0
        orgTotalRtg += seller.rtgLeads || 0
        orgTotalNonRtg += seller.nonRtgLeads || 0
      })
    })
  })

  const computedOrgMhe ="""

text = text.replace("""  const sumFinalLta = hierarchy.reduce((s: number, cat: any) =>
    s + (cat.tls || []).reduce((s2: number, tl: any) =>
      s2 + (tl.sellers || []).reduce((s3: number, seller: any) => {
        return s3 + (seller.ltaActual || 0)
      }, 0)
    , 0)
  , 0)

  const computedOrgMhe =""", calc_logic)

kpi_rtg_old = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Org RTG %</div>
            <div className="la-kpi-value" style={{ color: '#F4631E' }}>{org.rtgPct}%</div>
            
          </div>"""

kpi_rtg_new = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Org RTG %</div>
            <div className="la-kpi-value" style={{ color: '#F4631E' }}>{org.rtgPct}%</div>
            <div className="la-kpi-sub">RTG: {orgTotalRtg} · Non-RTG: {orgTotalNonRtg}</div>
          </div>"""

text = text.replace(kpi_rtg_old, kpi_rtg_new)

kpi_auto_old = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Auto allotment %</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.autoAllotPct}%</div>
            
          </div>"""

# Wait, `Auto allotment %` does not have an empty sub string anymore, because I removed it previously!
# Let me just search for the Auto Allotment structure.
kpi_auto_old2 = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Auto allotment %</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.autoAllotPct}%</div>
          </div>"""

kpi_auto_new = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Auto allotment %</div>
            <div className="la-kpi-value" style={{ color: '#F0EDE8' }}>{org.autoAllotPct}%</div>
            <div className="la-kpi-sub">Auto: {orgTotalAuto} · Manual: {orgTotalManual}</div>
          </div>"""

text = text.replace(kpi_auto_old2, kpi_auto_new)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
