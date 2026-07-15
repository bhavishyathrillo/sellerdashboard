import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove the `{number} · ` from the AccordionSection title
text = re.sub(r'<span className="la-acc-title">\{number\} · \{title\}</span>', r'<span className="la-acc-title">{title}</span>', text)

# 2. Remove the `number="3.X"` from all AccordionSection instantiations
text = re.sub(r'\s*number="3\.\d+"\s*', ' ', text)

# 3. We also need to remove `number: string` from the AccordionSection props interface
text = re.sub(r'(\s*)number: string\s*', r'\1', text)

# 4. Remove `number, ` from the AccordionSection arguments
text = re.sub(r'function AccordionSection\(\{\s*number,\s*', r'function AccordionSection({\n  ', text)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Removed all numbering from AccordionSections in AdminLTAPage.tsx")
