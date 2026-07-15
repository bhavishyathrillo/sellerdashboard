const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller/[persona]';
const targets = ['efficiency/route.ts', 'rewards/route.ts', 'roadmap/route.ts'];

for (const t of targets) {
  const p = path.join(base, t);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // Remove the garbage leftovers that look like:
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!
    // )
    content = content.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL!,[\s\S]*?SUPABASE_SERVICE_ROLE_KEY![\s\S]*?\)/g, '');
    
    // BUT we need exactly ONE createClient initialization at the top!
    // So let's make sure it exists.
    if (!content.includes('const supabase = createClient(')) {
       content = content.replace('import { NextResponse } from \'next/server\'', "import { NextResponse } from 'next/server'\n\nconst supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)");
    }
    
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Cleaned up garbage correctly');
