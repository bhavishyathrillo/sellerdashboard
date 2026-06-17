import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { emails } = await req.json()
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ roadmaps: [] })
    }

    const { data, error } = await supabase
      .from('roadmap')
      .select('*')
      .in('seller_email', emails)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ roadmaps: data || [] })
  } catch {
    return NextResponse.json({ roadmaps: [] })
  }
}