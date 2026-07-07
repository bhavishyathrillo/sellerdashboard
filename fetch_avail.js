require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'seller_day_to_day' } });
s.from('seller_availability').select('*').limit(1).then(r => console.log(r.data)).catch(console.error);
