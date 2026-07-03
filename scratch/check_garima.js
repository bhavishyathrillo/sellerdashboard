const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: raw } = await supabase.from('srs_raw').select('seller_name, goal_achieved_percent').ilike('seller_name', '%Garima%');
  const { data: june } = await supabase.from('srs_june').select('"Seller Name", "% of Goal Achieved"').ilike('"Seller Name"', '%Garima%');
  console.log('srs_raw:', raw);
  console.log('srs_june:', june);
}
check();
