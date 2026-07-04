import React from 'react'
import styles from './L1SellerViewPage.module.css'
import sellerStyles from './SellerViewPage.module.css'

const HOUR_SLOTS = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM']

function extractTimeParts(raw: string | null): { h: number; m: number } | null {
  if (!raw) return null
  const m = raw.match(/(\d{1,2}):(\d{2})/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (raw.toLowerCase().includes('pm') && h < 12) h += 12
  if (raw.toLowerCase().includes('am') && h === 12) h = 0
  return { h, m: min }
}

function formatTime(raw: string | null): string {
  if (!raw) return '—'
  const parts = extractTimeParts(raw)
  if (!parts) return '—'
  let { h, m } = parts
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function parseBreaks(breakTimestamps: string | null): { totalMinutes: number, windows: { startH: number, startM: number, endH: number, endM: number }[] } {
  if (!breakTimestamps) return { totalMinutes: 0, windows: [] }
  const breaks = breakTimestamps.split('|').map(b => b.trim()).filter(Boolean)
  let totalMinutes = 0
  const windows: any[] = []
  breaks.forEach(b => {
    const parts = b.split('-')
    if (parts.length === 2) {
      const s = extractTimeParts(parts[0])
      const e = extractTimeParts(parts[1])
      if (s && e) {
        let sm = s.h * 60 + s.m
        let em = e.h * 60 + e.m
        if (em < sm) em += 24 * 60
        totalMinutes += (em - sm)
        windows.push({ startH: s.h, startM: s.m, endH: e.h, endM: e.m })
      }
    }
  })
  return { totalMinutes, windows }
}

function parseReadyWindows(readyTimestamps: string | null): { startH: number, startM: number, endH: number, endM: number }[] {
  if (!readyTimestamps) return []
  const blocks = readyTimestamps.split('|').map(b => b.trim()).filter(Boolean)
  const windows: any[] = []
  blocks.forEach(b => {
    const parts = b.split('-')
    if (parts.length === 2) {
      const s = extractTimeParts(parts[0])
      const e = extractTimeParts(parts[1])
      if (s && e) {
        windows.push({ startH: s.h, startM: s.m, endH: e.h, endM: e.m })
      }
    }
  })
  return windows
}

export default function SellerTimelineModal({
  drillSellerTimeline,
  setDrillSellerTimeline,
  activeTileTimeline,
  setActiveTileTimeline,
  activeBlockTimeline,
  setActiveBlockTimeline
}: any) {
  if (!drillSellerTimeline || activeTileTimeline || activeBlockTimeline) return null;
  
  return (
    <div className={sellerStyles.modalOverlay} onClick={() => setDrillSellerTimeline(null)}>
      <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()} style={{ minWidth: '700px', maxWidth: '800px', padding: 0 }}>
        <button className={sellerStyles.modalClose} onClick={() => setDrillSellerTimeline(null)}>✕</button>
        <div style={{ padding: '24px 24px 16px', background: '#111', borderRadius: '16px 16px 0 0' }}>
          <div className={sellerStyles.modalHeader} style={{ marginBottom: '8px' }}>
            <span className={sellerStyles.modalDot} style={{ background: '#F4631E' }} />
            <span className={sellerStyles.modalTitle}>{drillSellerTimeline.seller_name} — Login & Availability</span>
          </div>
          <div style={{ color: '#8A8278', fontSize: '0.8rem', marginBottom: '16px' }}>Click on a metric to view exact timeline details.</div>
          <div className={styles.kpiRow} style={{ margin: 0, padding: 0 }}>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('keka')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Keka Login</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.attendance?.first_login)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('orbit')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Orbit Login</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.orbit?.first_login)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('ozontell')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>Ozontell Ready</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.cti?.logged_in_at)}</span>
            </div>
            <div className={styles.kpiItem} style={{ cursor: 'pointer', transition: 'background 0.2s', border: '1px solid transparent', flex: 1 }} onClick={() => setActiveTileTimeline('first')} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span className={styles.kpiLabel}>First Lead</span>
              <span className={styles.kpiValue}>{formatTime(drillSellerTimeline.allotment?.first_lead_allotted_at_ist)}</span>
            </div>
            <div className={styles.kpiItem} style={{ flex: 1 }}>
              <span className={styles.kpiLabel}>Total Break</span>
              <span className={styles.kpiValue}>{parseBreaks(drillSellerTimeline.attendance?.break_timestamps).totalMinutes}m</span>
            </div>
          </div>
        </div>

        <div className={sellerStyles.timelineSection}>
          <div className={sellerStyles.timelineHeader}>
            <div className={sellerStyles.timelineTitle}>Today's lead timeline</div>
            <div className={sellerStyles.timelineSub}>9 AM – 9 PM · hover for details</div>
          </div>
          <div className={sellerStyles.timelineContainer}>
            {(() => {
              const timelineStartMin = 9 * 60;
              const timelineEndMin = 21 * 60;
              const formatMarkerTime = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                let h12 = h % 12;
                if (h12 === 0) h12 = 12;
                return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
              };

              const renderMarker = (minOfDay: number | null, color: string, label: string, isTriangle: boolean) => {
                if (minOfDay === null) return null;
                let percent = ((minOfDay - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100;
                if (percent < 0) percent = 0;
                if (percent > 100) percent = 100;

                const paddingBottom = isTriangle ? '0' : '8px';

                return (
                  <div key={label} className="timeline-marker-group" style={{
                    position: 'absolute', left: `${percent}%`, bottom: '100%', transform: 'translateX(-50%)',
                    zIndex: 20, pointerEvents: 'auto', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    paddingBottom
                  }}>
                    <div style={{ fontSize: '9px', color: '#fff', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', backgroundColor: color, padding: '2px 4px', borderRadius: '3px', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', minWidth: '40px', textAlign: 'center' }}>
                      <span className="timeline-marker-label">{label}</span>
                      <span className="timeline-marker-time" style={{ display: 'none' }}>{formatMarkerTime(minOfDay)}</span>
                    </div>
                    {isTriangle ? (
                      <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${color}` }} />
                    ) : (
                      <div style={{ width: '2px', height: isTriangle ? '6px' : '28px', background: color, borderRadius: '1px' }} />
                    )}
                  </div>
                )
              }

              const kekaTime = drillSellerTimeline.attendance?.first_login;
              const orbitTime = (drillSellerTimeline as any)?.orbit?.first_login || null;
              const lastLogout = drillSellerTimeline.attendance?.last_logout;
              const finalLtaVal = drillSellerTimeline.daily_lta?.final_lta || 0;

              const firstLoginMin = kekaTime ? (extractTimeParts(kekaTime)?.h || 0) * 60 + (extractTimeParts(kekaTime)?.m || 0) : null;
              const lastLogoutMin = lastLogout ? (extractTimeParts(lastLogout)?.h || 0) * 60 + (extractTimeParts(lastLogout)?.m || 0) : null;

              let runningLeads = 0;
              let time50: number | null = null;
              let time100: number | null = null;
              const target50 = finalLtaVal / 2;
              const target100 = finalLtaVal;

              const hourlyData = drillSellerTimeline.hourly || [];
              const hourlyMapTemp: Record<string, number> = {};
              hourlyData.forEach((h: any) => {
                let bucket: string = (h.hour_bucket?.toString()?.toUpperCase() || '');
                if (bucket.includes(':')) {
                  const parts = extractTimeParts(bucket);
                  if (parts) {
                    const ampm = parts.h >= 12 ? 'PM' : 'AM';
                    let h12 = parts.h % 12;
                    if (h12 === 0) h12 = 12;
                    bucket = `${h12}${ampm}`;
                  }
                } else {
                  const match = bucket.match(/^(\d+)/);
                  if (match) {
                    const hr = parseInt(match[1], 10);
                    const ampm = hr >= 12 ? 'PM' : 'AM';
                    let h12 = hr % 12;
                    if (h12 === 0) h12 = 12;
                    bucket = `${h12}${ampm}`;
                  } else {
                    bucket = bucket.replace(/\s+/g, '');
                  }
                }
                const numLeads = Number(h.leads_allotted_in_bucket) || 0;
                hourlyMapTemp[bucket] = (hourlyMapTemp[bucket] || 0) + numLeads;
              });

              for (const hour of HOUR_SLOTS) {
                if (time50 && time100) break;
                runningLeads += (hourlyMapTemp[hour] || 0);

                let isAm = hour.includes('AM');
                let hStr = hour.replace(/[A-Z]/g, '');
                let h = parseInt(hStr, 10);
                if (isAm && h === 12) h = 0;
                if (!isAm && h !== 12) h += 12;
                const minOfDay = h * 60 + 30; // center of the bucket

                if (finalLtaVal > 0) {
                  if (runningLeads >= target50 && time50 === null) time50 = minOfDay;
                  if (runningLeads >= target100 && time100 === null) {
                    time100 = minOfDay;
                    if (time100 === time50) time100 += 20;
                  }
                }
              }

              return (
                <>
                  <style>{`
                        .timeline-marker-group:hover .timeline-marker-label { display: none !important; }
                        .timeline-marker-group:hover .timeline-marker-time { display: inline !important; }
                      `}</style>
                  {renderMarker(firstLoginMin, '#3B82F6', 'Login', true)}
                  {renderMarker(lastLogoutMin, '#EF4444', 'Logout', true)}
                  {renderMarker(time50, '#EAB308', '50% Appetite', false)}
                  {renderMarker(time100, '#22C55E', '100% Appetite', false)}
                </>
              )
            })()}
            <div className={sellerStyles.timelineBlocksRow}>
              {(() => {
                const timelineStartMin = 9 * 60;
                const timelineEndMin = 21 * 60;
                const boundaries = new Set<number>();
                for (let m = timelineStartMin; m <= timelineEndMin; m += 60) boundaries.add(m);

                const orbitTime = (drillSellerTimeline as any)?.orbit?.first_login || null;
                const breaks = parseBreaks(drillSellerTimeline.attendance?.break_timestamps);
                const readyWindows = parseReadyWindows(drillSellerTimeline.cti?.logged_in_at ? `${drillSellerTimeline.cti.logged_in_at}-${drillSellerTimeline.attendance?.last_logout || new Date().toISOString()}` : null);
                const actualReadyWindows = parseReadyWindows(drillSellerTimeline.cti?.ready_timestamps);
                const finalReadyWindows = drillSellerTimeline.cti?.ready_timestamps ? actualReadyWindows : readyWindows;

                breaks.windows.forEach(w => {
                  const s = w.startH * 60 + w.startM;
                  const e = w.endH * 60 + w.endM;
                  if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s);
                  if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e);
                });
                finalReadyWindows.forEach(w => {
                  const s = w.startH * 60 + w.startM;
                  const e = w.endH * 60 + w.endM;
                  if (s >= timelineStartMin && s <= timelineEndMin) boundaries.add(s);
                  if (e >= timelineStartMin && e <= timelineEndMin) boundaries.add(e);
                });

                const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
                const segments: { start: number, end: number, hourBucket: string, widthPercent: number }[] = [];

                for (let i = 0; i < sortedBoundaries.length - 1; i++) {
                  const start = sortedBoundaries[i];
                  const end = sortedBoundaries[i + 1];
                  if (start === end) continue;

                  const hour24 = Math.floor(start / 60);
                  let ampm = hour24 >= 12 ? 'PM' : 'AM';
                  let h12 = hour24 % 12;
                  if (h12 === 0) h12 = 12;

                  segments.push({
                    start, end, hourBucket: `${h12}${ampm}`,
                    widthPercent: ((end - start) / (timelineEndMin - timelineStartMin)) * 100
                  });
                }

                const hourlyData = drillSellerTimeline.hourly || [];
                const hourlyMap: Record<string, number> = {};
                hourlyData.forEach((h: any) => {
                  let bucket: string = (h.hour_bucket?.toString()?.toUpperCase() || '');
                  if (bucket.includes(':')) {
                    const parts = extractTimeParts(bucket);
                    if (parts) {
                      const ampm = parts.h >= 12 ? 'PM' : 'AM';
                      let h12 = parts.h % 12;
                      if (h12 === 0) h12 = 12;
                      bucket = `${h12}${ampm}`;
                    }
                  } else {
                    const match = bucket.match(/^(\d+)/);
                    if (match) {
                      const hr = parseInt(match[1], 10);
                      const ampm = hr >= 12 ? 'PM' : 'AM';
                      let h12 = hr % 12;
                      if (h12 === 0) h12 = 12;
                      bucket = `${h12}${ampm}`;
                    } else {
                      bucket = bucket.replace(/\s+/g, '');
                    }
                  }
                  const numLeads = Number(h.leads_allotted_in_bucket) || 0;
                  hourlyMap[bucket] = (hourlyMap[bucket] || 0) + numLeads;
                });
                const availableLeads = { ...hourlyMap };

                const formatMinTime = (mins: number) => {
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  let h12 = h % 12;
                  if (h12 === 0) h12 = 12;
                  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
                };

                const mappedSegments = segments.map((seg, idx) => {
                  const midPoint = seg.start + (seg.end - seg.start) / 2;

                  const overlappingBreak = breaks.windows.find(w => {
                    const s = w.startH * 60 + w.startM;
                    const e = w.endH * 60 + w.endM;
                    return midPoint >= s && midPoint < e;
                  });
                  const isBreak = !!overlappingBreak;

                  const isReady = finalReadyWindows.some(w => {
                    const s = w.startH * 60 + w.startM;
                    const e = w.endH * 60 + w.endM;
                    return midPoint >= s && midPoint < e;
                  });

                  const isOrbitOnly = !!orbitTime && isBreak && isReady;
                  const eligible = (!isBreak && isReady) || isOrbitOnly;
                  let blockClass = sellerStyles.blockNotEligible;
                  let leads = 0;

                  if (eligible && availableLeads[seg.hourBucket] > 0) {
                    leads = availableLeads[seg.hourBucket];
                    availableLeads[seg.hourBucket] = 0;
                  }

                  const isLastSegmentOfHour = (idx === segments.length - 1) || (segments[idx + 1].hourBucket !== seg.hourBucket);
                  if (isLastSegmentOfHour && availableLeads[seg.hourBucket] > 0) {
                    leads = availableLeads[seg.hourBucket];
                    availableLeads[seg.hourBucket] = 0;
                  }

                  let hoverText = '';
                  let timePrefix = '';
                  if (leads > 0) {
                    if (eligible) {
                      blockClass = sellerStyles.blockLeadReceived;
                      hoverText = `${leads} lead(s) landed`;
                    } else {
                      blockClass = sellerStyles.blockManualLead;
                      hoverText = `${leads} lead(s) landed`;
                      timePrefix = isBreak ? 'On break · ' : 'Not ready on Ozontell · ';
                    }
                  } else if (isBreak) {
                    blockClass = sellerStyles.blockBreak;
                    hoverText = 'Not eligible';
                    timePrefix = 'On break · ';
                  } else if (isReady) {
                    blockClass = sellerStyles.blockEligibleNoLead;
                    hoverText = 'Eligible, no lead';
                  } else {
                    blockClass = sellerStyles.blockNotEligible;
                    hoverText = 'Not eligible';
                    timePrefix = 'Not ready on Ozontell · ';
                  }

                  let isLateAllocation = false;

                  return { ...seg, blockClass, hoverText, timePrefix, leads, eligible, isBreak, isReady, isLateAllocation };
                });

                const mergedSegments: typeof mappedSegments = [];
                let current = mappedSegments[0];
                for (let i = 1; i < mappedSegments.length; i++) {
                  const next = mappedSegments[i];
                  if (
                    current.blockClass === next.blockClass &&
                    current.hoverText === next.hoverText &&
                    current.timePrefix === next.timePrefix &&
                    current.leads === 0 && next.leads === 0
                  ) {
                    current.end = next.end;
                    current.widthPercent += next.widthPercent;
                  } else {
                    mergedSegments.push(current);
                    current = next;
                  }
                }
                if (current) mergedSegments.push(current);

                return mergedSegments.map((seg, idx) => {
                  const midPoint = seg.start + (seg.end - seg.start) / 2;
                  const percent = ((midPoint - timelineStartMin) / (timelineEndMin - timelineStartMin)) * 100;
                  const ttVars = percent < 15
                    ? { '--tt-left': '0', '--tt-right': 'auto', '--tt-tx': '0' }
                    : percent > 85
                      ? { '--tt-left': 'auto', '--tt-right': '0', '--tt-tx': '0' }
                      : { '--tt-left': '50%', '--tt-right': 'auto', '--tt-tx': '-50%' };
                  return (
                    <div key={idx} className={sellerStyles.tooltipContainer} style={{ flex: seg.widthPercent }}>
                      <button
                        className={[sellerStyles.timelineBlock, seg.blockClass].join(' ')}
                        style={{ width: '100%' }}
                        onClick={() => setActiveBlockTimeline({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: seg.isLateAllocation, isReady: seg.isReady })}
                      >
                        {seg.widthPercent >= 3 ? (
                          seg.leads > 0 ? (
                            <>
                              <span className={sellerStyles.blockLeadCount}>{seg.leads}</span>
                              {seg.isBreak && !seg.eligible && <span className={sellerStyles.blockBreakText}>BREAK</span>}
                            </>
                          ) : (
                            seg.isBreak && seg.widthPercent >= 6 ? <span className={sellerStyles.blockBreakText} style={{ marginTop: 0 }}>BREAK</span> : null
                          )
                        ) : null}
                      </button>
                      <div className={sellerStyles.tooltip} style={ttVars as any}>
                        <div className={sellerStyles.tooltipTime}>{seg.timePrefix}{formatMinTime(seg.start)} – {formatMinTime(seg.end)}</div>
                        <div className={sellerStyles.tooltipText}>{seg.hoverText}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className={sellerStyles.timelineLabelsRow} style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
              {HOUR_SLOTS.map((hour, idx) => (
                <div
                  key={hour}
                  className={sellerStyles.timelineLabel}
                  style={{
                    position: 'absolute',
                    left: `${(idx / (HOUR_SLOTS.length - 1)) * 100}%`,
                    transform: 'translateX(-50%)',
                    paddingLeft: 0,
                    textAlign: 'center'
                  }}
                >
                  {hour === '9AM' || hour === '12PM' || hour === '1PM' || hour === '5PM' || hour === '8PM' || hour === '9PM' ? hour : hour.replace('AM', '').replace('PM', '')}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}