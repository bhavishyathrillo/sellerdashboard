const fs = require('fs');
let code = fs.readFileSync('components/pages/AdminLTAPage.tsx', 'utf8');

code = code.replace(
  /const goalPct = typeof r\.goal_completion === 'number' \? r\.goal_completion \* 100 : 0\n\s*const shbPct = typeof r\.shb_percent === 'number' \? r\.shb_percent \* 100 : 0/,
  `let goalPct = typeof r.goal_completion === 'number' ? r.goal_completion * 100 : 0
                    let shbPct = typeof r.shb_percent === 'number' ? r.shb_percent * 100 : 0
                    if (d.endsWith('-01') || d.endsWith('-02')) { goalPct = 0; shbPct = 0; }`
);

code = code.replace(
  /cGoalSum \+= \(r\.goal_completion \|\| 0\) \* 100\n\s*cShbSum \+= \(r\.shb_percent \|\| 0\) \* 100/g,
  `const isZero = r.date && (r.date.endsWith('-01') || r.date.endsWith('-02'));
                                    cGoalSum += isZero ? 0 : (r.goal_completion || 0) * 100
                                    cShbSum += isZero ? 0 : (r.shb_percent || 0) * 100`
);

code = code.replace(
  /tGoalSum \+= \(r\.goal_completion \|\| 0\) \* 100\n\s*tShbSum \+= \(r\.shb_percent \|\| 0\) \* 100/g,
  `const isZero = r.date && (r.date.endsWith('-01') || r.date.endsWith('-02'));
                                          tGoalSum += isZero ? 0 : (r.goal_completion || 0) * 100
                                          tShbSum += isZero ? 0 : (r.shb_percent || 0) * 100`
);

code = code.replace(
  /mGoalSum \+= \(r\.goal_completion \|\| 0\) \* 100\n\s*mShbSum \+= \(r\.shb_percent \|\| 0\) \* 100/g,
  `const isZero = r.date && (r.date.endsWith('-01') || r.date.endsWith('-02'));
                                              mGoalSum += isZero ? 0 : (r.goal_completion || 0) * 100
                                              mShbSum += isZero ? 0 : (r.shb_percent || 0) * 100`
);

fs.writeFileSync('components/pages/AdminLTAPage.tsx', code);
console.log('Zero logic applied!');
