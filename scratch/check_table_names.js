const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = [
    'daily_allotment_summary', 'allotment', 'seller_allotment', 
    'allotment_summary', 'daily_lta_log', 'seller_attendance', 'attendance', 'seller_cti_availability'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`${t}: ERROR - ${error.message}`);
    } else {
      console.log(`${t}: SUCCESS - ${data.length} rows`);
    }
  }
}
check();
