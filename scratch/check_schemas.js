const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const schemas = ['seller day to day', 'seller_day_to_day'];
  for (const s of schemas) {
    const { data, error } = await supabase.schema(s).from('daily_allotment_summary').select('*').limit(1);
    if (error) {
      console.log(`Error for schema '${s}':`, error.message);
    } else {
      console.log(`Success for schema '${s}'! Data:`, data);
    }
  }
}
check();
