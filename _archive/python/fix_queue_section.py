import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace QueueSection
old_section = re.search(r'function QueueSection\(.*?\n\}', text, re.DOTALL | re.MULTILINE)

new_section = """function QueueSection({ hierarchy }: { hierarchy: any[] }) {
  return (
    <div style={{ padding: '32px', textAlign: 'center', color: '#A1A1AA', fontSize: '14px', fontStyle: 'italic' }}>
      Data coming soon...
    </div>
  )
}"""

if old_section:
    text = text.replace(old_section.group(0), new_section)
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced QueueSection")
else:
    print("Could not find QueueSection")
