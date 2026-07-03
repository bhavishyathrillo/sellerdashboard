const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');

l1 = l1.replace(
    /const noLeadsSellers = g\.members\.filter\(\(m: any\) => !m\.isAbsent && !m\.isOnBreak && \(m\.allotment\?\.rtg_leads \|\| 0\) \+ \(m\.allotment\?\.non_rtg_leads \|\| 0\) === 0\);/g,
    'const noLeadsSellers = g.members.filter((m: any) => ((m.allotment?.rtg_leads || 0) + (m.allotment?.non_rtg_leads || 0)) === 0);'
);

let startIdx = l1.indexOf("onClick={() => setBreakdownDrillSeller(m)}");
if (startIdx !== -1) {
    let blockStart = l1.lastIndexOf("<tr", startIdx);
    let blockEnd = l1.indexOf("</tr>", startIdx) + 5;
    let oldBlock = l1.substring(blockStart, blockEnd);
    let newBlock = oldBlock.replace(/m\.isAbsent \? '—' : /g, '').replace(/ \{m\.isAbsent && <span className=\{styles\.absentPill\}>Absent<\/span>\}/g, '');
    l1 = l1.substring(0, blockStart) + newBlock + l1.substring(blockEnd);
}

fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
