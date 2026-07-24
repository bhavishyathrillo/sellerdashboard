import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — only initialized on first request, not at module load time.
// This prevents "supabaseUrl is required" errors during Vercel's build phase
// when environment variables are not yet available.
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables')
    }
    _client = createClient(supabaseUrl, supabaseServiceRoleKey)
  }
  return _client
}

// Backwards-compatible proxy — existing code that does `supabase.from(...)` keeps working
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  }
})