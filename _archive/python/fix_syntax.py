import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("}\n}\n\n/* ????????? MHE Section ????????? */", "}\n\n/* ????????? MHE Section ????????? */")
# Just in case the MHE Section was deleted, let's just use regex to replace double bracket at end of LTASection
text = re.sub(r'\}\n\}\n\n/\* \?\?\?\?\?\?\?\?\? Queue Section', r'}\n\n/* ????????? Queue Section', text)


with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Fixed syntax error")
