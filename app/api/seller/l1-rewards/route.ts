import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()

  const { data: sellers, error: sellersError } = await supabase
    .from('srs_raw')
    .select('seller_email, seller_name, goal_achieved_percent, goal_achieved_date')
    .eq('l1_email', trimmedEmail)

  if (sellersError) {
    return NextResponse.json({ error: sellersError.message }, { status: 500 })
  }

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({
      summary: { totalSellers: 0, premiumEligible: 0, standardEligible: 0, bothEligible: 0 },
      premium: { eligible: [], notEligible: [] },
      standard: { eligible: [], notEligible: [] },
      both: { eligible: [], notEligible: [] }
    })
  }

  const sellerEmails = sellers
    .filter((s: any) => s.seller_email.toLowerCase() !== trimmedEmail)
    .map((s: any) => s.seller_email)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: spinResults } = await supabase
    .from('spin_results')
    .select('*')
    .in('email', sellerEmails)
    .gte('created_at', monthStart)
    .order('created_at', { ascending: false })

  const premiumEligible: any[] = []
  const premiumNotEligible: any[] = []
  const standardEligible: any[] = []
  const standardNotEligible: any[] = []
  const bothEligible: any[] = []
  const bothNotEligible: any[] = []

  sellers
    .filter((s: any) => s.seller_email.toLowerCase() !== trimmedEmail)
    .forEach((s: any) => {
      const pct = s.goal_achieved_percent || 0
      const goalDone = pct >= 100 || !!s.goal_achieved_date
      const sellerSpins = (spinResults || []).filter(
        (r: any) => r.email?.toLowerCase() === s.seller_email.toLowerCase()
      )

      const premiumUsed = sellerSpins.filter((r: any) => r.spin_type === 'PREMIUM').length
      const standardUsed = sellerSpins.filter((r: any) => r.spin_type === 'STANDARD').length

      // Determine milestone
      let milestone: any = null
      if (goalDone) {
        let day = now.getDate()
        if (s.goal_achieved_date) {
          const raw = String(s.goal_achieved_date).trim()
          const num = Number(raw)
          if (!isNaN(num) && num > 40000 && num < 60000) {
            day = new Date((num - 25569) * 86400000).getUTCDate()
          } else if (raw.includes('/')) {
            const parts = raw.split('/')
            const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
            if (!isNaN(d.getTime())) day = d.getUTCDate()
          } else {
            const d = new Date(raw)
            if (!isNaN(d.getTime())) day = d.getUTCDate()
          }
        }
        if (day <= 5) milestone = { label: 'By 5th', premium: 2, standard: 0 }
        else if (day <= 10) milestone = { label: 'By 10th', premium: 1, standard: 0 }
        else if (day <= 15) milestone = { label: 'By 15th', premium: 0, standard: 1 }
        else if (day <= 20) milestone = { label: 'By 20th', premium: 0, standard: 1 }
      }

      const maxPremium = milestone?.premium || 0
      const maxStandard = milestone?.standard || 0
      const premiumAvail = goalDone ? Math.max(0, maxPremium - premiumUsed) : 0
      const standardAvail = goalDone ? Math.max(0, maxStandard - standardUsed) : 0
      const canPremium = premiumAvail > 0
      const canStandard = standardAvail > 0
      const canBoth = canPremium && canStandard

      const baseData = {
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        pct,
        goalDone,
        milestone: milestone?.label || null,
        premium_used: premiumUsed,
        standard_used: standardUsed,
        premium_available: premiumAvail,
        standard_available: standardAvail,
        max_premium: maxPremium,
        max_standard: maxStandard,
        gap_to_goal: Math.max(0, 100 - pct),
        spins: sellerSpins.map((r: any) => ({
          type: r.spin_type,
          result: r.result,
          date: r.created_at
        }))
      }

      // Premium eligibility
      if (canPremium) premiumEligible.push(baseData)
      else premiumNotEligible.push({ ...baseData, gap_to_premium: maxPremium > 0 ? 0 : 100 - pct })

      // Standard eligibility
      if (canStandard) standardEligible.push(baseData)
      else standardNotEligible.push({ ...baseData, gap_to_standard: maxStandard > 0 ? 0 : 100 - pct })

      // Both eligibility
      if (canBoth) bothEligible.push(baseData)
      else bothNotEligible.push({ ...baseData, gap_to_both: canPremium ? Math.max(0, maxStandard - standardUsed) : canStandard ? Math.max(0, maxPremium - premiumUsed) : 100 - pct })
    })

  return NextResponse.json({
    summary: {
      totalSellers: premiumEligible.length + premiumNotEligible.length,
      premiumEligible: premiumEligible.length,
      standardEligible: standardEligible.length,
      bothEligible: bothEligible.length,
    },
    premium: { eligible: premiumEligible, notEligible: premiumNotEligible },
    standard: { eligible: standardEligible, notEligible: standardNotEligible },
    both: { eligible: bothEligible, notEligible: bothNotEligible }
  })
}