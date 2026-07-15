const fs = require('fs');

const l1Path = 'src/features/tl/L1SellerViewPage.tsx';
const l2Path = 'src/features/cm/L2SellerViewPage.tsx';
const sharedUtilsPath = 'src/features/shared/sellerViewUtils.ts';

const l1Lines = fs.readFileSync(l1Path, 'utf8').split('\n');
const l2Lines = fs.readFileSync(l2Path, 'utf8').split('\n');

const l1FnIndex = l1Lines.findIndex(l => l.includes('export default function L1SellerViewPage'));
const l2FnIndex = l2Lines.findIndex(l => l.includes('export default function L2SellerViewPage'));

// The helpers are everything between the imports and the main component.
// Let's find where imports end.
const l1ImportsEnd = l1Lines.findIndex((l, i) => i > 0 && !l.startsWith('import ') && !l.startsWith('//') && l.trim() !== '' && !l.startsWith("'use client'"));
const l2ImportsEnd = l2Lines.findIndex((l, i) => i > 0 && !l.startsWith('import ') && !l.startsWith('//') && l.trim() !== '' && !l.startsWith("'use client'"));

const helpersL1 = l1Lines.slice(l1ImportsEnd, l1FnIndex);

// Save helpers to sharedUtils.ts
// We need to export all functions/interfaces in the helpers.
let utilsContent = helpersL1.join('\n');
utilsContent = utilsContent.replace(/function /g, 'export function ');
utilsContent = utilsContent.replace(/const /g, 'export const ');
utilsContent = utilsContent.replace(/interface /g, 'export interface ');
utilsContent = utilsContent.replace(/type /g, 'export type ');
// Fix exports for internal types if any issues arise, but usually it's fine.

fs.writeFileSync(sharedUtilsPath, utilsContent, 'utf8');

// Now, remove the helpers from L1 and L2, and add the import statement.
const exportedNames = [];
const exportMatches = utilsContent.matchAll(/export (?:function|const|interface|type) (\w+)/g);
for (const match of exportMatches) {
  exportedNames.push(match[1]);
}

const importStmt = `import { ${exportedNames.join(', ')} } from '@/features/shared/sellerViewUtils';\n`;

const newL1Content = l1Lines.slice(0, l1ImportsEnd).join('\n') + '\n' + importStmt + '\n' + l1Lines.slice(l1FnIndex).join('\n');
const newL2Content = l2Lines.slice(0, l2ImportsEnd).join('\n') + '\n' + importStmt + '\n' + l2Lines.slice(l2FnIndex).join('\n');

fs.writeFileSync(l1Path, newL1Content, 'utf8');
fs.writeFileSync(l2Path, newL2Content, 'utf8');

console.log('Successfully extracted ' + helpersL1.length + ' lines of helpers into sellerViewUtils.ts');
