const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('information_schema.tables').select('*').limit(10);
  console.log("Error:", error);
  // We can't query information_schema directly through supabase JS client usually unless we use postgres connection string.
}
check();
