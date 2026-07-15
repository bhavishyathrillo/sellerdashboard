import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# The accordions start after:
# <div className="la-accordion">
# and end before:
# </div>
#
# {selectedSellerTimeline && (

# Let's find the start and end of the accordion container
start_marker = '<div className="la-accordion">'
end_marker = '</div>\n\n        {selectedSellerTimeline && ('

start_idx = text.find(start_marker)
end_idx = text.find(end_marker, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find accordion container boundaries")
    exit(1)

accordion_block = text[start_idx + len(start_marker):end_idx]

# Extract each section
# Use regex to find all <AccordionSection ...> ... </AccordionSection>
pattern = r'(<AccordionSection title="([^"]+)".*?</AccordionSection>)'
sections = re.findall(pattern, accordion_block, re.DOTALL)

section_dict = {title: full_text for full_text, title in sections}

desired_order = [
    "LTA — Lead Time Availability",
    "Auto vs Manual Allotment",
    "RTG vs Non-RTG",
    "Pax Bifurcation",
    "Login & Availability",
    "Break / Unavailability",
    "DOT Month Distribution",
    "First Lead Received Time",
    "Leads in Queue"
]

reordered_html = "\n"

for title in desired_order:
    if title in section_dict:
        reordered_html += section_dict[title] + "\n\n"
    else:
        # Fallback for exact title mismatch (e.g., unicode characters like '—')
        for k in section_dict.keys():
            if title.replace('—', '').strip() in k.replace('—', '').replace('???', '').strip():
                reordered_html += section_dict[k] + "\n\n"
                break
        else:
            print(f"Warning: Section {title} not found in parsed sections.")

new_text = text[:start_idx + len(start_marker)] + reordered_html + "        " + text[end_idx:]

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Reordered accordions successfully!")
