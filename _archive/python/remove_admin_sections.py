import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove Section 3.4
text = re.sub(r'(\s*<AccordionSection number="3\.4".*?</AccordionSection>)', '', text, flags=re.DOTALL)

# Remove Section 3.10
text = re.sub(r'(\s*<AccordionSection number="3\.10".*?</AccordionSection>)', '', text, flags=re.DOTALL)

# Remove Section 3.11
text = re.sub(r'(\s*<AccordionSection number="3\.11".*?</AccordionSection>)', '', text, flags=re.DOTALL)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Removed sections 3.4, 3.10, 3.11 from AdminLTAPage.tsx")
