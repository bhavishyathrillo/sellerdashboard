import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add orgTotalLtaPlanned and orgTotalLtaActual calculations
vars_str = """  let orgTotalAuto = 0
  let orgTotalManual = 0
  let orgTotalRtg = 0
  let orgTotalNonRtg = 0"""

new_vars_str = """  let orgTotalAuto = 0
  let orgTotalManual = 0
  let orgTotalRtg = 0
  let orgTotalNonRtg = 0
  let orgTotalLtaPlanned = 0
  let orgTotalLtaActual = 0"""

text = text.replace(vars_str, new_vars_str)

loop_str = """        orgTotalAuto += seller.autoAllotted || 0
        orgTotalManual += seller.manualAllotted || 0
        orgTotalRtg += seller.rtgLeads || 0
        orgTotalNonRtg += seller.nonRtgLeads || 0
      })"""

new_loop_str = """        orgTotalAuto += seller.autoAllotted || 0
        orgTotalManual += seller.manualAllotted || 0
        orgTotalRtg += seller.rtgLeads || 0
        orgTotalNonRtg += seller.nonRtgLeads || 0
        orgTotalLtaPlanned += seller.ltaPlanned || 0
        orgTotalLtaActual += seller.ltaActual || 0
      })"""

text = text.replace(loop_str, new_loop_str)

# 2. Update LTA Accordion
old_lta_acc = '<AccordionSection title="LTA — Lead Time Availability">'
# There might be ??? in place of the long dash from my python script earlier
old_lta_acc_2 = '<AccordionSection title="LTA ??? Lead Time Availability">'

new_lta_acc = '<AccordionSection title="LTA — Lead Time Availability" badges={[{ text: `Planned: ${orgTotalLtaPlanned}`, color: \'blue\' }, { text: `Actual: ${orgTotalLtaActual}`, color: \'blue\' }]}>'

if old_lta_acc in text:
    text = text.replace(old_lta_acc, new_lta_acc)
elif old_lta_acc_2 in text:
    text = text.replace(old_lta_acc_2, new_lta_acc)


# 3. Update RTG Accordion
old_rtg_acc = '<AccordionSection title="RTG vs Non-RTG" badges={[{ text: `RTG: ${org.rtgPct}%`, color: \'yellow\' }]}>'
new_rtg_acc = '<AccordionSection title="RTG vs Non-RTG" badges={[{ text: `RTG: ${org.rtgPct}%`, color: \'yellow\' }, { text: `RTG Count: ${orgTotalRtg}`, color: \'yellow\' }, { text: `Non-RTG Count: ${orgTotalNonRtg}`, color: \'yellow\' }]}>'

if old_rtg_acc in text:
    text = text.replace(old_rtg_acc, new_rtg_acc)


with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated badges in accordions!")
