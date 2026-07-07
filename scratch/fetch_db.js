const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.schema('seller_day_to_day').from('daily_allotment_summary')
    .select('*')
    .eq('allotment_date', '2026-06-21')
    .limit(5);
  console.log(data);
}
run();
