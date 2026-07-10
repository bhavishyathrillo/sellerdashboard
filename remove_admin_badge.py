with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("{ text: 'Admin only', color: 'blue' },", "")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Removed Admin only badge")
