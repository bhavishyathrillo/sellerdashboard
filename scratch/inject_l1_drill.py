import os
import re

l1_path = 'components/pages/L1SellerViewPage.tsx'
drill_path = 'scratch/drill.js'

with open(l1_path, 'r', encoding='utf-8') as f:
    c = f.read()

with open(drill_path, 'r', encoding='utf-8') as f:
    drill = f.read()

# Remove the ending tags from the drill code
drill = re.sub(r'</div\s*>\s*\)\s*\}\s*$', '', drill)

# Inject state variables
c = c.replace(
    "const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)",
    "const [activeSectionModal, setActiveSectionModal] = useState<string | null>(null)\n  const [drillSellerS1, setDrillSellerS1] = useState<any>(null)\n  const [activeTileS1, setActiveTileS1] = useState<string | null>(null)\n  const [activeBlockS1, setActiveBlockS1] = useState<any>(null)"
)

# Add onClick to the S1 seller row.
c = c.replace(
    '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} style={late ? { backgroundColor: \'rgba(239,68,68,0.05)\' } : {}}>',
    '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} style={late ? { backgroundColor: \'rgba(239,68,68,0.05)\', cursor: \'pointer\' } : { cursor: \'pointer\' }} onClick={() => { if (!m.isAbsent) setDrillSellerS1(m); }}>'
)

# Append the drill modal before the last closing tags
# Using string replace instead of re.sub to avoid bad escapes in drill
idx = c.rfind('</div>\n  )\n}')
if idx != -1:
    c = c[:idx] + '\n' + drill + '\n' + c[idx:]
else:
    print("Could not find end of file")

with open(l1_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("Injected successfully!")
