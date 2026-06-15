import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  try {
    const { data: srsData } = await supabase
      .from('srs_raw')
      .select('goal_achieved_percent, goal_achieved_date')
      .eq('seller_email', email.toLowerCase().trim())
      .single()

    if (!srsData) return NextResponse.json({ error: 'Seller not found' }, { status: 404 })

    const { data: spins } = await supabase
      .from('spin_results')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(50)

    const pct = srsData.goal_achieved_percent || 0
    const goalDone = pct >= 100 || !!srsData.goal_achieved_date
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const premiumUsed = spins?.filter(s => s.spin_type === 'PREMIUM' && s.created_at >= monthStart).length || 0
    const standardUsed = spins?.filter(s => s.spin_type === 'STANDARD' && s.created_at >= monthStart).length || 0

    const milestones = [
      { by: 5, label: 'By 5th', reward: '2 Comp-Offs + 2 WFH + 2 Premium Spins', premiumSpins: 2, standardSpins: 0 },
      { by: 10, label: 'By 10th', reward: '2 Comp-Offs + 1 WFH + 1 Premium Spin', premiumSpins: 1, standardSpins: 0 },
      { by: 15, label: 'By 15th', reward: '1 Comp-Off + 1 WFH + 1 Standard Spin', premiumSpins: 0, standardSpins: 1 },
      { by: 20, label: 'By 20th', reward: '1 WFH + 1 Standard Spin', premiumSpins: 0, standardSpins: 1 },
    ]

    let achieved = null
    if (goalDone) {
      const day = srsData.goal_achieved_date ? new Date(srsData.goal_achieved_date).getDate() : now.getDate()
      for (const m of milestones) { if (day <= m.by) { achieved = m; break } }
    }

    return NextResponse.json({
      pct, goalDone, achieved, premiumUsed, standardUsed,
      premiumAvailable: achieved ? achieved.premiumSpins - premiumUsed : 0,
      standardAvailable: achieved ? achieved.standardSpins - standardUsed : 0,
      spinHistory: spins || [], milestones
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}