import styles from '../L1SellerViewPage.module.css';
import React from 'react';


export default function HourlyViewModal(props: any) {
  const { setShowHourlyView, styles, globalFinalLta, HOUR_SLOTS, hourlyMap } = props;

  // Render logic extracted from L1SellerViewPage
  let cumLeads = 0;
            const hourRows = HOUR_SLOTS.map(hour => {
              const count = hourlyMap[hour] || 0;
              cumLeads += count;
              const cumPct = globalFinalLta > 0 ? Math.min(100, Math.round((cumLeads / globalFinalLta) * 100)) : 0;
              return { hour, count, cumLeads, cumPct };
            });
            const maxCount = Math.max(...hourRows.map(r => r.count), 1);
            return (
              <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.58rem', color: '#4A4642', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Hourly breakdown · {globalFinalLta > 0 ? `Target = ${globalFinalLta} leads` : 'Target not set'}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', marginBottom: '4px' }}>
                  {hourRows.map(({ hour, count, cumLeads: cum, cumPct }) => {
                    const barColor = count > 0 ? '#F4631E' : 'rgba(255,255,255,0.06)';
                    const barH = count > 0 ? Math.max(6, Math.round((count / maxCount) * 52)) : 3;
                    return (
                      <div key={hour} className={styles.tooltipContainer} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', display: 'flex', height: '60px', position: 'relative' }}>
                        <div style={{ width: '100%', background: barColor, height: `${barH}px`, borderRadius: '3px 3px 0 0', transition: 'height 0.4s ease', position: 'relative' }}>
                          {count > 0 && barH >= 12 && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.5rem', fontWeight: 800, color: '#fff' }}>{count}</div>
                          )}
                        </div>
                        <div className={styles.tooltip}>
                          <div className={styles.tooltipTime}>{hour}</div>
                          <div className={styles.tooltipText}>{count} lead{count !== 1 ? 's' : ''}</div>
                          <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: '2px' }}>Running: {cum} ({cumPct}%{globalFinalLta > 0 ? ` of ${globalFinalLta}` : ''})</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {HOUR_SLOTS.map(h => {
                    const num = parseInt(h.replace(/[AP]M/, ''), 10);
                    const nextNum = num === 12 ? 1 : num + 1;
                    return (
                      <div key={h} style={{ flex: 1, fontSize: '0.42rem', color: '#4A4642', textAlign: 'center', overflow: 'hidden', lineHeight: 1.3 }}>
                        {num}–{nextNum}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
}
