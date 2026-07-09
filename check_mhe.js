require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const {data: r} = await supabase.from('roster').select('mhe_actual, mishandled_count, total_lead_instances').ilike('email', '%barnava%');
  console.log('Roster:', r);
  const {data: m} = await supabase.schema('seller_day_to_day').from('mhl_daily').select('activity_date, available_today, mishandled_count, open_leads_count').ilike('seller_email', '%barnava%').order('activity_date');
  console.log('Daily:', m);
}
run();
