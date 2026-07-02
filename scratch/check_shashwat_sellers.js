const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('srs_raw').select('seller_name, seller_email, l2_email').ilike('l2_email', '%shashwatj%');
  console.log(data);
}
check();
