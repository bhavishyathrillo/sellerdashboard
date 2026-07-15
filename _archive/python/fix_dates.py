import os

files = [
    'components/pages/L1SellerViewPage.tsx',
    'components/pages/L2SellerViewPage.tsx'
]

today_str_func = '''function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function '''

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert todayStr before export default function
    if 'function todayStr(): string' not in content:
        content = content.replace('export default function ', today_str_func, 1)

    # 2. Replace new Date().toISOString().split('T')[0] with todayStr()
    content = content.replace("new Date().toISOString().split('T')[0]", 'todayStr()')

    # 3. Replace d.toISOString().split('T')[0] with todayStr() in useState initialization
    content = content.replace(
        "const d = new Date()\n    return d.toISOString().split('T')[0]",
        "return todayStr()"
    )
    
    # 3.5. Specifically for L1
    content = content.replace(
        """  const [date, setDate] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })""",
        """  const [date, setDate] = useState(() => todayStr())"""
    )

    # 4. Total Leads -> Total Leads Allotted
    if 'L1' in filepath:
        content = content.replace('>Total Leads</p>', '>Total Leads Allotted</p>')
        content = content.replace('>TOTAL LEADS</p>', '>TOTAL LEADS ALLOTTED</p>')
        content = content.replace('>Total Leads<', '>Total Leads Allotted<')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated dates and KPI labels!')
