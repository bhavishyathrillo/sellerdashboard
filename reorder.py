import re

filepath = 'components/pages/L1SellerViewPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

marker_s1 = "setActiveSectionModal(activeSectionModal === 's1' ? null : 's1')"
marker_s2 = "setActiveSectionModal(activeSectionModal === 's2' ? null : 's2')"
marker_s3 = "setActiveSectionModal(activeSectionModal === 's3' ? null : 's3')"
marker_s5 = "setActiveSectionModal(activeSectionModal === 's5' ? null : 's5')"
marker_s7_cm = "setActiveSectionModal(activeSectionModal === 's7_cm' ? null : 's7_cm')"
marker_s9 = "setActiveSectionModal(activeSectionModal === 's9' ? null : 's9')"
marker_s4 = "setActiveSectionModal(activeSectionModal === 's4' ? null : 's4')"
marker_s10 = "setActiveSectionModal(activeSectionModal === 's10' ? null : 's10')"

def get_block_start(content, marker):
    idx = content.find(marker)
    div_start = content.rfind('<div className={styles.sectionHeaderCollapsible}', 0, idx)
    line_start = content.rfind('\n', 0, div_start) + 1
    return line_start

idx_s1 = get_block_start(content, marker_s1)
idx_s2 = get_block_start(content, marker_s2)
idx_s3 = get_block_start(content, marker_s3)
idx_s5 = get_block_start(content, marker_s5)
idx_s7 = get_block_start(content, marker_s7_cm)
idx_s9 = get_block_start(content, marker_s9)
idx_s4 = get_block_start(content, marker_s4)
idx_s10 = get_block_start(content, marker_s10)

end_idx = content.find('{/* Team Funnel Modal */}')
if end_idx == -1:
    end_idx = content.find('showTeamFunnel && activeFunnelTl')
    end_idx = content.rfind('{', 0, end_idx)

end_line_start = content.rfind('\n', 0, end_idx) + 1

blocks = {}
blocks['s1'] = content[idx_s1:idx_s2]
blocks['s2'] = content[idx_s2:idx_s3]
blocks['s3'] = content[idx_s3:idx_s5]
blocks['s5'] = content[idx_s5:idx_s7]
blocks['s7_cm'] = content[idx_s7:idx_s9]
blocks['s9'] = content[idx_s9:idx_s4]
blocks['s4'] = content[idx_s4:idx_s10]
blocks['s10'] = content[idx_s10:end_line_start]

before_blocks = content[:idx_s1]
after_blocks = content[end_line_start:]

new_order = ['s9', 's3', 's4', 's1', 's2', 's5', 's7_cm', 's10']
new_middle = ''.join([blocks[k] for k in new_order])

new_content = before_blocks + new_middle + after_blocks

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Successfully reordered accordions!')
