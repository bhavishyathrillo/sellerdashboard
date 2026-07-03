const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('srs_raw').select('seller_name, defined_goal, actual_achieved_monthly');
  let top = 0;
  let bot = 0;
  let other = 0;
  let missing = [];
  data.forEach(r => {
    const goal = (r.defined_goal || '').toLowerCase();
    if (goal.includes('topline')) { top += r.actual_achieved_monthly || 0; }
    else if (goal.includes('bottomline')) { bot += r.actual_achieved_monthly || 0; }
    else { 
      other += r.actual_achieved_monthly || 0; 
      missing.push(r);
    }
  });
  console.log({top, bot, other, missing});
}
check();
