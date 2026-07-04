import re

with open('scratch/stitched_admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

with open('scratch/AdminMonthlyBreakdownSection.tsx', 'r', encoding='utf-8') as f:
    monthly_code = f.read()

# 1. Add SellerTimelineModal import
content = content.replace("import Loader from '@/components/ui/Loader'", "import Loader from '@/components/ui/Loader'\nimport SellerTimelineModal from './SellerTimelineModal'")

# 2. Add state for SellerTimelineModal in AdminLTAPage
state_to_add = """  const [expandedTl, setExpandedTl] = useState<string | null>(null)
  const [selectedSellerTimeline, setSelectedSellerTimeline] = useState<any>(null)"""

content = content.replace("const [expandedTl, setExpandedTl] = useState<string | null>(null)", state_to_add)

# 3. Add modal component at the end of AdminLTAPage return
modal_code = """
      {selectedSellerTimeline && (
        <SellerTimelineModal
          isOpen={true}
          onClose={() => setSelectedSellerTimeline(null)}
          seller={selectedSellerTimeline}
          date={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  )
}
"""
content = re.sub(r'</div>\s*\n\s*\)\s*\n}\s*$', modal_code, content, count=1)

# 4. Update LoginSection to trigger modal
login_def = "function LoginSection({ hierarchy }: { hierarchy: any[] }) {"
login_def_new = "function LoginSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {"
content = content.replace(login_def, login_def_new)

# Add onClick to seller row in LoginSection
# We need to find the <tr className="la-seller-row"> inside LoginSection
# We can just do a replace, but we need to make sure we only replace inside LoginSection.
# So let's extract LoginSection, modify it, and put it back.

login_match = re.search(r'function LoginSection.*?^}$', content, re.MULTILINE | re.DOTALL)
if login_match:
    login_sec = login_match.group(0)
    login_sec = login_sec.replace('<tr key={seller.email} className="la-seller-row">', '<tr key={seller.email} className="la-seller-row" onClick={() => onSellerClick(seller)} style={{cursor: "pointer"}}>')
    content = content.replace(login_match.group(0), login_sec)

# 5. Add MonthlyBreakdownSection code at the end of the file
content += "\n\n" + monthly_code

# 6. Update AdminLTAPage to render MonthlyBreakdownSection and pass onSellerClick to LoginSection
# Inside AdminLTAPage, we have: <LoginSection hierarchy={hierarchy} />
content = content.replace('<LoginSection hierarchy={hierarchy} />', '<LoginSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />')

# Find where to put MonthlyBreakdownSection rendering.
# It should go right before the closing div of the page.
# The page return structure is:
# return (
#   <div className="la-page">
#     ...
#     <LoginSection ... />
#     ...
#     <PaxSection ... />
#   </div>
# )
# Let's just insert it after PaxSection.

monthly_render = """
      {/* Monthly Breakdown */}
      <h2 className="la-section-title" style={{ marginTop: '48px' }}>Monthly Breakdown KPI</h2>
      <MonthlyBreakdownSection 
        hierarchy={hierarchy} 
        dotDistribution={[]} 
        date={new Date().toISOString().split('T')[0]} 
        setDrillSellerTimeline={setSelectedSellerTimeline} 
      />
"""

# Find the end of PaxSection usage
pax_usage = "<PaxSection hierarchy={hierarchy} />"
content = content.replace(pax_usage, pax_usage + "\n" + monthly_render)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Final stitching complete! Saved to AdminLTAPage.tsx")
