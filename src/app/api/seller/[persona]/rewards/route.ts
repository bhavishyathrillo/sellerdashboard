import { NextResponse } from 'next/server'
import { cleanEmail } from '@/lib/hygiene-utils'

import { supabase } from '@/lib/supabase'

export async function handleSeller(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const trimmedEmail = cleanEmail(email)

    // 🔥 Parallel fetch rewards, spin history, and srs_raw
    const [
      { data: rewards, error: rewardsError },
      { data: spinHistory, error: historyError },
      { data: sellerRow }
    ] = await Promise.all([
      supabase.from('rewards').select('*').eq('seller_email', trimmedEmail).single(),
      supabase.from('spin_results').select('*').eq('email', trimmedEmail).order('created_at', { ascending: false }).limit(10),
      supabase.from('srs_raw').select('goal_achieved_date').eq('seller_email', trimmedEmail).single()
    ])

    if (rewardsError && rewardsError.code !== 'PGRST116') {
      console.error('Rewards fetch error:', rewardsError)
      return NextResponse.json({ error: rewardsError.message }, { status: 500 })
    }

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
    let completionDay = 0
    if (rewards?.goal_done) {
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

    // 🔥 Sync earned spins with database if they haven't been granted yet
    let dbMaxPremium = rewards?.max_premium || 0;
    let dbMaxStandard = rewards?.max_standard || 0;
    let earnedPremium = 0;
    let earnedStandard = 0;

    if (completionDay > 0) {
      if (completionDay <= 5) { earnedPremium = 2; }
      else if (completionDay <= 10) { earnedPremium = 1; }
      else if (completionDay <= 15) { earnedStandard = 1; }
      else if (completionDay <= 20) { earnedStandard = 1; }
    }

    let needsUpdate = false;
    let newPremiumAvailable = rewards?.premium_available || 0;
    let newStandardAvailable = rewards?.standard_available || 0;

    if (earnedPremium > dbMaxPremium) {
      newPremiumAvailable += (earnedPremium - dbMaxPremium);
      dbMaxPremium = earnedPremium;
      needsUpdate = true;
    }
    if (earnedStandard > dbMaxStandard) {
      newStandardAvailable += (earnedStandard - dbMaxStandard);
      dbMaxStandard = earnedStandard;
      needsUpdate = true;
    }

    if (needsUpdate) {
      if (rewards?.id) {
        await supabase.from('rewards').update({
          max_premium: dbMaxPremium,
          premium_available: newPremiumAvailable,
          max_standard: dbMaxStandard,
          standard_available: newStandardAvailable
        }).eq('id', rewards.id);
      } else {
        await supabase.from('rewards').insert({
          seller_email: trimmedEmail,
          max_premium: dbMaxPremium,
          premium_available: newPremiumAvailable,
          max_standard: dbMaxStandard,
          standard_available: newStandardAvailable,
          is_premium: dbMaxPremium > 0,
          goal_done: true,
          pct: 100 // they reached milestone
        });
      }
    }

    // 🔥 Return the response
    return NextResponse.json({
      premiumAvailable: newPremiumAvailable,
      standardAvailable: newStandardAvailable,
      maxPremium: dbMaxPremium,
      maxStandard: dbMaxStandard,
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

export async function handleTl(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const trimmedEmail = email.toLowerCase().trim()

    const { data: _me } = await supabase.from('srs_raw').select('l1_name').eq('l1_email', trimmedEmail).limit(1).maybeSingle()
  const _myName = _me?.l1_name || ''

  let _query = supabase.from('srs_raw').select('seller_email, seller_name, goal_achieved_percent, goal_achieved_date')
  if (_myName) {
    _query = _query.eq('l1_name', _myName)
  } else {
    _query = _query.eq('l1_email', trimmedEmail)
  }
  const { data: sellers, error: sellersError } = await _query

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

export async function GET(req: Request, { params }: { params: Promise<{ persona: string }> }) {
  const p = (await params).persona.toLowerCase();
  if (p === 'seller') return handleSeller(req);
  if (p === 'tl') return handleTl(req);
  return NextResponse.json({ error: 'Rewards not available for this persona' }, { status: 400 });
}
