import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PREMIUM_PRIZES = ['WFH Tomorrow', '₹1000 Amazon Voucher', '1 Full Day Off', '2 Extra Regularisation', '2 WFH Anyday', '2x Movie Tickets', 'Spin Again', 'Lunch with Manager']
const STANDARD_PRIZES = ['WFH Tomorrow', '₹500 Amazon Voucher', '1 Full Day Off', '1 Regularisation', '2x Movie Tickets', '₹1000 Amazon Voucher', 'Better Luck Next Time', 'Upgrade to Premium Spin']

export async function POST(req: Request) {
  try {
    const { email, spinType } = await req.json()
    if (!email || !spinType) return NextResponse.json({ error: 'Email and spin type required' }, { status: 400 })

    const { data: srsData } = await supabase
      .from('srs_raw').select('goal_achieved_percent')
      .eq('seller_email', email.toLowerCase().trim()).single()

    if (!srsData || (srsData.goal_achieved_percent || 0) < 100) {
      return NextResponse.json({ success: false, message: 'Complete your monthly goal first!' })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count } = await supabase
      .from('spin_results').select('*', { count: 'exact', head: true })
      .eq('email', email.toLowerCase().trim()).eq('spin_type', spinType).gte('created_at', monthStart)

    const maxSpins = spinType === 'PREMIUM' ? 2 : 1
    if ((count || 0) >= maxSpins) {
      return NextResponse.json({ success: false, message: `No ${spinType} spins remaining` })
    }

    const prizes = spinType === 'PREMIUM' ? PREMIUM_PRIZES : STANDARD_PRIZES
    const result = prizes[Math.floor(Math.random() * prizes.length)]

    await supabase.from('spin_results').insert({
      email: email.toLowerCase().trim(), spin_type: spinType, result,
      date: now.toISOString().split('T')[0], month: now.getMonth().toString()
    })

    await supabase.from('audit_log').insert({
  email: email.toLowerCase().trim(),
  action: 'SPIN_WHEEL',
  detail: `Type: ${spinType} | Result: ${result}`,
  created_at: new Date().toISOString()
})

return NextResponse.json({ success: true, result, spinType })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message })
  }
}