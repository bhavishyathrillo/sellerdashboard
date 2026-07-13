require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: all } = await supabase.from('srs_raw').select('l1_name, l1_email');
  
  const l1s = new Set();
  all.forEach(s => {
    l1s.add(`${s.l1_name} | ${s.l1_email}`);
  });
  
  console.log(Array.from(l1s).sort().filter(s => s.toLowerCase().includes('apurav') || s.toLowerCase().includes('apurv')));
}

check().catch(console.error);
