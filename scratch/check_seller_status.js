const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: allSellers } = await supabase
    .from('srs_raw')
    .select('*')
    .or(`l1_email.ilike.%shashwat%,l2_email.ilike.%shashwat%`);
    
  if (allSellers?.length > 0) {
    console.log("Sellers status:");
    allSellers.forEach(s => console.log(`${s.seller_email} - ${s.status}`));
  }
}
check();
