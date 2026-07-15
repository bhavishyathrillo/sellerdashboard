import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Provide a singleton instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)