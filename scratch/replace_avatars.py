import re

with open('src/features/shared/QBStatsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import styles from './QBStatsPage.module.css'",
    "import styles from './QBStatsPage.module.css'\nimport Avatar from '@/components/ui/Avatar'"
)

# Pattern to replace the React.createElement('span', ... initials(name))
# Example: React.createElement('span', { className: styles.avatar, style: { background: color + '22', color: color, width: 36, height: 36, fontSize: 14 } }, initials(sellerName))

# We will just replace all instances matching initials(...) that are inside React.createElement
def replace_avatar(match):
    # Match group 1: width/height value (e.g. 36, 26, 20)
    # Match group 2: name variable (e.g. sellerName, s.seller_name, group.name)
    width = match.group(1)
    name_var = match.group(2)
    return f"React.createElement(Avatar, {{ name: {name_var}, size: {width}, className: styles.avatar }})"

pattern = r"React\.createElement\('span', \{ className: styles\.avatar, style: \{[^\}]*width: (\d+)[^\}]*\} \}, initials\(([^)]+)\)\)"
content = re.sub(pattern, replace_avatar, content)

# One edge case at line 485: background: cm.color + '22'
pattern2 = r"React\.createElement\('span', \{ className: styles\.avatar, style: \{[^\}]*width: (\d+)[^\}]*\} \}, initials\(([^)]+)\)\)"
content = re.sub(pattern2, replace_avatar, content)

with open('src/features/shared/QBStatsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
