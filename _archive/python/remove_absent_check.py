import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace all occurrences of s.isAbsent ? '—' : with nothing in the MonthlyBreakdownSection
# But wait, I'll only do it inside the MonthlyBreakdownSection (lines 2079 - 2091).
# Just to be safe, let's extract the MonthlyBreakdownSection first, or just do a global replace 
# but ONLY for those specific string patterns.

# Find the MonthlyBreakdownSection block.
match = re.search(r'function MonthlyBreakdownSection.*?^}', text, re.DOTALL | re.MULTILINE)
if match:
    section_code = match.group(0)
    
    # Do replacements
    new_code = section_code.replace("s.isAbsent ? '—' : ", "")
    
    text = text.replace(section_code, new_code)
    
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replacements done in MonthlyBreakdownSection.")
else:
    print("Could not find MonthlyBreakdownSection.")
