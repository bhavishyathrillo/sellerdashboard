import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix totalAppetite for the parent card (if it's not already correct)
# Well, totalAppetite is already `const totalAppetite = allMembers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)`
# But maybe we should make sure it sums over `final_lta` properly.

# Fix cAppetite, tAppetite, sAppetite in the drilldown modal
# Replace `const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.ltaActual || 0), 0)`
# with `const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)`
text = text.replace(
    "const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.ltaActual || 0), 0)",
    "const cAppetite = catSellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)"
)

text = text.replace(
    "const tAppetite = tl.sellers.reduce((s: number, m: any) => s + (m.ltaActual || 0), 0)",
    "const tAppetite = tl.sellers.reduce((s: number, m: any) => s + (m.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0), 0)"
)

text = text.replace(
    "const sAppetite = s.ltaActual || 0",
    "const sAppetite = (s.monthly_lta_rows || []).reduce((s2: number, r: any) => s2 + Math.floor(r.final_lta || 0), 0)"
)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
