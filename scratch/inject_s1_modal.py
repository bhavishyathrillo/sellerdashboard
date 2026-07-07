import re

# Read L2 file to extract S1 Modal
with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    l2_content = f.read()

s1_modal_start = l2_content.find('{/* S1: Login & Availability Modal */}')
s1_modal_end = l2_content.find('{/* S2: Break & Unavailability Modal */}')

if s1_modal_start != -1 and s1_modal_end != -1:
    s1_modal_code = l2_content[s1_modal_start:s1_modal_end]
else:
    print("Could not find S1 Modal in L2")
    exit(1)

# Read L1 file
with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    l1_content = f.read()

# Insert the S1 modal before the Team Funnel Modal
insert_pos = l1_content.find('{/* Team Funnel Modal */}')
if insert_pos != -1:
    l1_content = l1_content[:insert_pos] + s1_modal_code + '\n      ' + l1_content[insert_pos:]
    with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
        f.write(l1_content)
    print("Injected S1 Modal into L1")
else:
    print("Could not find Team Funnel Modal in L1")
