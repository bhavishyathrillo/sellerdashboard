const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller/[persona]';
const targets = ['efficiency/route.ts', 'rewards/route.ts', 'roadmap/route.ts'];

for (const t of targets) {
  const p = path.join(base, t);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = content.replace(/const supabase = createClient\(\s+/g, 'const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)\n\n');
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Fixed supabase init');
