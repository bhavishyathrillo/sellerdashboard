const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = 'apurav.sharma@thrillophilia.com';
  const { data, error } = await supabase.from('srs_june').select('\"L1 Email\", \"L2 Email\", \"Seller Email\"').eq('L1 Email', email);
  console.log(data ? data.length : error);
}
check();
