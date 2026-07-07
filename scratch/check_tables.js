const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // Or just query a known working table
  console.log("Error:", error);
  
  // Let's just try 'allotment_daily_summary' or similar.
  // Wait, let's query the `daily_lta_log` for the first record and see what columns exist. Maybe allotment is there.
  
  const { data: q1 } = await supabase.from('daily_lta_log').select('*').limit(1);
  console.log(q1);
}
check();
