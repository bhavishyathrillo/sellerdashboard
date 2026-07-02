const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const queryDate = '2026-07-02';
  
  // Get all sellers under shashwat
  const { data: allSellers } = await supabase
    .from('srs_raw')
    .select('*')
    .or(`l1_email.ilike.%shashwat%,l2_email.ilike.%shashwat%`);
    
  console.log("Total sellers:", allSellers?.length);
  
  if (allSellers?.length > 0) {
    const emails = allSellers.map(s => s.seller_email);
    const { data: allotmentRes, error } = await supabase.from('daily_allotment_summary').select('*').eq('allotment_date', queryDate).in('seller_email', emails);
    console.log("Allotment data:", allotmentRes);
    if (error) console.error("Error:", error);
  }
}
check();
