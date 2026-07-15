import re

files = [
    'components/pages/L1SellerViewPage.tsx',
    'components/pages/L2SellerViewPage.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Reduce padding
    text = text.replace("padding: '24px 24px'", "padding: '16px 20px'")

    # 2. Reduce gap
    text = text.replace("gap: '24px'", "gap: '12px'")

    # 3. Reduce large font size
    text = text.replace("fontSize: '2.2rem'", "fontSize: '1.8rem'")

    # 4. Reduce title sizes and spacing to prevent wrapping
    text = re.sub(
        r"fontSize: '0\.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '16px'",
        r"fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: '12px', whiteSpace: 'nowrap'",
        text
    )

    # 5. Fix inner label margins
    text = text.replace("marginBottom: '6px'", "marginBottom: '2px'")

    # 6. Shrink inner label text
    text = text.replace("fontSize: '0.7rem'", "fontSize: '0.6rem'")
    
    # 7. Make the '/ 43' span a bit smaller to fit
    text = text.replace("fontSize: \"1rem\", color: \"#8A8278\", fontWeight: 500, letterSpacing: \"0px\"", "fontSize: '0.8rem', color: '#8A8278', fontWeight: 400")

    # MHE and Goal trend cards have custom backgrounds, make sure padding is updated there too
    text = text.replace("padding: '16px', borderRadius: '8px', flex: 1.2", "padding: '16px 20px', borderRadius: '12px', flex: 1.2")
    text = text.replace("padding: '16px', borderRadius: '8px', flex: 1", "padding: '16px 20px', borderRadius: '12px', flex: 1")
    text = text.replace("background: '#1A1A1A', padding: '16px 20px', borderRadius: '12px'", "background: 'linear-gradient(145deg, #1e1e1e, #141414)', padding: '16px 20px', borderRadius: '12px'")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print("KPI Cards scaled down to fit!")
