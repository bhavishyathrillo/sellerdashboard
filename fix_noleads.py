import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

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
    text = text.replace("export default function AdminLTAPage", modal_comp + "\nexport default function AdminLTAPage")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
