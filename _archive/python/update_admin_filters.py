import re

with open('components/pages/AdminLTAPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_filters_regex = r'<div className="la-filters">.*?<button className="la-today-btn" onClick=\{\(\) => \{ setDateFrom\(todayIST\); setDateTo\(todayIST\) \}\}>Today</button>\s*</div>'

new_filters = """<div className="la-filters">
          <div className="la-date-row">
            <input type="date" className="la-date-input" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setDateTo(e.target.value); }} />
          </div>
          <button className="la-today-btn" onClick={() => { setDateFrom(todayIST); setDateTo(todayIST) }}>Today</button>
        </div>"""

match = re.search(old_filters_regex, text, re.DOTALL)
if match:
    text = text.replace(match.group(0), new_filters)
    with open('components/pages/AdminLTAPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced filters block successfully")
else:
    print("Could not find filters block")
