const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('daily_lta_log')
    .select('seller_email, lead_goal, wd, final_lta, real_dynamic_lta, hygiene_revised_lta, revised_lta, mishandled_pct, mishandled_enquiries')
    .eq('log_date', '2026-07-01')
    .limit(5);
  console.log({data, error});
}
main();
