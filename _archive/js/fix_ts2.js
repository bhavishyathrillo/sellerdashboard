const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller/[persona]';
const targets = ['efficiency/route.ts', 'rewards/route.ts', 'roadmap/route.ts'];

for (const t of targets) {
  const p = path.join(base, t);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    
    // Remove the conflicting import
    content = content.replace(/import\s*\{\s*supabase\s*\}\s*from\s*['"]@\/lib\/supabase['"];?\n?/g, '');
    
    // In roadmap, handleCm is missing. It looks like team-roadmap extraction failed.
    // Let's remove the cm branch from the router in roadmap.
    if (t === 'roadmap/route.ts') {
      content = content.replace(/if \(p === 'cm'\) return handleCm\(req\);\n?/g, '');
    }
    
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Fixed TS issues part 2');
