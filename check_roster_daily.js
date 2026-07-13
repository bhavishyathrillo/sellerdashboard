require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('roster_daily_logs')
    .select('*')
    .limit(2);
  
  if (error) { console.log('ERROR:', error.message); return; }
  if (!data || !data.length) { console.log('No rows'); return; }
  
  console.log('COLUMNS:\n' + Object.keys(data[0]).join('\n'));
  console.log('\nSAMPLE ROW:\n' + JSON.stringify(data[0], null, 2));
}
main();
