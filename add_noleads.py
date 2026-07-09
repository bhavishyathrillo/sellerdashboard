import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

insert_logic = """  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)
"""

if "showNoLeadsModal" not in text:
    text = text.replace("  const [showGoalShbModal, setShowGoalShbModal] = useState(false)", "  const [showGoalShbModal, setShowGoalShbModal] = useState(false)\n  const [showNoLeadsModal, setShowNoLeadsModal] = useState(false)")

noleads_calc = """
  const noLeadsSellers = hierarchy.flatMap((cat: any) =>
    (cat.tls || []).flatMap((tl: any) =>
      (tl.sellers || []).filter((s: any) => s.isAbsent || s.ltaPlanned === 0).map((s: any) => ({
        ...s,
        tlName: tl.tl_name,
        catName: cat.category_name,
        status: s.isAbsent ? 'Absent' : '0 Leads'
      }))
    )
  )

  const displayDate = """

text = text.replace("  const displayDate =", noleads_calc)

kpi_old = """          <div className="la-kpi-card">
            <div className="la-kpi-label">Sellers at risk</div>
            <div className="la-kpi-value" style={{ color: '#EF4444' }}>{org.sellersAtRisk}</div>
            <div className="la-kpi-sub">Goal &lt;70% across org</div>
          </div>"""

kpi_new = """          <div className="la-kpi-card clickable" onClick={() => setShowNoLeadsModal(true)}>
            <div className="la-kpi-label">Sellers without leads</div>
            <div className="la-kpi-value" style={{ color: '#EF4444' }}>{noLeadsSellers.length}</div>
            <div className="la-kpi-sub">Absent / 0 Leads across org</div>
          </div>"""

text = text.replace(kpi_old, kpi_new)

modal_comp = """
function NoLeadsModal({ sellers, onClose }: { sellers: any[], onClose: () => void }) {
  // Group by TL
  const grouped: Record<string, any[]> = {}
  sellers.forEach(s => {
    if (!grouped[s.tlName]) grouped[s.tlName] = []
    grouped[s.tlName].push(s)
  })

  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '450px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Sellers without leads</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>TEAM (TL) / SELLER</span>
            <span>STATUS</span>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {Object.keys(grouped).map(tlName => (
              <div key={tlName} style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                  {tlName}
                </div>
                {grouped[tlName].map((s: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 10px 32px', borderTop: '1px solid #262626', fontSize: '0.85rem' }}>
                    <span style={{ color: '#F0EDE8' }}>{s.seller_name}</span>
                    <span style={{ color: '#EF4444' }}>{s.status}</span>
                  </div>
                ))}
              </div>
            ))}
            {sellers.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No sellers without leads!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
"""

if "function NoLeadsModal" not in text:
    text = text.replace("/* ─── Main Page ─── */", modal_comp + "\n/* ─── Main Page ─── */")

if "showNoLeadsModal &&" not in text:
    text = text.replace("{showGoalShbModal && (", "{showNoLeadsModal && <NoLeadsModal sellers={noLeadsSellers} onClose={() => setShowNoLeadsModal(false)} />}\n        {showGoalShbModal && (")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
