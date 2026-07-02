const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = 'apurav.sharma@thrillophilia.com';
  const { data, error } = await supabase.from('srs_raw').select('l1_email').eq('l1_email', email);
  console.log(data ? data.length : error);
}
check();
