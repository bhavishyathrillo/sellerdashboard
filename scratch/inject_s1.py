import re

with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    l2_content = f.read()

s1_start = l2_content.find('{/* S1: Login & Availability Modal */}')
s1_end = l2_content.find('      )}', s1_start)

if s1_start != -1 and s1_end != -1:
    s1_modal = l2_content[s1_start:s1_end + 8]
    
    with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
        l1_content = f.read()
        
    insert_pos = l1_content.find('{/* Team Funnel Modal */}')
    if insert_pos != -1:
        l1_content = l1_content[:insert_pos] + s1_modal + '\n\n      ' + l1_content[insert_pos:]
        with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
            f.write(l1_content)
        print("S1 modal injected successfully")
    else:
        print("Could not find Team Funnel Modal to insert before")
else:
    print("Could not extract S1 modal from L2")
