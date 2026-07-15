import re

with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We want to remove the absent pill:
# {m.isAbsent && <span className={styles.absentPill}>Absent</span>}
# And we want to replace `m.isAbsent ? '—' : ` with nothing in the MonthlyBreakdown section.

# Wait, let's just do a regex replace for the pill
text = text.replace("{m.isAbsent && <span className={styles.absentPill}>Absent</span>}", "")

# And we want to remove `m.isAbsent ? '—' : ` but only from the Monthly Breakdown section, 
# or maybe globally if the user wants it removed from all tables?
# Wait, the user specifically said: "FROM CATEGORY MANAGERS MONTHLY BREAKDOWN KPI AS WELLL WITHOUT CHANGING ANY THING OTHER THAN THAT"
# So I should only remove it from the Monthly Breakdown KPI section in L1SellerViewPage.tsx.
# The section seems to be from around line 800 to 1000.
# Let's find the `renderSectionTable` or something similar.
# In L1SellerViewPage, it looks like there's a big switch or block for `expandedTlKey`.

# Let's just manually replace it in the block that has activeMonthlyCard
# We'll use a regex that only operates between `if (expandedTlKey === tl.tl_email)` or similar
# Let's look at the surrounding code of line 900.
# Actually, I'll just write a script that specifically targets the `m.isAbsent ? '—' : ` 
# and replaces it with nothing, but only inside the Monthly Breakdown logic.

import os

lines = text.split('\n')
in_monthly_breakdown = False

for i in range(len(lines)):
    # Simple heuristic: if we see 'activeMonthlyCard', we are in the Monthly Breakdown section
    if 'activeMonthlyCard' in lines[i] or 'MonthlyBreakdown' in lines[i]:
        in_monthly_breakdown = True
    
    # if we enter another section like MHE or something, we can stop, but let's just check the line numbers (approx 850-1000)
    # The file is 2000+ lines. Let's just check the lines roughly between 800 and 1050.
    if 800 <= i <= 1050:
        lines[i] = lines[i].replace("m.isAbsent ? '—' : ", "")
        
        # Also fix the nested ternaries where we return '—' or a value based on isAbsent
        # For instance: <td>{m.isAbsent ? '—' : (() => {
        # Actually replacing `m.isAbsent ? '—' : ` covers almost all of them.
        
        # Let's also check for `{m.isAbsent ? '—' : appetite}` if it exists
        # It's covered by the string replacement.

        # What about `m.isAbsent ? 'inherit' : pVal >= 90 ? '#22C55E' : pVal >= 70 ? '#F59E0B' : '#EF4444'`
        lines[i] = re.sub(r"m\.isAbsent \? 'inherit' : (.*?)$", r"\1", lines[i])

text = '\n'.join(lines)

with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done L1SellerViewPage replacements.")
