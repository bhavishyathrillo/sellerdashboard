const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('srs_raw').select('seller_name, defined_goal, bottomline_goal_monthly, final_earnings_on_tl').ilike('seller_name', '%Shashwat%');
  console.log(data);
}
check();
