require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  // Check daily_lta_log columns (for MHE %)
  const { data: lta, error: ltaErr } = await sb.from('daily_lta_log').select('*').limit(1)
  if (ltaErr) console.log('daily_lta_log error:', ltaErr.message)
  else console.log('daily_lta_log columns:', Object.keys(lta[0] || {}))

  // Check daily_allotment_summary columns (for median_creation_to_allotment_mins)
  const { data: allot, error: allotErr } = await sb.schema('seller_day_to_day').from('daily_allotment_summary').select('*').limit(1)
  if (allotErr) console.log('daily_allotment_summary error:', allotErr.message)
  else console.log('daily_allotment_summary columns:', Object.keys(allot[0] || {}))

  // Check seller_dot_distribution columns
  const { data: dot, error: dotErr } = await sb.schema('seller_day_to_day').from('seller_dot_distribution').select('*').limit(1)
  if (dotErr) console.log('seller_dot_distribution error:', dotErr.message)
  else console.log('seller_dot_distribution columns:', Object.keys(dot[0] || {}))
}
main()
