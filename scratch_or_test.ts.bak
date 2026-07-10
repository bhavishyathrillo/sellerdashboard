import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const emails = ['abdul.basit@thrillophilia.com', 'deepak.khichar@thrillophilia.com']
  const emailFilters = emails.map(e => `seller_email.ilike.${e.split('@')[0].substring(0, 5)}%`).join(',')

  const { data, error } = await supabasePublic
    .from('goal_vs_shb')
    .select('*')
    .or(emailFilters)
    .eq('date', '2026-07-03')
    
  console.log('Result:', data?.length, 'rows')
  console.log(data)
  console.log('Error:', error)
}
run()
