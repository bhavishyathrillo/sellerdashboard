import re

files = ['components/pages/L1SellerViewPage.tsx', 'components/pages/L2SellerViewPage.tsx']

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Reduce padding
    text = text.replace("padding: '24px'", "padding: '16px 20px'")

    # Reduce main numbers
    text = text.replace("fontSize: '2.5rem'", "fontSize: '1.8rem'")
    
    # Reduce % signs
    text = text.replace("fontSize: '1.2rem'", "fontSize: '1rem'")

    # Fix Tap to View wrapping
    text = text.replace(
        "<span style={{ fontSize: '0.65rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tap to View</span>",
        "<span style={{ fontSize: '0.55rem', color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', marginLeft: '8px' }}>Tap to View \u25b6</span>"
    )
    
    # Reduce strip gap
    text = text.replace("gap: '20px', marginBottom: '32px'", "gap: '12px', marginBottom: '20px'")

    # Reduce internal vertical gaps
    text = text.replace("marginBottom: '20px'", "marginBottom: '12px'")
    text = text.replace("paddingTop: '16px'", "paddingTop: '12px'")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print('Done')
