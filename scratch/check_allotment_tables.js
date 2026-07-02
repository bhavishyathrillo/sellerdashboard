const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = [
    'daily_allotment_summary', 'daily_allotments', 'daily_allotment', 'allotment', 'allotments', 
    'seller_allotment', 'seller_allotments', 'leads', 'lead', 'allotted_leads', 'daily_allotted_leads',
    'rtg_leads', 'non_rtg_leads', 'allotment_summary'
  ];
  let found = [];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`FOUND TABLE: ${t}`);
      found.push(t);
    }
  }
  if (found.length === 0) console.log("None of those tables exist!");
}
check();
