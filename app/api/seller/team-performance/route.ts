import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const role = searchParams.get('role')

  if (!email || !role) return NextResponse.json({ error: 'Email and role required' }, { status: 400 })

  try {
    if (role === 'L2') {
      const { data: sellers } = await supabase
        .from('srs_raw')
        .select('*')
        .eq('l2_email', email.toLowerCase().trim())
        .order('goal_achieved_percent', { ascending: false })

      // Filter out manager's own data
      const teamSellers = (sellers || []).filter(s => s.seller_email?.toLowerCase() !== email.toLowerCase())

      const l1Emails = [...new Set(teamSellers.map(s => s.l1_email).filter(Boolean))]
      const { data: l1Stats } = await supabase
        .from('srs_raw')
        .select('seller_email, seller_name, goal_achieved_percent, actual_achieved_monthly, bottomline_goal_monthly')
        .in('seller_email', l1Emails)

      const l1Groups: any = {}
      teamSellers.forEach(s => {
        const l1 = s.l1_name || s.l1_email || 'Unknown'
        if (!l1Groups[l1]) {
          const l1Own = l1Stats?.find(ls => ls.seller_email === s.l1_email)
          l1Groups[l1] = {
            l1_name: l1, l1_email: s.l1_email,
            l1_performance: l1Own ? { pct: l1Own.goal_achieved_percent || 0, achieved: l1Own.actual_achieved_monthly || 0, goal: l1Own.bottomline_goal_monthly || 0 } : null,
            sellers: []
          }
        }
        l1Groups[l1].sellers.push(s)
      })

      return NextResponse.json({ type: 'L2', team: teamSellers, l1Groups: Object.values(l1Groups), totalSellers: teamSellers.length })
    }

    if (role === 'L1') {
      const { data: sellers } = await supabase
        .from('srs_raw')
        .select('*')
        .eq('l1_email', email.toLowerCase().trim())
        .order('goal_achieved_percent', { ascending: false })

      const teamSellers = (sellers || []).filter(s => s.seller_email?.toLowerCase() !== email.toLowerCase())

      return NextResponse.json({ type: 'L1', team: teamSellers, totalSellers: teamSellers.length })
    }

    return NextResponse.json({ error: 'Only L1/L2 managers can view team' }, { status: 403 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}