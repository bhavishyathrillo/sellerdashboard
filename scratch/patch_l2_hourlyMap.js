const fs = require('fs');

let l2code = fs.readFileSync('components/pages/L2SellerViewPage.tsx', 'utf8');
const l2Target = `const noLeadsCount = noLeadsSellers.length`;
const l2MapCode = `
  const hourlyMap = (() => {
    const map = {}
    enrichedMembers.forEach((m) => {
      (m.hourly_allotment_summary || []).forEach((h) => {
        let bucket = h.hour_bucket?.toString()?.toUpperCase() || ''
        if (bucket.includes(':')) {
          const parts = extractTimeParts(bucket)
          if (parts) {
            const ampm = parts.h >= 12 ? 'PM' : 'AM'
            let h12 = parts.h % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        } else {
          const match = bucket.match(/^(\\d+)/)
          if (match) {
            const hr = parseInt(match[1], 10)
            const ampm = hr >= 12 ? 'PM' : 'AM'
            let h12 = hr % 12
            if (h12 === 0) h12 = 12
            bucket = \`\${h12}\${ampm}\`
          }
        }
        const numLeads = (h.auto_allotted || 0) + (h.manual_allotted || 0)
        map[bucket] = (map[bucket] || 0) + numLeads
      })
    })
    return map
  })()`;

if (l2code.includes(l2Target) && !l2code.includes('const hourlyMap = (() => {')) {
  l2code = l2code.replace(l2Target, l2Target + '\n' + l2MapCode);
  fs.writeFileSync('components/pages/L2SellerViewPage.tsx', l2code);
}
