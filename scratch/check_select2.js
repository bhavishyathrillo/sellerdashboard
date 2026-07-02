const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const table = 'srs_june';
  const selectColumns = 'Seller Name, Seller Email, Actual Achieved (Monthly), Bottomline Goal (Monthly), % of Goal Achieved, Haul, Region, L1 Name';
  const { data, error } = await supabase.from(table).select(selectColumns).limit(2);
  console.log(error);
}
check();
