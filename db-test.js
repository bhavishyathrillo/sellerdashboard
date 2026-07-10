require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data } = await supabase.from('srs_raw').select('seller_email, l1_email, l2_email').or('l1_email.ilike.%aman%,l2_email.ilike.%aman%');
  console.log("Aman's SRS data:", data);
}
test();
