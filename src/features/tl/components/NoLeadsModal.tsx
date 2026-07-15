import React from 'react';


export default function NoLeadsModal(props: any) {
  const { setShowNoLeadsModal, processedGroups, globalNoLeads, session } = props;

  // Render logic extracted from L1SellerViewPage
  const noLeadsSellers: any[] = [];
          processedGroups.forEach((g: any) => {
            g.members.forEach((m: any) => {
              if (((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0) {
                noLeadsSellers.push({ ...m, tlName: g.l2_name });
              }
            });
          });
          return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNoLeadsModal(false)}>
              <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '16px 20px', width: '700px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => setShowNoLeadsModal(false)}
                  style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#8A8278', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                >×</button>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4631E' }} />
                  Sellers with no leads yet
                </h3>
                <p style={{ color: '#F4631E', margin: '4px 0 16px', fontSize: '0.9rem' }}>{globalNoLeads} sellers</p>
                <div style={{ flex: 1, overflowY: 'auto', marginTop: '16px', paddingRight: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: '#A1A1AA', borderBottom: '1px solid #333' }}>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Seller Name</th>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>TL Name</th>
                        <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noLeadsSellers.slice().sort((a: any, b: any) => {
                        if (a.seller_email === session.email) return -1;
                        if (b.seller_email === session.email) return 1;
                        return a.seller_name.localeCompare(b.seller_name);
                      }).map((s: any) => (
                        <tr key={s.seller_email} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#E5E7EB' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 500 }}>{s.seller_name}</td>
                          <td style={{ padding: '12px 8px', color: '#A1A1AA' }}>{s.tlName}</td>
                          <td style={{ padding: '12px 8px' }}>
                            {(() => {
                              if (s.isAbsent) {
                                return <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Absent</span>;
                              }
                              const isOrbitReady = !!s.orbit?.first_login;
                              const isOzonetelReady = !!s.cti?.ready_timestamps;
                              
                              if (isOrbitReady && isOzonetelReady) {
                                return <span style={{ color: '#EAB308', fontSize: '0.8rem' }}>0 Leads</span>;
                              }
                              if (!isOrbitReady && !isOzonetelReady) {
                                return <span style={{ color: '#EAB308', fontSize: '0.8rem' }}>Not ready on Ozonetel and not logged in on Orbit</span>;
                              }
                              if (!isOrbitReady) {
                                return <span style={{ color: '#EAB308', fontSize: '0.8rem' }}>Not logged in on Orbit</span>;
                              }
                              if (!isOzonetelReady) {
                                return <span style={{ color: '#EAB308', fontSize: '0.8rem' }}>Not ready on Ozonetel</span>;
                              }
                              return null;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
}
