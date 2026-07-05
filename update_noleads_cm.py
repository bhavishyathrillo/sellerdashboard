import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_tl_grouping = """  // Group by TL
  const grouped: Record<string, any[]> = {}
  sellers.forEach(s => {
    if (!grouped[s.tlName]) grouped[s.tlName] = []
    grouped[s.tlName].push(s)
  })"""

new_tl_grouping = """  // Group by TL and CM
  const grouped: Record<string, any[]> = {}
  sellers.forEach(s => {
    const key = `${s.catName} / ${s.tlName}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  })"""

text = text.replace(old_tl_grouping, new_tl_grouping)

old_tl_display = """                <div style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                  {tlName}
                </div>"""

new_tl_display = """                <div style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#F59E0B' }}>
                  {tlName}
                </div>"""

# Wait, `tlName` in the map is actually `key` now, which is `Cat / TL`.
text = text.replace("Object.keys(grouped).map(tlName =>", "Object.keys(grouped).map(groupKey =>")
text = text.replace("key={tlName}", "key={groupKey}")
text = text.replace("{tlName}", "{groupKey}")
text = text.replace("grouped[tlName]", "grouped[groupKey]")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
