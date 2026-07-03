import re

file_path = 'components/pages/L1SellerViewPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove onClick={() => setActiveSellerFunnel(m)} style={{ cursor: 'pointer' }} from ALL seller rows EXCEPT S9
# We will just remove it entirely first, and then carefully add it back to S9 and S1.
pattern_to_remove = r" onClick=\{\(\) => setActiveSellerFunnel\(m\)\} style=\{\{ cursor: 'pointer' \}\}"
content = re.sub(pattern_to_remove, "", content)

# 2. Add back onClick for S9 (LTA)
# Find S9 table body
s9_start = content.find('S9 · LTA')
if s9_start != -1:
    s9_body_start = content.find('<tbody>', s9_start)
    s9_body_end = content.find('</tbody>', s9_body_start)
    
    if s9_body_start != -1 and s9_body_end != -1:
        s9_body = content[s9_body_start:s9_body_end]
        # Replace the sellerRow in S9 body
        s9_body = s9_body.replace(
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`}>',
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} onClick={() => setActiveSellerFunnel(m)} style={{ cursor: \'pointer\' }}>'
        )
        content = content[:s9_body_start] + s9_body + content[s9_body_end:]

# 3. Add back onClick for S1 (Login & Availability)
s1_start = content.find('S1 · Login & Availability')
if s1_start != -1:
    s1_body_start = content.find('<tbody>', s1_start)
    s1_body_end = content.find('</tbody>', s1_body_start)
    
    if s1_body_start != -1 and s1_body_end != -1:
        s1_body = content[s1_body_start:s1_body_end]
        # Replace the sellerRow in S1 body
        s1_body = s1_body.replace(
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} style={late ? { backgroundColor: \'rgba(239,68,68,0.05)\' } : {}}>',
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} onClick={() => setDrillSellerS1(m)} style={{ ...(late ? { backgroundColor: \'rgba(239,68,68,0.05)\' } : {}), cursor: \'pointer\' }}>'
        )
        content = content[:s1_body_start] + s1_body + content[s1_body_end:]

# 4. Add setDrillSellerS1, activeTileS1, activeBlockS1 states if not exists
if 'const [drillSellerS1' not in content:
    content = content.replace(
        'const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)',
        'const [drillSellerS1, setDrillSellerS1] = useState<any>(null)\n  const [activeTileS1, setActiveTileS1] = useState<string | null>(null)\n  const [activeBlockS1, setActiveBlockS1] = useState<any>(null)\n  const [activeBreakdownCard, setActiveBreakdownCard] = useState<string | null>(null)'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated L1")
