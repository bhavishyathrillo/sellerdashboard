import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req?: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email, display_name, avatar_url')
      .not('avatar_url', 'is', null)
      .not('avatar_url', 'eq', '')

    if (error) throw error

    // Create a dictionary mapping email -> avatar_url
    // We also map lowercase name as a fallback
    const avatarMap: Record<string, string> = {}
    
    if (data) {
      data.forEach(user => {
        if (user.email) {
          avatarMap[user.email.toLowerCase()] = user.avatar_url
        }
        if (user.display_name) {
          avatarMap[user.display_name.toLowerCase().trim()] = user.avatar_url
        }
      })
    }

    return NextResponse.json(avatarMap)
  } catch (error: any) {
    console.error('Error fetching avatars:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
