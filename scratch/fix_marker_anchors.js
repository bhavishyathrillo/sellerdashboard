const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx',
  'components/pages/SellerViewPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(
    /position: 'absolute', left: `\$\{percent\}%`, top: 0, transform: 'translate\(-50%, -100%\)'/g,
    'position: \'absolute\', left: `${percent}%`, bottom: \'100%\', transform: \'translateX(-50%)\''
  );
  
  fs.writeFileSync(file, content);
}

console.log('Fixed marker anchoring!');
