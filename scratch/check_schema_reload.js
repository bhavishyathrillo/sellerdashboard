const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Reload schema cache
  const { data: r1, error: e1 } = await supabase.rpc('reload_schema');
  console.log("reload1:", e1?.message);
  
  // Try querying daily_allotment_summary again
  const { data, error } = await supabase.from('daily_allotment_summary').select('*').limit(1);
  if (error) {
    console.error("daily_allotment_summary ERROR:", error.message);
  } else {
    console.log("daily_allotment_summary exists now!", data);
  }
}
check();
