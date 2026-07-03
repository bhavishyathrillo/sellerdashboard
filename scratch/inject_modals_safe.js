const fs = require('fs');
let l1 = fs.readFileSync('components/pages/L1SellerViewPage.tsx', 'utf8');
const teamScript = fs.readFileSync('scratch/inject_l1_team_funnel.py', 'utf8');
const sellerScript = fs.readFileSync('scratch/inject_l1_seller_funnel.py', 'utf8');
const teamMatch = teamScript.match(/new_modal = \"\"\"([\s\S]*?)\"\"\"/);
const sellerMatch = sellerScript.match(/individual_funnel = \"\"\"([\s\S]*?)\"\"\"/);

if(teamMatch && sellerMatch) {
    const splitIndex = l1.lastIndexOf('</div>');
    if (splitIndex > -1) {
        l1 = l1.substring(0, splitIndex) + '\n' + teamMatch[1] + '\n' + sellerMatch[1] + '\n' + l1.substring(splitIndex);
        fs.writeFileSync('components/pages/L1SellerViewPage.tsx', l1);
        console.log('Successfully injected both modals');
    }
} else {
    console.log("Could not find match in python strings");
}
