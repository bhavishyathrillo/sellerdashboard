import re

with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    l2_content = f.read()

s1_start = l2_content.find('{/* S1: Login & Availability Modal */}')

# The end of S1 modal in L2 is just before the last </div>\n  )\n}
s1_end = l2_content.rfind('      )}\n\n    </div>\n  )\n}')

if s1_start != -1 and s1_end != -1:
    # include the `      )}`
    s1_modal = l2_content[s1_start:s1_end + 8]
    
    with open('components/pages/L1SellerViewPage.tsx', 'r', encoding='utf-8') as f:
        l1_content = f.read()
        
    # In L1, we currently have the broken S1 modal between '{/* S1: Login & Availability Modal */}' and '{/* Individual Seller Funnel Modal */}'
    l1_s1_start = l1_content.find('{/* S1: Login & Availability Modal */}')
    funnel_start = l1_content.find('{/* Individual Seller Funnel Modal */}')
    
    if l1_s1_start != -1 and funnel_start != -1:
        # replace everything in between with the correct S1 modal
        l1_content = l1_content[:l1_s1_start] + s1_modal + '\n\n      ' + l1_content[funnel_start:]
        with open('components/pages/L1SellerViewPage.tsx', 'w', encoding='utf-8') as f:
            f.write(l1_content)
        print("S1 modal fixed in L1")
    else:
        print("Could not find start/end markers in L1")
else:
    print("Could not extract S1 modal from L2")
