import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: allRows, error } = await supabase.from('srs_raw').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!allRows || allRows.length === 0) return NextResponse.json({ l1_data: [] })

    // Build unique L1 map
    const l1Map = new Map<string, string>()
    allRows.forEach((row: any) => {
      const email = row.l1_email?.toLowerCase().trim()
      if (email && !l1Map.has(email)) l1Map.set(email, row.l1_name || email.split('@')[0])
    })

    const l1Data: any[] = []
    for (const [l1Email, l1Name] of l1Map.entries()) {
      const sellers = allRows.filter((s: any) => s.l1_email?.toLowerCase().trim() === l1Email)
      const team = sellers;
      const totalGoal = team.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
      const totalAch = team.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
      const totalShb = team.reduce((s: number, r: any) => s + (r.should_have_been_monthly || 0), 0)
      const pct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0
      const avgReq = team.length > 0 ? team.reduce((s: number, r: any) => s + (r.required_daily_monthly || 0), 0) / team.length : 0

      // L2 groups
      const l2Emails = [...new Set(team.map((s: any) => s.l2_email).filter(Boolean))]
      const l2Groups = l2Emails.map((l2Email: string) => {
        const key = l2Email.toLowerCase().trim()
        const l2 = allRows.find((r: any) => r.seller_email?.toLowerCase().trim() === key) || {}
        const l2Sellers = team.filter((s: any) => s.l2_email?.toLowerCase().trim() === key)
        const l2Goal = l2.bottomline_goal_monthly || 0
        const l2Ach = l2.actual_achieved_monthly || 0
        const l2Shb = l2.should_have_been_monthly || 0
        const l2Pct = l2Goal > 0 ? (l2Ach / l2Goal) * 100 : 0
        return {
          l2_name: l2Sellers[0]?.l2_name || l2.seller_name || l2Email.split('@')[0], l2_email: l2Email,
          goal: l2Goal, achieved: l2Ach, shb: l2Shb, pct: l2Pct,
          seller_count: l2Sellers.length,
          sellers: l2Sellers.map((s: any) => ({
            seller_name: s.seller_name, seller_email: s.seller_email,
            goal: s.bottomline_goal_monthly || 0, achieved: s.actual_achieved_monthly || 0,
            shb: s.should_have_been_monthly || 0, pct: s.goal_achieved_percent || 0,
            flag: s.current_seller_flag || '', region: s.region || '', haul: s.haul || '',
            week_1_goal: s.week_1_goal || 0, week_1_achieved: s.week_1_achieved || 0,
            week_2_goal: s.week_2_goal || 0, week_2_achieved: s.week_2_achieved || 0,
            week_3_goal: s.week_3_goal || 0, week_3_achieved: s.week_3_achieved || 0,
            week_4_goal: s.week_4_goal || 0, week_4_achieved: s.week_4_achieved || 0,
          }))
        }
      })

      l1Data.push({
        l1_name: l1Name, l1_email: l1Email,
        goal: totalGoal, achieved: totalAch, shb: totalShb, pct, required_daily: avgReq,
        seller_count: team.length, l2_count: l2Groups.length,
        week_1_goal: team.reduce((s,r)=>s+(r.week_1_goal||0),0), week_1_achieved: team.reduce((s,r)=>s+(r.week_1_achieved||0),0),
        week_2_goal: team.reduce((s,r)=>s+(r.week_2_goal||0),0), week_2_achieved: team.reduce((s,r)=>s+(r.week_2_achieved||0),0),
        week_3_goal: team.reduce((s,r)=>s+(r.week_3_goal||0),0), week_3_achieved: team.reduce((s,r)=>s+(r.week_3_achieved||0),0),
        week_4_goal: team.reduce((s,r)=>s+(r.week_4_goal||0),0), week_4_achieved: team.reduce((s,r)=>s+(r.week_4_achieved||0),0),
        l2_groups: l2Groups
      })
    }

    return NextResponse.json({ l1_data: l1Data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}