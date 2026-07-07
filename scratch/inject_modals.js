const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
const teamScript = fs.readFileSync('scratch/inject_l1_team_funnel.py', 'utf8');
const sellerScript = fs.readFileSync('scratch/inject_l1_seller_funnel.py', 'utf8');

const teamMatch = teamScript.match(/new_modal = \"\"\"([\s\S]*?)\"\"\"/);
const sellerMatch = sellerScript.match(/individual_funnel = \"\"\"([\s\S]*?)\"\"\"/);

if(teamMatch && sellerMatch) {
  // Replace the old team funnel modal completely
  const oldTeamFunnelRegex = /\{\/\*\s*Team Funnel Modal\s*\*\/\}.*?showTeamFunnel\s*&&\s*activeFunnelTl.*?\)(?=\s*<\/div>\s*<\/div>\s*\)\})/s;
  
  if (oldTeamFunnelRegex.test(l1)) {
    l1 = l1.replace(oldTeamFunnelRegex, teamMatch[1] + '\n' + sellerMatch[1] + '\n');
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
    console.log('Replaced old Team Funnel Modal with new 3D Team and Individual Funnel Modals.');
  } else {
    // Just inject at the end
    l1 = l1.replace(/(<\/div>\s*)\}\s*$/, teamMatch[1] + '\n' + sellerMatch[1] + '\n$1}\n');
    fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
    console.log('Injected both modals at the end.');
  }
} else {
  console.log('Failed to extract modals.');
}
