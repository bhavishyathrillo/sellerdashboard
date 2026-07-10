require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.schema('seller_day_to_day').from('mhl_daily').select('available_today').limit(5).then(({data}) => console.log(data));
