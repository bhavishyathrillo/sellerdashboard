import re

file_path = 'components/pages/L2SellerViewPage.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add onClick to S1 table row
s1_start = content.find('S1: Login & Availability')
if s1_start != -1:
    s1_body_start = content.find('<tbody>', s1_start)
    s1_body_end = content.find('</tbody>', s1_body_start)
    
    if s1_body_start != -1 and s1_body_end != -1:
        s1_body = content[s1_body_start:s1_body_end]
        s1_body = s1_body.replace(
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} style={late ? { backgroundColor: \'rgba(239,68,68,0.05)\' } : {}}>',
            '<tr key={m.seller_email} className={`${styles.sellerRow} ${m.isAbsent ? styles.absentRow : \'\'}`} style={{ ...(late ? { backgroundColor: \'rgba(239,68,68,0.05)\' } : {}), cursor: \'pointer\' }} onClick={() => setDrillSellerS1(m)}>'
        )
        content = content[:s1_body_start] + s1_body + content[s1_body_end:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated L2")
