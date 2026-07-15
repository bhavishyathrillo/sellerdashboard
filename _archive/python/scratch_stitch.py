import re

with open('scratch/extracted_admin.tsx', 'r', encoding='utf-8') as f:
    admin_content = f.read()

with open('c:/Users/sheor/.gemini/antigravity-ide/brain/d4189715-0b9c-4af9-9b52-fc9e2b90723c/scratch/update_tables.js', 'r', encoding='utf-8') as f:
    update_content = f.read()

# Extract LoginSection from update_tables.js
login_match = re.search(r'function LoginSection.*?^}$', update_content, re.MULTILINE | re.DOTALL)
login_new = login_match.group(0) if login_match else ''

# Extract AutoManualSection from update_tables.js
auto_match = re.search(r'function AutoManualSection.*?^}$', update_content, re.MULTILINE | re.DOTALL)
auto_new = auto_match.group(0) if auto_match else ''

# Extract RTGSection from update_tables.js
rtg_match = re.search(r'function RTGSection.*?^}$', update_content, re.MULTILINE | re.DOTALL)
rtg_new = rtg_match.group(0) if rtg_match else ''

# Extract helpers
helpers_match = re.search(r'// --- Helper Functions ---.*?\*/', update_content, re.MULTILINE | re.DOTALL)
helpers = helpers_match.group(0) if helpers_match else ''

# Replace in AdminLTAPage
admin_content = re.sub(r'function LoginSection.*?^}$', login_new, admin_content, flags=re.MULTILINE | re.DOTALL)
admin_content = re.sub(r'function AutoManualSection.*?^}$', auto_new, admin_content, flags=re.MULTILINE | re.DOTALL)
admin_content = re.sub(r'function RTGSection.*?^}$', rtg_new, admin_content, flags=re.MULTILINE | re.DOTALL)

# Insert helpers right before LoginSection
admin_content = admin_content.replace(login_new, helpers + '\n\n' + login_new)

with open('scratch/stitched_admin.tsx', 'w', encoding='utf-8') as f:
    f.write(admin_content)
print("Stitched successfully.")
