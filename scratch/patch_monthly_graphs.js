const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx'
];

files.forEach(path => {
  let code = fs.readFileSync(path, 'utf8');

  // Replace the TeamBreakdownGraphs function with the corrected one
  const startIdx = code.indexOf('function TeamBreakdownGraphs');
  if (startIdx === -1) {
    console.log('Not found in', path);
    return;
  }
  // Find the end of the function. It ends with:
  //   );
  // }
  // And the next line might be the end of file.
  // We can just replace from `function TeamBreakdownGraphs` to the end of the file since it was appended at the end.
  const endIdx = code.indexOf('}\n', code.indexOf('return (\n', startIdx));
  
  // Actually it's safer to use a regex or string replacement for the exact aggregation block:
  /*
      if (m.allotment) {
        aVal += (m.allotment.auto_allotted || 0);
        mVal += (m.allotment.manual_allotted || 0);
        rVal += (m.allotment.rtg_leads || 0);
        nrVal += (m.allotment.non_rtg_leads || 0);
        pVals[0] += (m.allotment.pax_1 || 0);
        pVals[1] += (m.allotment.pax_2 || 0);
        pVals[2] += (m.allotment.pax_3 || 0);
        pVals[3] += (m.allotment.pax_4 || 0);
        pVals[4] += (m.allotment.pax_4_plus || 0);
      }
  */
  const oldAgg = `      if (m.allotment) {
        aVal += (m.allotment.auto_allotted || 0);
        mVal += (m.allotment.manual_allotted || 0);
        rVal += (m.allotment.rtg_leads || 0);
        nrVal += (m.allotment.non_rtg_leads || 0);
        pVals[0] += (m.allotment.pax_1 || 0);
        pVals[1] += (m.allotment.pax_2 || 0);
        pVals[2] += (m.allotment.pax_3 || 0);
        pVals[3] += (m.allotment.pax_4 || 0);
        pVals[4] += (m.allotment.pax_4_plus || 0);
      }`;
      
  const newAgg = `      (m.monthly_rows || []).forEach((row: any) => {
        aVal += (row.auto_allotted || 0);
        mVal += (row.manual_allotted || 0);
        rVal += (row.rtg_leads || 0);
        nrVal += (row.non_rtg_leads || 0);
        pVals[0] += (row.pax_1 || 0);
        pVals[1] += (row.pax_2 || 0);
        pVals[2] += (row.pax_3 || 0);
        pVals[3] += (row.pax_4 || 0);
        pVals[4] += (row.pax_4_plus || 0);
      });`;

  if (code.includes(oldAgg)) {
    code = code.replace(oldAgg, newAgg);
  }

  // Also replace the title: "Team Breakdown" -> "Monthly Breakdown"
  // And the date text: 
  // `{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}`
  // to:
  // `{date ? new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'All Time'}`
  
  code = code.replace(
    `<h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Team Breakdown</h2>`,
    `<h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#F0EDE8', margin: 0 }}>Monthly Breakdown</h2>`
  );
  
  code = code.replace(
    `{date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}`,
    `{date ? new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'All Time'}`
  );

  fs.writeFileSync(path, code);
  console.log('Fixed aggregation and titles in', path);
});
