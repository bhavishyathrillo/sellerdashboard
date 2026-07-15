import re

with open('scratch/stitched_admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix template literals
content = content.replace('\\`', '`')
content = content.replace('\\$', '$')
content = content.replace('\\\\', '\\')

with open('scratch/AdminMonthlyBreakdownSection.tsx', 'r', encoding='utf-8') as f:
    monthly_code = f.read()

# 1. Add SellerTimelineModal import
content = content.replace("import Loader from '@/components/ui/Loader'", "import Loader from '@/components/ui/Loader'\nimport SellerTimelineModal from './SellerTimelineModal'")

# 2. Add state for SellerTimelineModal in AdminLTAPage
state_to_add = """  const [dateTo, setDateTo] = useState(todayIST)
  const [selectedSellerTimeline, setSelectedSellerTimeline] = useState<any>(null)"""

content = content.replace("  const [dateTo, setDateTo] = useState(todayIST)", state_to_add)

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

login_match = re.search(r'function LoginSection.*?^}$', content, re.MULTILINE | re.DOTALL)
if login_match:
    login_sec = login_match.group(0)
    login_sec = login_sec.replace('<tr key={seller.email} className="la-seller-row">', '<tr key={seller.email} className="la-seller-row" onClick={() => onSellerClick(seller)} style={{cursor: "pointer"}}>')
    content = content.replace(login_match.group(0), login_sec)

# 5. Add MonthlyBreakdownSection code at the end of the file
content += "\n\n" + monthly_code

# 6. Update AdminLTAPage to render MonthlyBreakdownSection and pass onSellerClick to LoginSection
content = content.replace('<LoginSection hierarchy={hierarchy} />', '<LoginSection hierarchy={hierarchy} onSellerClick={setSelectedSellerTimeline} />')

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
pax_usage = "<PaxSection hierarchy={hierarchy} />\n          </AccordionSection>"
content = content.replace(pax_usage, pax_usage + "\n" + monthly_render)

# Remove duplicate formatTime implementations
# Because `scratch/stitched_admin.tsx` had its own `formatTime` and `update_tables.js` injected another one!
# Let's remove the one from update_tables.js which is right before LoginSection.
# Actually, the easiest is to just remove ALL but the first `function formatTime`.
parts = content.split('function formatTime')
if len(parts) > 2:
    # First split is before the first formatTime
    # Second split is between first and second
    # Third split is after second
    # We want to remove the second function definition entirely.
    # We can use regex to find and remove it.
    pass

# Better approach: remove formatTime block that has `function formatTime(raw) {` (the one from JS, un-typed)
content = re.sub(r'function formatTime\(raw\)\s*\{.*?\}\n\n', '', content, flags=re.DOTALL)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Final stitching complete! Saved to AdminLTAPage.tsx")
