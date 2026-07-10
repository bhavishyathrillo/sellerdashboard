const fs = require('fs');

const files = [
  'components/pages/L1SellerViewPage.tsx',
  'components/pages/L2SellerViewPage.tsx',
  'components/pages/AdminLTAPage.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace remaining isNotUsed expressions with their falsy values (since we only keep used steps)
  content = content.replace(/\$\{isNotUsed \? '#333' : `\$\{step\.color\}40`\}/g, "${step.color}40");
  content = content.replace(/isNotUsed \? '#555' : step\.color/g, "step.color");
  content = content.replace(/isNotUsed \? '#555' : '#F0EDE8'/g, "'#F0EDE8'");
  
  // also AdminLTAPage might have slightly different ones?
  
  fs.writeFileSync(file, content);
  console.log("Fixed isNotUsed in", file);
});
