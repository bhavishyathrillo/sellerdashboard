{activeTileS1 && drillSellerS1 && (() => {
        const kekaTime = drillSellerS1.attendance?.first_login;
        const lastLogout = drillSellerS1.attendance?.last_logout;
        const totalLoginToLogout = kekaTime && lastLogout ? minutesBetween(kekaTime, lastLogout) : null;
        const ozontellReady = drillSellerS1.cti?.logged_in_at;
        const deltaOzontellFromKeka = minutesBetween(kekaTime, ozontellReady);
        const firstLead = drillSellerS1.allotment?.first_lead_allotted_at_ist;
        const deltaKekaToFirst = minutesBetween(kekaTime, firstLead);
        const deltaOzontellToFirst = minutesBetween(ozontellReady, firstLead);
        
        return (
          <div className={sellerStyles.modalOverlay} onClick={() => setActiveTileS1(null)}>
            <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()}>
              <button className={sellerStyles.modalClose} onClick={() => setActiveTileS1(null)}>✕</button>

              {activeTileS1 === 'keka' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#3B82F6' }} /><span className={sellerStyles.modalTitle}>Keka Login</span></div>
                  <p className={sellerStyles.modalInsight}>Logged in at {formatTime(kekaTime)}.</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Login</span><strong>{formatTime(kekaTime)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Logout</span><strong>{formatTime(lastLogout)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Session</span><strong>{totalLoginToLogout ? `${Math.floor(totalLoginToLogout / 60)}h ${totalLoginToLogout % 60}m` : '—'}</strong></div>
                    <div className={sellerStyles.modalStat}><span>To Ozontell</span><strong className={sellerStyles.statGood}>{deltaOzontellFromKeka !== null ? `${deltaOzontellFromKeka}m` : '—'}</strong></div>
                  </div>
                </>
              )}
              {activeTileS1 === 'ozontell' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#33C2C9' }} /><span className={sellerStyles.modalTitle}>Ozontell Ready</span></div>
                  <p className={sellerStyles.modalInsight}>{deltaOzontellFromKeka !== null && deltaOzontellFromKeka <= 5 ? `Ready in ${deltaOzontellFromKeka} min — great!` : `Ready ${deltaOzontellFromKeka ?? '—'} min after Keka.`}</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Ready at</span><strong>{formatTime(ozontellReady)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>After Keka</span><strong className={sellerStyles.statGood}>{deltaOzontellFromKeka}m</strong></div>
                    <div className={sellerStyles.modalStat}><span>To lead</span><strong>{deltaOzontellToFirst !== null ? `${deltaOzontellToFirst}m` : '—'}</strong></div>
                  </div>
                </>
              )}
              {activeTileS1 === 'first' && (
                <>
                  <div className={sellerStyles.modalHeader}><span className={sellerStyles.modalDot} style={{ background: '#F4631E' }} /><span className={sellerStyles.modalTitle}>First Lead</span></div>
                  <p className={sellerStyles.modalInsight}>{deltaKekaToFirst !== null && deltaKekaToFirst <= 30 ? `First lead in ${deltaKekaToFirst} min!` : `First lead at ${formatTime(firstLead)}.`}</p>
                  <div className={sellerStyles.modalStatGrid}>
                    <div className={sellerStyles.modalStat}><span>Time</span><strong>{formatTime(firstLead)}</strong></div>
                    <div className={sellerStyles.modalStat}><span>After Keka</span><strong className={sellerStyles.statGood}>{deltaKekaToFirst}m</strong></div>
                    <div className={sellerStyles.modalStat}><span>Total</span><strong>{drillSellerS1.allotment?.rtg_leads || drillSellerS1.allotment?.non_rtg_leads ? (drillSellerS1.allotment?.rtg_leads || 0) + (drillSellerS1.allotment?.non_rtg_leads || 0) : '—'}</strong></div>
                    <div className={sellerStyles.modalStat}><span>Auto/Manual</span><strong>{drillSellerS1.allotment?.auto_allotted || 0}/{drillSellerS1.allotment?.manual_allotted || 0}</strong></div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* S1 Timeline Block Modal */}
      {activeBlockS1 && (
        <div className={sellerStyles.modalOverlay} onClick={() => setActiveBlockS1(null)}>
          <div className={sellerStyles.modalCard} onClick={e => e.stopPropagation()}>
            <button className={sellerStyles.modalClose} onClick={() => setActiveBlockS1(null)}>✕</button>
            <div className={sellerStyles.modalHeader}>
              <span className={sellerStyles.modalDot} style={{ background: activeBlockS1.leads > 0 ? (activeBlockS1.isLateAllocation ? '#F4631E' : '#33C2C9') : activeBlockS1.eligible ? '#6B6660' : '#3a3a3a' }} />
              <span className={sellerStyles.modalTitle}>{activeBlockS1.hour}</span>
            </div>
            <p className={sellerStyles.modalInsight}>
              {activeBlockS1.isLateAllocation
                ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} late allocation lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Eligible for late allocation (6PM/7PM catch-up).')
                : activeBlockS1.isBreak
                  ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} manual lead${activeBlockS1.leads > 1 ? 's' : ''} landed while on break.` : 'On break (logged out of Keka). Not eligible for auto-allocation.')
                  : !activeBlockS1.isReady
                    ? (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} manual lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Not ready on Ozontell. Not eligible for auto-allocation.')
                    : (activeBlockS1.leads > 0 ? `${activeBlockS1.leads} auto lead${activeBlockS1.leads > 1 ? 's' : ''} landed.` : 'Eligible, no lead.')
              }
            </p>
          </div>
        </div>
      )}

      {/* Funnel Modal */}
      