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
    
  if (allSellers?.length > 0) {
    const emails = allSellers.map(s => s.seller_email);
    const { data: ltaData } = await supabase.from('daily_lta_log').select('*').eq('log_date', queryDate).in('seller_email', emails);
    console.log("daily_lta_log data:", ltaData?.map(d => ({ email: d.seller_email, leads_actual: d.leads_actual })));
  }
}
check();
