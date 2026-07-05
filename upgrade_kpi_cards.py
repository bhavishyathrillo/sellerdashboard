import re

files = [
    'components/pages/L1SellerViewPage.tsx',
    'components/pages/L2SellerViewPage.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # 1. Update the outer summaryCard style
    old_card_style = "style={{ background: '#1A1A1A', padding: '16px', borderRadius: '8px',"
    new_card_style = "style={{ background: 'linear-gradient(145deg, #1e1e1e, #141414)', padding: '24px 24px', borderRadius: '12px',"
    text = text.replace(old_card_style, new_card_style)

    # Make sure border and transitions are updated for all cards
    text = re.sub(
        r"border: '1px solid #333'(.*?)transition: 'border-color 0\.2s'",
        r"border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'\1transition: 'all 0.3s ease'",
        text
    )

    # 2. Update the colored top borders from 3px to 4px
    text = re.sub(
        r"height: '3px', background: (.*?) }} />",
        r"height: '4px', background: \1 }} />",
        text
    )

    # 3. Update all Card Titles
    text = re.sub(
        r"style={{ fontSize: '0\.6rem', color: '#8A8278', textTransform: 'uppercase', letterSpacing: '0\.5px', marginBottom: '6px' }}>(.*?)</div>",
        r"style={{ fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '16px' }}>\1</div>",
        text
    )

    # 4. Update inner label headers (Total, Auto, Manual, RTG %, Count, etc)
    text = re.sub(
        r"style={{ fontSize: '0\.6rem', color: '#8A8278', marginBottom: '2px' }}>(.*?)</div>",
        r"style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>\1</div>",
        text
    )

    # 5. Fix gap from 16px to 24px in the flex rows
    text = text.replace("gap: '16px', marginBottom: '4px'", "gap: '24px', marginBottom: '4px'")

    # 6. Update large values (1.6rem -> 2.2rem)
    text = text.replace("fontSize: '1.6rem'", "fontSize: '2.2rem'")

    # 7. Update the "out of X" text to look cleaner
    # E.g. <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of {globalFinalLta}</span></span>
    # and <span style={{ fontSize: '0.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of {teamActual}</span></span>
    text = re.sub(
        r" <span style={{ fontSize: '0\.9rem', color: '#8A8278', fontWeight: 400, textTransform: 'lowercase' }}>out of (.*?)</span>",
        r' <span style={{ fontSize: "1rem", color: "#8A8278", fontWeight: 500, letterSpacing: "0px" }}>/ \1</span>',
        text
    )

    # 8. MHE Trend borders need updating because it uses a template literal for border
    text = re.sub(
        r"border: `1px solid \$\{isGood \? 'rgba\(34,197,94,0\.25\)' : 'rgba\(239,68,68,0\.25\)'\}`",
        r"border: `1px solid ${isGood ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.2)'",
        text
    )

    # 9. Update "tap to view"
    text = text.replace("fontSize: '0.6rem', color: '#555', marginLeft: 'auto', marginTop: '-12px'", "fontSize: '0.65rem', color: '#6B7280', marginLeft: 'auto', marginTop: '-12px', letterSpacing: '0.5px', textTransform: 'uppercase'")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

print("KPI Cards beautifully upgraded!")
