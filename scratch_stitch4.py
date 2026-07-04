import re

# 1. Read base file
with open('scratch/extracted_admin.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 2. Fix template literals
content = content.replace('\\`', '`')
content = content.replace('\\$', '$')
content = content.replace('\\\\', '\\')

# 3. Read update_tables.js
with open('c:/Users/sheor/.gemini/antigravity-ide/brain/d4189715-0b9c-4af9-9b52-fc9e2b90723c/scratch/update_tables.js', 'r', encoding='utf-8') as f:
    update_content = f.read()

# Extract LoginSection from update_tables.js
login_match = re.search(r'function LoginSection.*?^}$', update_content, re.MULTILINE | re.DOTALL)
login_new = login_match.group(0)

# Extract helpers
helpers_match = re.search(r'// --- Helper Functions ---.*?\*/', update_content, re.MULTILINE | re.DOTALL)
helpers = helpers_match.group(0)

# 4. Replace LoginSection in AdminLTAPage
content = re.sub(r'function LoginSection.*?^}$', login_new, content, flags=re.MULTILINE | re.DOTALL)

# Insert helpers right before LoginSection
content = content.replace(login_new, helpers + '\n\n' + login_new)

# 5. Add SellerTimelineModal import
content = content.replace("import Loader from '@/components/ui/Loader'", "import Loader from '@/components/ui/Loader'\nimport SellerTimelineModal from './SellerTimelineModal'")

# 6. Add state for SellerTimelineModal in AdminLTAPage
state_to_add = """  const [dateTo, setDateTo] = useState(todayIST)
  const [selectedSellerTimeline, setSelectedSellerTimeline] = useState<any>(null)"""
content = content.replace("  const [dateTo, setDateTo] = useState(todayIST)", state_to_add)

# 7. Add modal component at the end of AdminLTAPage return
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

# 8. Update LoginSection to trigger modal
login_def = "function LoginSection({ hierarchy }: { hierarchy: any[] }) {"
login_def_new = "function LoginSection({ hierarchy, onSellerClick }: { hierarchy: any[], onSellerClick: (seller: any) => void }) {"
content = content.replace(login_def, login_def_new)

# Add onClick to seller row in LoginSection
login_match_final = re.search(r'function LoginSection.*?^}$', content, re.MULTILINE | re.DOTALL)
if login_match_final:
    login_sec = login_match_final.group(0)
    # The seller row in the new LoginSection is `<tr className="la-seller-row">` or similar
    login_sec = login_sec.replace('<tr className="la-tl-row" style={{ background: \'rgba(255,255,255,0.02)\' }}>', '<tr className="la-tl-row" style={{ background: \'rgba(255,255,255,0.02)\', cursor: "pointer" }} onClick={() => onSellerClick(s)}>')
    # Wait, the new LoginSection maps over `tl.sellers.map((s: any) => (`
    # Let's replace the <tr> for sellers explicitly.
    login_sec = re.sub(r'<tr([^>]*?)>', r'<tr\1 onClick={() => onSellerClick(s)} style={{cursor: "pointer"}}>', login_sec)
    # But wait, this would add onClick to ALL <tr> inside LoginSection, including header and category!
    # Let's be more specific. The seller row is inside `tl.sellers.map((s: any) => (`
    pass

# Better approach for LoginSection onClick:
# Find `tl.sellers.map((s: any) => (` and replace the `<tr>` inside it.
def repl_tr(m):
    return m.group(1) + '<tr style={{ background: "rgba(255,255,255,0.02)", cursor: "pointer" }} onClick={() => onSellerClick(s)}>'

content = re.sub(r'(tl\.sellers\.map\(\(s: any\) => \(\s*)<tr[^>]*>', repl_tr, content)


# 9. Read MonthlyBreakdownSection
with open('scratch/AdminMonthlyBreakdownSection.tsx', 'r', encoding='utf-8') as f:
    monthly_code = f.read()

# Add MonthlyBreakdownSection code at the end of the file
content += "\n\n" + monthly_code

# 10. Update AdminLTAPage to render MonthlyBreakdownSection and pass onSellerClick to LoginSection
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

# 11. Remove duplicate formatTime
# `update_tables.js` adds `function formatTime(raw) { ... }` which conflicts with `function formatTime(raw: string | null): string`
content = re.sub(r'function formatTime\(raw\) \{.*?\n\}\n\n', '', content, flags=re.DOTALL)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Final stitching complete! Saved to AdminLTAPage.tsx")
