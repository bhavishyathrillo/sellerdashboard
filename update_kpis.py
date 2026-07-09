import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update noLeadsSellers filter
text = text.replace(
    ".filter((s: any) => s.isAbsent || s.ltaPlanned === 0).map((s: any) => ({",
    ".filter((s: any) => !s.isAbsent && s.totalLeads === 0).map((s: any) => ({"
)
# Update status assignment just in case
text = text.replace(
    "status: s.isAbsent ? 'Absent' : '0 Leads'",
    "status: '0 Leads'"
)

# 2. Update RTG badge
text = text.replace(
    "`Org RTG: ${org.rtgPct}%`",
    "`RTG: ${org.rtgPct}%`"
)

# 3. Update Pax badge
text = text.replace(
    "`Org avg pax: ${alerts.orgAvgPax}`",
    "`Avg pax: ${alerts.orgAvgPax}`"
)

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Changes applied!")
