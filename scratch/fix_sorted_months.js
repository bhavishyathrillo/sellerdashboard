const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

l1 = l1.replace(
    /\{sortedMonths\.map\(mo => \(\s*<td key=\{mo\}>\{m\.isAbsent \? '—' : \(sellerDot\[mo\] \|\| 0\)\}<\/td>\s*\)\)\}/,
    `{dotMonthsConfig.map(mo => (
        <td key={mo.key}>{getVal(mo.key)}</td>
    ))}
    <td>{Object.entries(sellerDot).reduce((sum, [k,v]) => {
         if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
         return sum;
    }, 0)}</td>`
);

l1 = l1.replace(
    /const sellerDot: Record<string, number> = \{\}\s*;\(m\.dot_rows \|\| \[\]\)\.forEach\(\(d: any\) => \{\s*sellerDot\[d\.dot_month \|\| 'Unknown'\] = \(sellerDot\[d\.dot_month \|\| 'Unknown'\] \|\| 0\) \+ \(d\.total_leads_allotted \|\| 0\)\s*\}\)\s*return \(/,
    `const sellerDot: Record<string, number> = {}
    ;(m.dot_rows || []).forEach((d: any) => {
        sellerDot[d.dot_month || 'Unknown'] = (sellerDot[d.dot_month || 'Unknown'] || 0) + (d.total_leads_allotted || 0)
    })
    const getVal = (keyStr: string) => {
        let v = 0; Object.entries(sellerDot).forEach(([k,val])=> { if(k.endsWith('-'+keyStr)) v+=val; }); return v;
    }
    return (`
);


fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
