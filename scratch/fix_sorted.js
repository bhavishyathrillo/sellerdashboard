const fs = require('fs');
let l = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

l = l.replace(/\{sortedMonths\.map\(mo => \([\s\n]*<td key=\{mo\}>\{m\.isAbsent \? '—' : \(sellerDot\[mo\] \|\| 0\)\}<\/td>[\s\n]*\)\)\}/g, 
`{dotMonthsConfig.map(mo => (
  <td key={mo.key}>{m.isAbsent ? '—' : (function(){
    let v = 0; Object.entries(sellerDot).forEach(([k,val])=> { if(k.endsWith('-'+mo.key)) v+=val; }); return v;
  })()}</td>
))}
<td>{m.isAbsent ? '—' : Object.entries(sellerDot).reduce((sum, [k,v]) => {
  if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
  return sum;
}, 0)}</td>`
);

l = l.replace(/\{sortedMonths\.map\(mo => \([\s\n]*<td key=\{mo\} style=\{\{ color: '#F4631E', fontWeight: 600 \}\}>\{g\.agg\.dotMap\[mo\] \|\| 0\}<\/td>[\s\n]*\)\)\}/g,
`{dotMonthsConfig.map(mo => {
  let v = 0; Object.entries(g.agg.dotMap).forEach(([k,val])=> { if(k.endsWith('-'+mo.key)) v+=val; });
  return <td key={mo.key} style={{ color: '#F4631E', fontWeight: 600 }}>{v}</td>
})}
<td style={{ color: '#F4631E', fontWeight: 600 }}>
  {Object.entries(g.agg.dotMap).reduce((sum, [k,v]) => {
       if(!dotMonthsConfig.some(mo => k.endsWith('-'+mo.key))) sum+=v;
       return sum;
  }, 0)}
</td>`
);

l = l.replace(/\{sortedMonths\.map\(mo => <th key=\{mo\}>\{mo\}<\/th>\)\}/g,
`{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}
<th>6+ Months</th>`
);

l = l.replace(/\{\(\(\) => \{[\s\n]*const allMonths = new Set<string>\(\)[\s\n]*processedGroups\.forEach\(\(g: any\) => Object\.keys\(g\.agg\.dotMap\)\.forEach\(k => allMonths\.add\(k\)\)\)[\s\n]*return Array\.from\(allMonths\)\.sort\(\)\.map\(m => <th key=\{m\}>\{m\}<\/th>\)[\s\n]*\}\)\(\)\}/g,
`{dotMonthsConfig.map(mo => <th key={mo.key}>{mo.label}</th>)}
<th>6+ Months</th>`
);

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l);
console.log('Fixed sortedMonths.');
