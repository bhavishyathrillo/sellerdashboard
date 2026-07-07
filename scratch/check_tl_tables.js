const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking allotment...");
  let { error: err1, data: data1 } = await supabase.from('allotment').select('*').limit(1);
  if (err1) console.error("allotment error:", err1.message);
  else console.log("allotment rows:", data1?.length);

  console.log("Checking attendance...");
  let { error: err2, data: data2 } = await supabase.from('attendance').select('*').limit(1);
  if (err2) console.error("attendance error:", err2.message);
  else console.log("attendance rows:", data2?.length);

  console.log("Checking cti...");
  let { error: err3, data: data3 } = await supabase.from('cti').select('*').limit(1);
  if (err3) console.error("cti error:", err3.message);
  else console.log("cti rows:", data3?.length);
  
  console.log("Checking seller_hourly_allotment...");
  let { error: err4, data: data4 } = await supabase.from('seller_hourly_allotment').select('*').limit(1);
  if (err4) console.error("seller_hourly_allotment error:", err4.message);
  else console.log("seller_hourly_allotment rows:", data4?.length);
}
check();
