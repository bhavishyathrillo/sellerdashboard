const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const table = 'srs_june';
  const selectColumns = '"Seller Name" as seller_name, "Seller Email" as seller_email, "Actual Achieved (Monthly)" as actual_achieved_monthly';
  const { data, error } = await supabase.from(table).select(selectColumns).limit(2);
  console.log(data);
  console.log(error);
}
check();
