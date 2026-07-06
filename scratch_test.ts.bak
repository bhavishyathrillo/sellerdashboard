import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const email = 'abdul.basit@thrillophilia.com'
  const date = '2026-07-03'

  const q = supabasePublic
    .from('goal_vs_shb')
    .select('*')
    .ilike('seller_email', `${email.split('@')[0].substring(0, 5)}%`)
    .eq('date', date)
    .limit(1)
    .maybeSingle()
    
  console.log("Querying for email prefix:", `${email.split('@')[0].substring(0, 5)}%`, "and date:", date)
  
  const { data, error } = await q
  console.log('Result:', data, error)
}
run()
