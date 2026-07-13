const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'components/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/'Adjusted for online presence'/g, "'Adjusted for overalloc/underalloc'");
  content = content.replace(/'Late login \/ inactive'/g, "'Overallocation'");
  content = content.replace(/'Hygiene penalty'/g, "'MHE penalty'");
  content = content.replace(/'After hygiene'/g, "'After MHE'");
  content = content.replace(/'Based on mishandled leads'/g, "'Based on MHE'");
  content = content.replace(/'After goal check'/g, "'After Goal Completion'");
  content = content.replace(/'Goal correction'/g, "'Goal completion'");
  fs.writeFileSync(filePath, content);
}
console.log('Fixed labels!');
