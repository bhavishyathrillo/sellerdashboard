import os

files = [
    'components/pages/L1SellerViewPage.tsx',
    'components/pages/L2SellerViewPage.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # MHE Logic replacements
    old_mhe_logic_l1 = """        const sellerSummaries = members.map((m: any) => {
          const logs = m.monthly_lta_logs || []
          const avg = logs.length > 0
            ? parseFloat((logs.reduce((s: number, r: any) => s + (typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0), 0) / logs.length).toFixed(1))
            : 0
          return { ...m, mheAvg: avg }
        }).sort((a: any, b: any) => b.mheAvg - a.mheAvg)"""
    
    new_mhe_logic_l1 = """        const targetDay = date || todayStr();
        const sellerSummaries = members.map((m: any) => {
          const logs = m.monthly_lta_logs || []
          const todaysData = logs.find((r: any) => r.log_date === targetDay)
          const pct = todaysData && typeof todaysData.mishandled_pct === 'number' 
            ? parseFloat((todaysData.mishandled_pct * 100).toFixed(1)) 
            : 0
          return { ...m, mheToday: pct }
        }).sort((a: any, b: any) => b.mheToday - a.mheToday)"""
    
    old_mhe_logic_l2 = """        const sellerSummaries = enrichedMembers.map((m: any) => {
          const logs = m.monthly_lta_logs || []
          const avg = logs.length > 0
            ? parseFloat((logs.reduce((s: number, r: any) => s + (typeof r.mishandled_pct === 'number' ? r.mishandled_pct * 100 : 0), 0) / logs.length).toFixed(1))
            : 0
          return { ...m, mheAvg: avg }
        }).sort((a: any, b: any) => b.mheAvg - a.mheAvg)"""
        
    new_mhe_logic_l2 = """        const targetDay = date || todayStr();
        const sellerSummaries = enrichedMembers.map((m: any) => {
          const logs = m.monthly_lta_logs || []
          const todaysData = logs.find((r: any) => r.log_date === targetDay)
          const pct = todaysData && typeof todaysData.mishandled_pct === 'number' 
            ? parseFloat((todaysData.mishandled_pct * 100).toFixed(1)) 
            : 0
          return { ...m, mheToday: pct }
        }).sort((a: any, b: any) => b.mheToday - a.mheToday)"""

    text = text.replace(old_mhe_logic_l1, new_mhe_logic_l1)
    text = text.replace(old_mhe_logic_l2, new_mhe_logic_l2)

    text = text.replace(
        "const isGood = s.mheAvg <= 20",
        "const isGood = s.mheToday <= 20"
    )
    
    text = text.replace(
        "<th>Avg MHE %</th>",
        "<th>MHE %</th>"
    )
    
    text = text.replace(
        """<th style={{ padding: '10px 14px', textAlign: 'right', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>Avg MHE %</th>""",
        """<th style={{ padding: '10px 14px', textAlign: 'right', color: '#8A8278', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2a2a' }}>MHE %</th>"""
    )

    text = text.replace(
        "{s.mheAvg}%",
        "{s.mheToday}%"
    )

    # Goal vs SHB logic replacements
    old_goal_date_logic = """        let displayDate = sortedDays[sortedDays.length - 1]
        if (date && sortedDays.includes(date)) {
          displayDate = date
        }"""
        
    new_goal_date_logic = """        let displayDate = date || todayStr();"""
    
    text = text.replace(old_goal_date_logic, new_goal_date_logic)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print("Updated modals in both L1 and L2!")
