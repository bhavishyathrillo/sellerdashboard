const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = ['seller_attendance', 'seller_cti_availability'];
  for (const t of tables) {
    const { data, error } = await supabase.schema('seller_day_to_day').from(t).select('*').limit(1);
    if (error) {
      console.log(`Error for '${t}':`, error.message);
    } else {
      console.log(`Success for '${t}'! Data:`, data);
    }
  }
}
check();
