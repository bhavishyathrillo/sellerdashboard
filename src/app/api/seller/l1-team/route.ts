import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()

  // Step 1: Get all sellers under this L1 manager
    const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', trimmedEmail).limit(1).maybeSingle()
  const _myName = _me?.l1_name || ''

  let _query = supabase.from('srs_raw').select('*')
  if (_myName) {
    _query = _query.eq('l1_name', _myName)
  } else {
    _query = _query.eq('l1_email', trimmedEmail)
  }
  const { data: allSellers, error: sellersError } = await _query

  if (sellersError) {
    return NextResponse.json({ error: sellersError.message }, { status: 500 })
  }

  if (!allSellers || allSellers.length === 0) {
    return NextResponse.json({
      l1_name: email.split('@')[0],
      totalSellers: 0,
      l2Groups: [],
      teamTotals: { goal: 0, achieved: 0, shb: 0, requiredDaily: 0, pct: 0, sellers: 0 }
    })
  }

  // Get L1 name
  const l1Name = allSellers[0]?.l1_name || email.split('@')[0]

  // Get L1's own row (if exists)
  const l1OwnRow = allSellers.find(
    (s: any) => s.seller_email?.toLowerCase() === trimmedEmail
  )

  // Sellers where L2 email = L1 email (directly under L1)
  const sellersUnderL1 = allSellers.filter(
    (s: any) => s.l2_email?.toLowerCase() === trimmedEmail &&
               s.seller_email?.toLowerCase() !== trimmedEmail
  )

  // Other sellers (under different L2s)
  const otherSellers = allSellers.filter(
    (s: any) => s.seller_email?.toLowerCase() !== trimmedEmail &&
               s.l2_email?.toLowerCase() !== trimmedEmail
  )

  // Get unique L2 emails from OTHER sellers only
  const l2Emails = [...new Set(
    otherSellers.map((s: any) => s.l2_email).filter(Boolean)
  )]

  // Get L2 managers' personal data from srs_raw
  const { data: l2PersonalData } = await supabase
    .from('srs_raw')
    .select('*')
    .in('seller_email', l2Emails)

  const l2Map: Record<string, any> = {}
  if (l2PersonalData) {
    l2PersonalData.forEach((l2: any) => {
      l2Map[l2.seller_email?.toLowerCase()] = l2
    })
  }

  // Build L2 groups
  const l2Groups = l2Emails.map((l2Email: string) => {
    const l2Key = l2Email.toLowerCase()
    const l2Data = l2Map[l2Key] || {}

    const sellersUnderL2 = otherSellers.filter(
      (s: any) => s.l2_email?.toLowerCase() === l2Key &&
                 s.seller_email?.toLowerCase() !== l2Key
    )

    // Get L2 name from multiple sources
    const l2Name = l2Data.seller_name || 
                   sellersUnderL2[0]?.l2_name || 
                   l2Email.split('@')[0]

    // L2 personal KPIs
    const l2Goal = l2Data.bottomline_goal_monthly || 0
    const l2Ach = l2Data.actual_achieved_monthly || 0
    const l2Shb = l2Data.should_have_been_monthly || 0
    const l2Pct = l2Goal > 0 ? (l2Ach / l2Goal) * 100 : 0

    // Seller totals under this L2
    const sellerGoal = sellersUnderL2.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
    const sellerAch = sellersUnderL2.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
    const sellerShb = sellersUnderL2.reduce((s: number, r: any) => s + (r.should_have_been_monthly || 0), 0)
    const sellerPct = sellerGoal > 0 ? (sellerAch / sellerGoal) * 100 : 0

    return {
      l2_name: l2Name,
      l2_email: l2Email,
      l2_kpi: {
        goal: l2Goal,
        achieved: l2Ach,
        shb: l2Shb,
        pct: l2Pct,
        required_daily: l2Data.required_daily_monthly || 0,
        flag: l2Data.current_seller_flag || '',
        region: l2Data.region || sellersUnderL2[0]?.region || '',
        haul: l2Data.haul || sellersUnderL2[0]?.haul || '',
      },
      seller_count: sellersUnderL2.length,
      seller_totals: {
        goal: sellerGoal,
        achieved: sellerAch,
        shb: sellerShb,
        pct: sellerPct,
      },
      sellers: sellersUnderL2.map((s: any) => ({
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        goal: s.bottomline_goal_monthly || 0,
        achieved: s.actual_achieved_monthly || 0,
        shb: s.should_have_been_monthly || 0,
        pct: s.goal_achieved_percent || 0,
        flag: s.current_seller_flag || '',
        region: s.region || '',
        haul: s.haul || '',
        defined_goal: s.defined_goal || '',
      }))
    }
  })

  // ADD L1's own group (with sellers directly under them)
  if (sellersUnderL1.length > 0) {
    const l1Goal = l1OwnRow?.bottomline_goal_monthly || 0
    const l1Ach = l1OwnRow?.actual_achieved_monthly || 0
    const l1Shb = l1OwnRow?.should_have_been_monthly || 0
    const l1Pct = l1Goal > 0 ? (l1Ach / l1Goal) * 100 : 0

    const sg = sellersUnderL1.reduce((s: number, r: any) => s + (r.bottomline_goal_monthly || 0), 0)
    const sa = sellersUnderL1.reduce((s: number, r: any) => s + (r.actual_achieved_monthly || 0), 0)
    const ss = sellersUnderL1.reduce((s: number, r: any) => s + (r.should_have_been_monthly || 0), 0)
    const sp = sg > 0 ? (sa / sg) * 100 : 0

    l2Groups.push({
      l2_name: l1Name,
      l2_email: trimmedEmail,
      l2_kpi: {
        goal: l1Goal,
        achieved: l1Ach,
        shb: l1Shb,
        pct: l1Pct,
        required_daily: l1OwnRow?.required_daily_monthly || 0,
        flag: l1OwnRow?.current_seller_flag || '',
        region: l1OwnRow?.region || sellersUnderL1[0]?.region || '',
        haul: l1OwnRow?.haul || sellersUnderL1[0]?.haul || '',
      },
      seller_count: sellersUnderL1.length,
      seller_totals: { goal: sg, achieved: sa, shb: ss, pct: sp },
      sellers: sellersUnderL1.map((s: any) => ({
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        goal: s.bottomline_goal_monthly || 0,
        achieved: s.actual_achieved_monthly || 0,
        shb: s.should_have_been_monthly || 0,
        pct: s.goal_achieved_percent || 0,
        flag: s.current_seller_flag || '',
        region: s.region || '',
        haul: s.haul || '',
        defined_goal: s.defined_goal || '',
      }))
    })
  }

  // Calculate overall team totals
  const totalGoal = l2Groups.reduce((s: number, g: any) => s + g.l2_kpi.goal + g.seller_totals.goal, 0)
  const totalAch = l2Groups.reduce((s: number, g: any) => s + g.l2_kpi.achieved + g.seller_totals.achieved, 0)
  const totalShb = l2Groups.reduce((s: number, g: any) => s + g.l2_kpi.shb + g.seller_totals.shb, 0)
  const totalPct = totalGoal > 0 ? (totalAch / totalGoal) * 100 : 0
  const totalSellers = l2Groups.reduce((s: number, g: any) => s + g.seller_count, 0)

  return NextResponse.json({
    l1_name: l1Name,
    totalSellers,
    l2Groups,
    teamTotals: {
      goal: totalGoal,
      achieved: totalAch,
      shb: totalShb,
      requiredDaily: 0,
      pct: totalPct,
      sellers: totalSellers,
    }
  })
}