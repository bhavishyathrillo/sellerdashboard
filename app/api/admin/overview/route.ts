import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: allRows, error } = await supabase.from('srs_raw').select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!allRows || allRows.length === 0) {
      return NextResponse.json({ l1_data: [], message: 'No data in srs_raw' })
    }

    const l1Map = new Map<string, string>()
    allRows.forEach((row: any) => {
      const email = row.l1_email
      const name = row.l1_name
      if (email && email.trim().length > 0) {
        const key = email.toLowerCase().trim()
        if (!l1Map.has(key)) {
          l1Map.set(key, name || key.split('@')[0])
        }
      }
    })

    const l1Data: any[] = []
    
    for (const [l1Email, l1Name] of l1Map.entries()) {
      const sellers = allRows.filter(
        (s: any) => s.l1_email?.toLowerCase().trim() === l1Email
      )

      const team = sellers.filter(
        (s: any) => s.seller_email?.toLowerCase().trim() !== l1Email
      )

      const totalGoal = team.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
      const totalAch = team.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
      const totalShb = team.reduce((s: number, r: any) => s + (r.should_have_been_monthly || 0), 0)
      const pct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0

      const l2Emails = [...new Set(team.map((s: any) => s.l2_email).filter(Boolean))]
      
      const l2Groups = l2Emails.map((l2Email: string) => {
        const key = l2Email.toLowerCase().trim()
        const l2 = allRows.find((r: any) => r.seller_email?.toLowerCase().trim() === key) || {}
        const l2Sellers = team.filter(
          (s: any) => s.l2_email?.toLowerCase().trim() === key && s.seller_email?.toLowerCase().trim() !== key
        )

        return {
          l2_name: l2.seller_name || l2Email.split('@')[0],
          l2_email: l2Email,
          l2_goal: l2.bottomline_goal_monthly || 0,
          l2_achieved: l2.actual_achieved_monthly || 0,
          l2_pct: (l2.bottomline_goal_monthly || 0) > 0 ? ((l2.actual_achieved_monthly || 0) / l2.bottomline_goal_monthly) * 100 : 0,
          seller_count: l2Sellers.length,
          sellers: l2Sellers.map((s: any) => ({
            seller_name: s.seller_name,
            seller_email: s.seller_email,
            goal: s.bottomline_goal_monthly || 0,
            achieved: s.actual_achieved_monthly || 0,
            shb: s.should_have_been_monthly || 0,
            pct: s.goal_achieved_percent || 0,
            flag: s.current_seller_flag || '',
            region: s.region || '',
            haul: s.haul || '',
            defined_goal: s.defined_goal || '',  // <-- ADDED
          }))
        }
      })

      l1Data.push({
        l1_email: l1Email,
        l1_name: l1Name,
        total_sellers: team.length,
        total_goal: totalGoal,
        total_achieved: totalAch,
        total_shb: totalShb,
        pct: pct,
        l2_groups: l2Groups
      })
    }

    return NextResponse.json({ l1_data: l1Data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}