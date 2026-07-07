import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const trimmedEmail = cleanEmail(email)

    // 🔥 Fetch user's rewards data
    const { data: rewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('seller_email', trimmedEmail)
      .single()

    if (rewardsError && rewardsError.code !== 'PGRST116') {
      console.error('Rewards fetch error:', rewardsError)
      return NextResponse.json({ error: rewardsError.message }, { status: 500 })
    }

    // 🔥 Fetch user's spin history
    const { data: spinHistory, error: historyError } = await supabase
      .from('spin_results')
      .select('*')
      .eq('email', trimmedEmail)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Spin history fetch error:', historyError)
    }

    // 🔥 Calculate milestones based on goal completion
    // These are the timeline rewards shown in the UI
    const milestones = [
      { by: 5, label: 'By 5th', reward: '2 Comp-Offs + 2 WFH + 2 Premium Spins' },
      { by: 10, label: 'By 10th', reward: '2 Comp-Offs + 1 WFH + 1 Premium Spin' },
      { by: 15, label: 'By 15th', reward: '1 Comp-Off + 1 WFH + 1 Standard Spin' },
      { by: 20, label: 'By 20th', reward: '1 WFH + 1 Standard Spin' }
    ]

    // Determine which milestones were achieved
    // Fetch goal_achieved_date from srs_raw (the actual date the goal was completed)
    let completionDay = 0
    if (rewards?.goal_done) {
      const { data: sellerRow } = await supabase
        .from('srs_raw')
        .select('goal_achieved_date')
        .eq('seller_email', trimmedEmail)
        .single()
      if (sellerRow?.goal_achieved_date) {
        const raw = String(sellerRow.goal_achieved_date).trim()
        // goal_achieved_date can be:
        // 1. Excel serial number (e.g., "46198")
        // 2. DD/MM/YYYY (e.g., "19/06/2026")
        // 3. Standard date string (e.g., "2026-06-19")
        const num = Number(raw)
        let parsedDate: Date
        if (!isNaN(num) && num > 40000 && num < 60000) {
          // Excel serial date
          parsedDate = new Date((num - 25569) * 86400000)
        } else if (raw.includes('/')) {
          // DD/MM/YYYY format
          const parts = raw.split('/')
          parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        } else {
          parsedDate = new Date(raw)
        }
        if (!isNaN(parsedDate.getTime())) {
          completionDay = parsedDate.getUTCDate()
        }
      }
    }
    const achieved = {
      by: completionDay
    }

    // 🔥 Return the response
    return NextResponse.json({
      premiumAvailable: rewards?.premium_available || 0,
      standardAvailable: rewards?.standard_available || 0,
      maxPremium: rewards?.max_premium || 0,
      maxStandard: rewards?.max_standard || 0,
      isPremium: rewards?.is_premium || false,
      goalDone: rewards?.goal_done || false,
      pct: rewards?.pct || 0,
      completionDay: completionDay,
      milestones: milestones,
      achieved: achieved,
      spinHistory: spinHistory || []
    })

  } catch (error: any) {
    console.error('Rewards API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}