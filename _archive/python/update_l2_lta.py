import re

with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update headerStats
old_header = """            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Planned LTA</span>
              <span className={styles.headerStatValue}>{teamPlanned}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Final LTA</span>
              <span className={styles.headerStatValue}>{teamActual}</span>
            </div>"""
new_header = """            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Planned LTA</span>
              <span className={styles.headerStatValue}>{teamPlanned}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Team Final LTA</span>
              <span className={styles.headerStatValue}>{teamActual}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Leads Allotted</span>
              <span className={styles.headerStatValue}>{(() => {
                return enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0), 0)
              })()}</span>
            </div>
            <div className={styles.headerStat}>
              <span className={styles.headerStatLabel}>Fulfillment %</span>
              <span className={styles.headerStatValue}>{(() => {
                const leads = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0), 0)
                return teamActual > 0 ? Math.round((leads / teamActual) * 100) : 0
              })()}%</span>
            </div>"""
text = text.replace(old_header, new_header)

# 2. Update kpiRow
old_kpi = """                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Team Planned LTA</span>
                  <span className={styles.kpiValue}>{teamPlanned}</span>
                </div>
                <div className={styles.kpiItem} style={{ borderRight: 'none', paddingRight: 0 }}>
                  <span className={styles.kpiLabel}>Team Final LTA</span>
                  <span className={styles.kpiValue}>{teamActual}</span>
                </div>"""
new_kpi = """                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Team Planned LTA</span>
                  <span className={styles.kpiValue}>{teamPlanned}</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Team Final LTA</span>
                  <span className={styles.kpiValue}>{teamActual}</span>
                </div>
                <div className={styles.kpiItem}>
                  <span className={styles.kpiLabel}>Leads Allotted</span>
                  <span className={styles.kpiValue}>{(() => {
                    return enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0), 0)
                  })()}</span>
                </div>
                <div className={styles.kpiItem} style={{ borderRight: 'none', paddingRight: 0 }}>
                  <span className={styles.kpiLabel}>Fulfillment %</span>
                  <span className={styles.kpiValue}>{(() => {
                    const leads = enrichedMembers.reduce((sum: number, m: any) => sum + (m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0), 0)
                    return teamActual > 0 ? Math.round((leads / teamActual) * 100) : 0
                  })()}%</span>
                </div>"""
text = text.replace(old_kpi, new_kpi)

with open('components/pages/L2SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated L2SellerViewPage LTA stats!")
