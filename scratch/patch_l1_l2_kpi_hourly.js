const fs = require('fs');

let l1code = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
const l1Target = `const globalNoLeads = processedGroups.reduce((sum: number, g: any) => sum + g.agg.noLeadsCount, 0)`;
const l1MapCode = `
  const hourlyMap = useMemo(() => {
    const map = {}
    allMembers.forEach((m) => {
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
  }, [allMembers])`;
if (l1code.includes(l1Target) && !l1code.includes('const hourlyMap = useMemo(() => {')) {
  l1code = l1code.replace(l1Target, l1Target + '\n' + l1MapCode);
  fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1code);
}

let l2code = fs.readFileSync('components/pages/L2SellerViewPage.tsx', 'utf8');
const l2Target = `const noLeadsCount = enrichedMembers.filter((m: any) => m.hasRtg && !m.isOnLeave && m.seller_leads === 0).length`;
const l2MapCode = `
  const hourlyMap = useMemo(() => {
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
  }, [enrichedMembers])`;
if (l2code.includes(l2Target) && !l2code.includes('const hourlyMap = useMemo(() => {')) {
  l2code = l2code.replace(l2Target, l2Target + '\n' + l2MapCode);
  fs.writeFileSync('components/pages/L2SellerViewPage.tsx', l2code);
}
