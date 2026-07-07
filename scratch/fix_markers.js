const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx',
  'components/pages/SellerViewPage.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Look for the specific div that renders the stick
  content = content.replace(
    /<div style=\{\{\s*width:\s*'2px',\s*height:\s*'6px',\s*background:\s*color,\s*borderRadius:\s*'1px'\s*\}\}\s*\/>/g,
    '<div style={{ width: \'2px\', height: isTriangle ? \'6px\' : \'28px\', background: color, borderRadius: \'1px\' }} />'
  );
  
  fs.writeFileSync(file, content);
}

console.log('Fixed marker heights!');
