const fs = require('fs');
const path = require('path');

const base = 'src/app/api/seller/[persona]';
const targets = ['efficiency/route.ts', 'rewards/route.ts', 'roadmap/route.ts'];

for (const t of targets) {
  const p = path.join(base, t);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    
    // Fix the params typing for Next.js 15
    content = content.replace(/\{ params \}: \{ params: \{ persona: string \} \}/g, '{ params }: { params: Promise<{ persona: string }> }');
    
    // Fix duplicate supabase import if any
    // Some endpoints might have: import { supabase } from '@/lib/supabase'
    // and also we inject: const supabase = createClient(...)
    // Let's remove the imported supabase
    content = content.replace(/import\s*\{\s*supabase\s*\}\s*from\s*['"]@\/lib\/supabaseClient['"];?\n?/g, '');
    
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('Fixed TS issues');
