import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. MHE Header
text = text.replace(
    "{mheDrillSeller ? `${mheDrillSeller.seller_name} — MHE Trend` : breakdownExpandedTl ? `${processedGroups.find((g: any) => g.l2_email === breakdownExpandedTl)?.l2_name || 'Team'} — MHE Trend` : 'Monthly MHE Trend · Avg'}",
    "{mheDrillSeller ? `${mheDrillSeller.seller_name} — MHE Trend` : breakdownExpandedTl ? `${processedGroups.find((g: any) => g.l2_email === breakdownExpandedTl)?.l2_name || 'Team'} Team — MHE Trend` : 'Monthly MHE Trend · Avg'}"
)

# 2. MHE Drill-down Layout
text = text.replace(
    "<div style={{ display: 'flex', gap: '24px', flexDirection: mheDrillSeller ? 'column' : 'row' }}>",
    "<div style={{ display: 'flex', gap: '24px', flexDirection: 'row' }}>"
)
text = text.replace(
    """                          {!mheDrillSeller && (
                            <div style={{ width: '250px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>Team Drill-down</div>""",
    """                          <div style={{ width: '250px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F0EDE8', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>Team Drill-down</div>"""
)
text = text.replace(
    """                              </div>
                            </div>
                          )}
                        </div>
                      )""",
    """                              </div>
                            </div>
                        </div>
                      )"""
)


# 3. Goal vs SHB Header
text = text.replace(
    "{goalShbDrillSeller ? `${goalShbDrillSeller.seller_name} — Goal vs SHB Trend` : goalShbExpandedTl ? `${processedGroups.find((g: any) => g.l2_email === goalShbExpandedTl)?.l2_name || 'Team'} — Goal vs SHB Trend` : 'Monthly Goal vs SHB Trend · Avg'}",
    "{goalShbDrillSeller ? `${goalShbDrillSeller.seller_name} — Goal vs SHB Trend` : goalShbExpandedTl ? `${processedGroups.find((g: any) => g.l2_email === goalShbExpandedTl)?.l2_name || 'Team'} Team — Goal vs SHB Trend` : 'Monthly Goal vs SHB Trend · Avg'}"
)

# 4. Goal vs SHB Drill-down Layout
text = text.replace(
    """                        {!goalShbDrillSeller && (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333', paddingLeft: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#E5E5E5' }}>Team Drill-down</h3>""",
    """                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #333', paddingLeft: '24px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#E5E5E5' }}>Team Drill-down</h3>"""
)
text = text.replace(
    """                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>""",
    """                              </div>
                            </div>
                          </div>
                      </div>
                    </div>"""
)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated layouts and headers!")
