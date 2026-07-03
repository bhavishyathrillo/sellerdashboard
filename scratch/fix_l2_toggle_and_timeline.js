const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'components', 'pages', 'L2SellerViewPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Normalize CRLF so JS strings match
const normalized = content.replace(/\r\n/g, '\n');

// ── Fix 1: Toggle position in personal view ──────────────────────────────────
const OLD_PERSONAL = `  if (viewMode === 'personal') {
    return (
      <div className={styles.page} style={{ paddingTop: '16px', paddingBottom: 0 }}>
        {members.length > 1 && (
          <div className={styles.toggleContainer} style={{ marginLeft: '16px', marginTop: '8px', width: 'fit-content' }}>
            <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
            <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
          </div>
        )}
        {/* We reuse the exact SellerViewPage completely isolated */}
        <div style={{ margin: '-24px' }}>
          <SellerViewPage session={session} />
        </div>
      </div>
    )
  }`;

const NEW_PERSONAL = `  if (viewMode === 'personal') {
    const toggleNode = members.length > 1 ? (
      <div className={styles.toggleContainer}>
        <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'personal' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('personal')}>Personal</button>
        <button className={\`\${styles.toggleBtn} \${(viewMode as string) === 'team' ? styles.toggleBtnActive : ''}\`} onClick={() => setViewMode('team')}>My Team ({members.length})</button>
      </div>
    ) : undefined;
    return <SellerViewPage session={session} headerCenterContent={toggleNode} />
  }`;

let fixed = normalized;
if (fixed.includes(OLD_PERSONAL)) {
  fixed = fixed.replace(OLD_PERSONAL, NEW_PERSONAL);
  console.log('✅ Fix 1: Personal toggle updated to use headerCenterContent');
} else {
  console.log('❌ Fix 1: Could not find personal view block');
}

// ── Fix 2: Timeline tooltip overflow ─────────────────────────────────────────
const OLD_TIMELINE = `                    return mergedSegments.map((seg, idx) => (
                      <div key={idx} className={sellerStyles.tooltipContainer} style={{ flex: seg.widthPercent }}>
                        <button 
                          className={[sellerStyles.timelineBlock, seg.blockClass].join(' ')} 
                          style={{ width: '100%' }}
                          onClick={() => setActiveBlockS1({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: seg.isLateAllocation, isReady: seg.isReady })}
                        >
                          {seg.widthPercent >= 3 ? (
                            seg.leads > 0 ? (
                              <>
                                <span className={sellerStyles.blockLeadCount}>{seg.leads}</span>
                                {seg.isBreak && !seg.eligible && <span className={sellerStyles.blockBreakText}>BREAK</span>}
                              </>
                            ) : (
                              seg.isBreak && seg.widthPercent >= 6 ? <span className={sellerStyles.blockBreakText} style={{marginTop: 0}}>BREAK</span> : null
                            )
                          ) : null}
                        </button>
                        <div className={sellerStyles.tooltip}>
                          <div className={sellerStyles.tooltipTime}>{seg.timePrefix}{formatMinTime(seg.start)} \u2013 {formatMinTime(seg.end)}</div>
                          <div className={sellerStyles.tooltipText}>{seg.hoverText}</div>
                        </div>
                      </div>
                    ));`;

const NEW_TIMELINE = `                    return mergedSegments.map((seg, idx) => {
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
                            onClick={() => setActiveBlockS1({ hour: seg.hourBucket, leads: seg.leads, eligible: seg.eligible, isBreak: seg.isBreak, isLateAllocation: seg.isLateAllocation, isReady: seg.isReady })}
                          >
                            {seg.widthPercent >= 3 ? (
                              seg.leads > 0 ? (
                                <>
                                  <span className={sellerStyles.blockLeadCount}>{seg.leads}</span>
                                  {seg.isBreak && !seg.eligible && <span className={sellerStyles.blockBreakText}>BREAK</span>}
                                </>
                              ) : (
                                seg.isBreak && seg.widthPercent >= 6 ? <span className={sellerStyles.blockBreakText} style={{marginTop: 0}}>BREAK</span> : null
                              )
                            ) : null}
                          </button>
                          <div className={sellerStyles.tooltip} style={ttVars as any}>
                            <div className={sellerStyles.tooltipTime}>{seg.timePrefix}{formatMinTime(seg.start)} \u2013 {formatMinTime(seg.end)}</div>
                            <div className={sellerStyles.tooltipText}>{seg.hoverText}</div>
                          </div>
                        </div>
                      );
                    });`;

if (fixed.includes(OLD_TIMELINE)) {
  fixed = fixed.replace(OLD_TIMELINE, NEW_TIMELINE);
  console.log('✅ Fix 2: Timeline tooltip overflow fixed');
} else {
  console.log('❌ Fix 2: Could not find timeline segment map — trying fuzzy match...');
  // Fuzzy: just find the tooltip line and add style
  const simpleOld = `<div className={sellerStyles.tooltip}>\n                          <div className={sellerStyles.tooltipTime}>{seg.timePrefix}{formatMinTime(seg.start)}`;
  if (fixed.includes(simpleOld)) {
    console.log('   Found via fuzzy — but cannot safely replace without full context');
  } else {
    console.log('   Fuzzy match also failed');
  }
}

// Write back with original line endings
fs.writeFileSync(file, fixed.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done. Line count:', fixed.split('\n').length);
