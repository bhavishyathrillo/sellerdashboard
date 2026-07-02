const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('daily_allotment').select('*').limit(1);
  if (error) {
    console.error("daily_allotment ERROR:", error.message);
  } else {
    console.log("daily_allotment exists!", data);
  }
}
check();
