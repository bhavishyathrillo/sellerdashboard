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
    const { data: allotmentRes } = await supabase
      .schema('seller_day_to_day')
      .from('daily_allotment_summary')
      .select('seller_email, total_leads_allotted, rtg_leads, non_rtg_leads')
      .eq('allotment_date', queryDate)
      .in('seller_email', emails);
      
    if (allotmentRes) {
      let total = 0;
      allotmentRes.forEach(r => {
        console.log(`${r.seller_email}: ${r.total_leads_allotted} leads (RTG: ${r.rtg_leads}, Non-RTG: ${r.non_rtg_leads})`);
        total += r.total_leads_allotted;
      });
      console.log(`\nTotal Leads for Team: ${total}`);
    }
  }
}
check();
