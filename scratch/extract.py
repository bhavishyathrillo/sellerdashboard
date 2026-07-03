import os
import re

with open('components/pages/L2SellerViewPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# The activeTileS1 modal
start1 = c.find('{activeTileS1 && drillSellerS1')
end1 = c.find('{activeBlockS1 &&')

# The activeBlockS1 modal
start2 = end1
end2 = c.find('{drillSellerS1 && !activeTileS1 && !activeBlockS1')

# The main drillSellerS1 modal
start3 = end2
# The end of this modal is marked by the end of its block. It's followed by drillSellerS2 or some other modal.
# Let's find the end by finding the next modal.
end3 = c.find('{drillSellerS7 &&')
if end3 == -1:
    end3 = c.find('{drillSellerS2 &&')

# Wait, if drillSellerS7 comes right after drillSellerS1, we should cut at {drillSellerS7.
# Let's just grab the whole thing and then explicitly cut off {drillSellerS7.
full_block = c[start1:end3]

with open('scratch/drill.js', 'w', encoding='utf-8') as f:
    f.write(full_block)

print(f"Extracted {len(full_block)} chars.")
