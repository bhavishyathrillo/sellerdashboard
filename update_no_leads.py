import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_logic = """  const noLeadsSellers = hierarchy.flatMap((cat: any) =>
    (cat.tls || []).flatMap((tl: any) =>
      (tl.sellers || []).filter((s: any) => !s.isAbsent && s.totalLeads === 0).map((s: any) => ({
        ...s,
        tlName: tl.tl_name,
        catName: cat.category_name,
        status: '0 Leads'
      }))
    )
  )"""

new_logic = """  const noLeadsSellers = hierarchy.flatMap((cat: any) =>
    (cat.tls || []).flatMap((tl: any) =>
      (tl.sellers || []).filter((s: any) => s.totalLeads === 0).map((s: any) => {
        let statusStr = '0 Leads';
        if (s.isAbsent) {
          statusStr = 'Absent';
        } else if (!s.orbit?.first_login) {
          statusStr = 'Not Logged in Orbit';
        } else if (!s.cti?.ready_timestamps) {
          statusStr = 'Not Ready on Ozonetel';
        }
        
        return {
          ...s,
          tlName: tl.tl_name,
          catName: cat.category_name,
          status: statusStr
        };
      })
    )
  )"""

if old_logic in text:
    text = text.replace(old_logic, new_logic)
else:
    print("Could not find the old logic string")

with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated noLeadsSellers logic")
