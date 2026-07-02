const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = 'apuravs@thrillophilia.com';
  const { data, error } = await supabase.from('srs_june').select('*').eq('L1 Email', email);
  console.log('Using L1 Email:', data ? data.length : error);
  
  const { data: d2, error: e2 } = await supabase.from('srs_june').select('*').eq('\"L1 Email\"', email);
  console.log('Using \"L1 Email\":', d2 ? d2.length : e2);
}
check();
