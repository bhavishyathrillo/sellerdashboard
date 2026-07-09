require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const {count, error} = await supabase.schema('seller_day_to_day').from('mhl_daily').select('*', {count: 'exact', head: true});
  console.log('Count:', count, error);
}
run();
