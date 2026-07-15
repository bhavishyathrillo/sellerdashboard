const fs = require('fs');

const oldPath = 'src/features/shared/sellerViewUtils.ts';
const newPath = 'src/features/shared/sellerViewUtils.tsx';

let content = fs.readFileSync(oldPath, 'utf8');

// Fix the greedy 'export const ' replacement inside functions
content = content.replace(/  export const /g, '  const ');
content = content.replace(/  export let /g, '  let ');

fs.writeFileSync(newPath, content, 'utf8');
fs.unlinkSync(oldPath); // delete old .ts file

console.log('Fixed sellerViewUtils and renamed to .tsx');
