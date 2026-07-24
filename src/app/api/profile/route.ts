import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Fetch Profile
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name, mobile_number, avatar_url')
      .eq('email', email)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || { display_name: '', mobile_number: '', avatar_url: '' }
    })
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Update Profile
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, display_name, mobile_number, avatar_url } = body

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        email,
        display_name: display_name || null,
        mobile_number: mobile_number || null,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({ success: true }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=59'
    }
  })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
