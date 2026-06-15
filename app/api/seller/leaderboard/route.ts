import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const haul = searchParams.get('haul') || ''
  const region = searchParams.get('region') || ''

  try {
    let query = supabase
      .from('srs_raw')
      .select('seller_name, seller_email, actual_achieved_monthly, bottomline_goal_monthly, goal_achieved_percent, haul, region, l1_name')
      .gt('actual_achieved_monthly', 0)

    if (haul) query = query.eq('haul', haul)
    if (region) query = query.eq('region', region)
    
    query = query.order('goal_achieved_percent', { ascending: false })

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}