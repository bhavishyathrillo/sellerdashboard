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

  const month = searchParams.get('month') || 'current'
  const table = month === 'prev' ? 'srs_june' : 'srs_raw'

  try {
    const selectColumns = table === 'srs_june' 
      ? '"Seller Name", "Seller Email", "Actual Achieved (Monthly)", "Bottomline Goal (Monthly)", "% of Goal Achieved", "Haul", "Region", "L1 Name"'
      : 'seller_name, seller_email, actual_achieved_monthly, bottomline_goal_monthly, goal_achieved_percent, haul, region, l1_name'

    let query = supabase
      .from(table)
      .select(selectColumns)
      .gt(table === 'srs_june' ? '"Actual Achieved (Monthly)"' : 'actual_achieved_monthly', 0)
      

    if (haul) query = query.eq(table === 'srs_june' ? '"Haul"' : 'haul', haul)
    if (region) query = query.eq(table === 'srs_june' ? '"Region"' : 'region', region)
    query = query.order(table === 'srs_june' ? '"% of Goal Achieved"' : 'goal_achieved_percent', { ascending: false })

    const { data: rawData, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const data = (rawData || []).map((s: any) => {
      if (table === 'srs_raw') return s
      return {
        seller_name: s['Seller Name'],
        seller_email: s['Seller Email'],
        actual_achieved_monthly: s['Actual Achieved (Monthly)'],
        bottomline_goal_monthly: s['Bottomline Goal (Monthly)'],
        goal_achieved_percent: s['% of Goal Achieved'],
        haul: s['Haul'],
        region: s['Region'],
        l1_name: s['L1 Name']
      }
    })
    return NextResponse.json(data || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}