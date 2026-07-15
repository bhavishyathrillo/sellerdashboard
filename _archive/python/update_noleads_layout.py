import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_modal_comp = """  return (
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
            {Object.keys(grouped).map(groupKey => (
              <div key={groupKey} style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                  {groupKey}
                </div>
                {grouped[groupKey].map((s: any, idx: number) => (
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
  )"""

new_modal_comp = """  return (
    <div className="la-modal-overlay" onClick={onClose}>
      <div className="la-modal-card" onClick={e => e.stopPropagation()} style={{ width: '850px' }}>
        <button className="la-modal-close" onClick={onClose}>✕</button>
        <div className="la-modal-header">
          <span className="la-modal-title">Sellers without leads</span>
        </div>
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '0 8px', marginBottom: '8px', fontSize: '0.65rem', fontWeight: 600, color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>TEAM (TL) / SELLER</span>
              <span>STATUS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>TEAM (TL) / SELLER</span>
              <span>STATUS</span>
            </div>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 8px' }}>
            {sellers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8A8278', fontStyle: 'italic', fontSize: '0.85rem' }}>
                No sellers without leads!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                {Object.keys(grouped).map(groupKey => (
                  <div key={groupKey} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                      {groupKey}
                    </div>
                    {grouped[groupKey].map((s: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px 10px 32px', borderTop: '1px solid #262626', fontSize: '0.85rem' }}>
                        <span style={{ color: '#F0EDE8' }}>{s.seller_name}</span>
                        <span style={{ color: '#EF4444' }}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )"""

text = text.replace(old_modal_comp, new_modal_comp)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
